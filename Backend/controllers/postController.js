const Post = require('../models/Post');
const Category = require('../models/Category');
const Comment = require('../models/Comment');
const Vote = require('../models/Vote');
const SavedItem = require('../models/SavedItem');
const Subscription = require('../models/Subscription');
const Notification = require('../models/Notification');
const { buildMediaArray, buildContentBlocks, removeMediaFiles, parseIdsList, MAX_FILES, getMediaType } = require('../middleware/mediaUpload');
const { extractMentionedNicknames, findMentionedUsers } = require('../utils/mentions');
const { emitToUser, emitToCategory } = require('../utils/socket');

// helper: applies sort order for a mongoose query based on ?sort=
// new = createdAt desc, top = karma desc, controversial = karma asc (most-downvoted first)
// hot = comment count desc, computed via aggregation so sorting/pagination don't require overfetching
const SORTS = {
    new: { createdAt: -1 },
    top: { karma: -1, createdAt: -1 },
    controversial: { karma: 1, createdAt: -1 }
};

// runs a comment-count-sorted, paginated aggregation for a given base filter; returns { posts, total }
const fetchHotSorted = async (matchFilter, { skip, limit, userId }) => {
    const total = await Post.countDocuments(matchFilter);
    const pipeline = [
        { $match: matchFilter },
        {
            $lookup: {
                from: 'comments',
                let: { postId: '$_id' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ['$post', '$$postId'] }, { $eq: ['$isDeleted', false] }] } } },
                    { $count: 'count' }
                ],
                as: '_commentAgg'
            }
        },
        { $addFields: { _commentCount: { $ifNull: [{ $first: '$_commentAgg.count' }, 0] } } },
        { $sort: { _commentCount: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: { _commentAgg: 0, _commentCount: 0 } }
    ];
    const docs = await Post.aggregate(pipeline);
    const populated = await populatePosts(docs);
    const enriched = await enrichPosts(populated, userId);
    return { posts: enriched, total };
};

// enrich a list of lean posts with commentCount, myVote, isSaved
const enrichPosts = async (posts, userId) => {
    if (posts.length === 0) return posts;
    const postIds = posts.map((p) => p._id);

    const commentCounts = await Comment.aggregate([
        { $match: { post: { $in: postIds }, isDeleted: false } },
        { $group: { _id: '$post', count: { $sum: 1 } } }
    ]);
    const countMap = new Map(commentCounts.map((c) => [c._id.toString(), c.count]));

    let voteMap = new Map();
    let savedSet = new Set();
    if (userId) {
        const votes = await Vote.find({ author: userId, target: { $in: postIds }, targetType: 'Post' }).lean();
        voteMap = new Map(votes.map((v) => [v.target.toString(), v.value]));

        const saved = await SavedItem.find({ user: userId, target: { $in: postIds }, targetType: 'Post' }).lean();
        savedSet = new Set(saved.map((s) => s.target.toString()));
    }

    return posts.map((p) => ({
        ...p,
        commentCount: countMap.get(p._id.toString()) || 0,
        myVote: voteMap.get(p._id.toString()) || null,
        isSaved: savedSet.has(p._id.toString())
    }));
};

// populates author/category on an already-fetched lean list (aggregation doesn't auto-populate)
const populatePosts = async (posts) => {
    const User = require('../models/User');
    if (posts.length === 0) return posts;
    const authorIds = [...new Set(posts.map((p) => p.author.toString()))];
    const categoryIds = [...new Set(posts.map((p) => p.category.toString()))];
    const [authors, categories] = await Promise.all([
        User.find({ _id: { $in: authorIds } }).select('nickname avatar').lean(),
        Category.find({ _id: { $in: categoryIds } }).select('name icon').lean()
    ]);
    const authorMap = new Map(authors.map((a) => [a._id.toString(), a]));
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));
    return posts.map((p) => ({
        ...p,
        author: authorMap.get(p.author.toString()) || p.author,
        category: categoryMap.get(p.category.toString()) || p.category
    }));
};


// CREATE - создать пост
// поддерживает 3 режима (для обратной совместимости):
//   1) старый: title + description + media[] (файли без прив'язки до блоків)
//   2) новий: title + contentSpec (JSON-опис впорядкованих блоків) + ті самі файли в req.files по черзі
//   3) репост: repostOf (id оригінального поста) — title/content/description/media копіюються з оригіналу на сервері,
//      клієнт лише обирає цільову спільноту (contentSpec/media з реквесту ігноруються)
exports.createPost = async (req, res) => {
    try {
        const { title, description, category, contentSpec, repostOf } = req.body;
        const author = req.user.id;

        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            return res.status(404).json({ message: 'Категория не найдена' });
        }

        if (categoryExists.bannedUsers?.some((id) => id.toString() === author)) {
            return res.status(403).json({ message: 'Вас забанено в цій спільноті' });
        }

        const moderationStatus = categoryExists.requiresApproval ? 'pending' : 'approved';

        let content = [];
        let media = [];
        let finalDescription = description || '';
        let finalTitle = title;
        let repostOfId = null;

        if (repostOf) {
            const original = await Post.findById(repostOf).lean();
            if (!original) {
                return res.status(404).json({ message: 'Оригінальний пост не знайдено' });
            }
            finalTitle = title || original.title;
            content = original.content || [];
            media = original.media || [];
            finalDescription = original.description || '';
            repostOfId = original._id;
        } else if (contentSpec) {
            content = buildContentBlocks(contentSpec, req.files);
            media = content.filter((b) => b.type !== 'text'); // зберігаємо і в media для сумісності зі старими картками
            const firstText = content.find((b) => b.type === 'text' && b.text?.trim());
            finalDescription = firstText ? firstText.text : '';
        } else {
            media = buildMediaArray(req.files);
        }

        const post = new Post({
            title: finalTitle,
            description: finalDescription,
            content,
            category,
            author,
            media,
            moderationStatus,
            repostOf: repostOfId
        });
        await post.save();

        // уведомляем упомянутых юзеров (u/nickname или @nickname) в заголовке/описании поста
        const textForMentions = `${finalTitle} ${finalDescription}`;
        const mentionedNicknames = extractMentionedNicknames(textForMentions);
        if (mentionedNicknames.length > 0) {
            const mentionedUsers = await findMentionedUsers(mentionedNicknames);
            const mentionTargets = mentionedUsers
                .map((u) => u._id.toString())
                .filter((userId) => userId !== author);

            if (mentionTargets.length > 0) {
                await Notification.insertMany(
                    mentionTargets.map((userId) => ({
                        recipient: userId,
                        type: 'mention',
                        message: 'Вас згадали у пості',
                        fromUser: author,
                        post: post._id
                    }))
                );
                mentionTargets.forEach((userId) => emitToUser(userId, 'notification:new', { type: 'mention' }));
            }
        }

        if (moderationStatus === 'approved') {
            emitToCategory(category, 'post:new', { postId: post._id.toString() });
        }

        const populated = await Post.findById(post._id)
            .populate('author', 'nickname avatar')
            .populate('category', 'name icon')
            .populate('repostOf', 'title category')
            .lean();

        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// CREATE (draft support) - завантажує файли для чернетки без створення Post.
// Повертає ті самі об'єкти { url, type, mimeType, size, originalName }, що йдуть у content-блоки поста,
// щоб клієнт міг зберегти їх у localStorage (чернетка) і пізніше домалювати contentSpec при публікації.
exports.uploadDraftMedia = async (req, res) => {
    try {
        const files = req.files || [];
        if (files.length === 0) {
            return res.status(400).json({ message: 'Файли не завантажено' });
        }
        const media = files.map((file) => ({
            url: `media/${file.filename}`,
            type: getMediaType(file.mimetype),
            mimeType: file.mimetype,
            size: file.size,
            originalName: file.originalname
        }));
        res.status(201).json({ media });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// helper: parses ?tags=news,tech into a lowercased, deduped array
const parseTagsParam = (raw) => {
    if (!raw) return [];
    return [...new Set(String(raw).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))];
};

// READ - получить все посты (с пагинацией, feed, sort)
// query: page, limit, feed = home|popular|all|news, sort = hot|new|top|controversial, tags = csv список тегів спільнот
exports.getAllPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const feed = req.query.feed || 'popular';
        const sort = req.query.sort || 'hot';
        const userId = req.user?.id;
        const requestedTags = parseTagsParam(req.query.tags);

        let categoryFilter = {};
        let message = '';

        if (feed === 'home') {
            if (!userId) {
                return res.status(200).json({ posts: [], message: 'Увійдіть, щоб бачити персональну стрічку', currentPage: page, totalPages: 0, totalPosts: 0 });
            }
            const subs = await Subscription.find({ user: userId }).select('category').lean();
            const categoryIds = subs.map((s) => s.category);
            if (categoryIds.length === 0) {
                return res.status(200).json({ posts: [], message: 'Підпишіться на спільноти, щоб бачити тут пости', currentPage: page, totalPages: 0, totalPosts: 0 });
            }
            categoryFilter = { category: { $in: categoryIds } };
        } else if (feed === 'news') {
            const newsCategories = await Category.find({ tags: 'news' }).select('_id').lean();
            const categoryIds = newsCategories.map((c) => c._id);
            if (categoryIds.length === 0) {
                return res.status(200).json({ posts: [], message: 'Немає спільнот з тегом news', currentPage: page, totalPages: 0, totalPosts: 0 });
            }
            categoryFilter = { category: { $in: categoryIds } };
        }
        // 'popular' and 'all' both search everything for now (no separate popularity tiering)

        // ?tags=news,tech filters posts down to communities carrying ANY of the requested tags,
        // intersected with whatever the feed mode already selected
        if (requestedTags.length > 0) {
            const taggedCategories = await Category.find({ tags: { $in: requestedTags } }).select('_id').lean();
            const taggedIds = new Set(taggedCategories.map((c) => c._id.toString()));
            if (categoryFilter.category?.$in) {
                categoryFilter.category.$in = categoryFilter.category.$in.filter((id) => taggedIds.has(id.toString()));
            } else {
                categoryFilter.category = { $in: [...taggedIds] };
            }
            if (categoryFilter.category.$in.length === 0) {
                return res.status(200).json({ posts: [], message: 'Немає спільнот з цими тегами', currentPage: page, totalPages: 0, totalPosts: 0 });
            }
        }

        // тільки схвалені пости показуємо у стрічках
        categoryFilter.moderationStatus = 'approved';

        let posts;
        let total;
        if (sort === 'hot') {
            const result = await fetchHotSorted(categoryFilter, { skip, limit, userId });
            posts = result.posts;
            total = result.total;
        } else {
            total = await Post.countDocuments(categoryFilter);
            const pageDocs = await Post.find(categoryFilter)
                .populate('author', 'nickname avatar')
                .populate('category', 'name icon')
                .sort(SORTS[sort] || SORTS.new)
                .skip(skip)
                .limit(limit)
                .lean();
            posts = await enrichPosts(pageDocs, userId);
        }

        res.status(200).json({
            posts,
            message,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalPosts: total
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// READ - получить посты одной категории (з пагінацією)
exports.getPostsByCategory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;
        const sort = req.query.sort || 'new';
        const userId = req.user?.id;

        const filter = { category: req.params.categoryId, moderationStatus: 'approved' };

        let posts;
        let total;
        if (sort === 'hot') {
            const result = await fetchHotSorted(filter, { skip, limit, userId });
            posts = result.posts;
            total = result.total;
        } else {
            total = await Post.countDocuments(filter);
            const pageDocs = await Post.find(filter)
                .populate('author', 'nickname avatar')
                .populate('category', 'name icon')
                .sort(SORTS[sort] || SORTS.new)
                .skip(skip)
                .limit(limit)
                .lean();
            posts = await enrichPosts(pageDocs, userId);
        }

        res.status(200).json({
            posts,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalPosts: total
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// READ - получить посты одного пользователя (з пагінацією)
exports.getPostsByAuthor = async (req, res) => {
    try {
        const User = require('../models/User');
        const user = await User.findOne({ nickname: req.params.nickname }).select('_id').lean();
        if (!user) {
            return res.status(404).json({ message: 'Користувача не знайдено' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;
        const sort = req.query.sort || 'new';
        const userId = req.user?.id;

        const filter = { author: user._id, moderationStatus: 'approved' };

        let posts;
        let total;
        if (sort === 'hot') {
            const result = await fetchHotSorted(filter, { skip, limit, userId });
            posts = result.posts;
            total = result.total;
        } else {
            total = await Post.countDocuments(filter);
            const pageDocs = await Post.find(filter)
                .populate('author', 'nickname avatar')
                .populate('category', 'name icon')
                .sort(SORTS[sort] || SORTS.new)
                .skip(skip)
                .limit(limit)
                .lean();
            posts = await enrichPosts(pageDocs, userId);
        }

        res.status(200).json({
            posts,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalPosts: total
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// READ - получить один пост по ID
exports.getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'nickname avatar')
            .populate('category', 'name icon')
            .lean();

        if (!post) {
            return res.status(404).json({ message: 'Пост не найден' });
        }

        const [enriched] = await enrichPosts([post], req.user?.id);
        res.status(200).json(enriched);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// UPDATE - обновить пост
exports.updatePost = async (req, res) => {
    try {
        const { title, description, category, removeMediaIds, contentSpec } = req.body;

        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Пост не найден' });
        }

        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Нет прав на редактирование этого поста' });
        }

        post.title = title || post.title;
        post.category = category || post.category;

        if (contentSpec) {
            // новий редактор блоків: contentSpec повністю замінює контент поста.
            // Файли для блоків, що лишаються незмінними, фронтенд НЕ пересилає повторно —
            // такі блоки позначені в specе через existingUrl замість файлу.
            let spec;
            try {
                spec = JSON.parse(contentSpec);
            } catch {
                spec = [];
            }

            let fileIdx = 0;
            const files = req.files || [];
            const newContent = spec.map((block) => {
                if (block.type === 'text') {
                    return { type: 'text', text: String(block.text || '').slice(0, 40000) };
                }
                if (block.existingUrl) {
                    // блок лишається як є — переносимо існуючі метадані з поточного поста, якщо знайдені
                    const existing = post.content.find((c) => c.url === block.existingUrl);
                    return existing ? existing.toObject() : null;
                }
                const file = files[fileIdx];
                fileIdx += 1;
                if (!file) return null;
                const { getMediaType } = require('../middleware/mediaUpload');
                const mediaType = getMediaType(file.mimetype);
                const resolvedType = block.type === 'file' ? 'file' : (mediaType === 'gif' ? 'image' : mediaType);
                return {
                    type: ['image', 'video', 'file'].includes(resolvedType) ? resolvedType : 'file',
                    url: `media/${file.filename}`,
                    mimeType: file.mimetype,
                    size: file.size,
                    originalName: file.originalname
                };
            }).filter(Boolean);

            // видаляємо з диска файли блоків, яких більше немає в новому контенті
            const keptUrls = new Set(newContent.filter((b) => b.url).map((b) => b.url));
            const removedBlocks = post.content.filter((b) => b.url && !keptUrls.has(b.url));
            removeMediaFiles(removedBlocks);

            post.content = newContent;
            post.media = newContent.filter((b) => b.type !== 'text');
            const firstText = newContent.find((b) => b.type === 'text' && b.text?.trim());
            post.description = firstText ? firstText.text : '';

            await post.save();
            return res.status(200).json(post);
        }

        post.description = description || post.description;

        // удаляем выбранные медиа-вложения (removeMediaIds — id элементов media, JSON-массив или CSV)
        const idsToRemove = parseIdsList(removeMediaIds);
        if (idsToRemove.length > 0) {
            const toDelete = post.media.filter((m) => idsToRemove.includes(m._id.toString()));
            removeMediaFiles(toDelete);
            post.media = post.media.filter((m) => !idsToRemove.includes(m._id.toString()));
        }

        // добавляем новые загруженные файлы
        const newMedia = buildMediaArray(req.files);
        if (newMedia.length > 0) {
            if (post.media.length + newMedia.length > MAX_FILES) {
                removeMediaFiles(buildMediaArray(req.files)); // подчищаем уже сохранённые на диск файлы
                return res.status(400).json({ message: `Максимум ${MAX_FILES} медіафайлів на пост` });
            }
            post.media.push(...newMedia);
        }

        await post.save();

        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// DELETE - удалить пост
exports.deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Пост не найден' });
        }

        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Нет прав на удаление этого поста' });
        }

        removeMediaFiles(post.media);
        await Post.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: 'Пост удалён' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// POST /api/posts/:id/save - зберегти пост
exports.savePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ success: false, message: 'Пост не найден' });

        try {
            await SavedItem.create({ user: req.user.id, targetType: 'Post', target: post._id });
        } catch (err) {
            if (err.code !== 11000) throw err;
        }
        res.status(200).json({ success: true, message: 'Пост збережено' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/posts/:id/save - прибрати зі збережених
exports.unsavePost = async (req, res) => {
    try {
        await SavedItem.deleteOne({ user: req.user.id, targetType: 'Post', target: req.params.id });
        res.status(200).json({ success: true, message: 'Видалено зі збережених' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/posts/mine/saved - список збережених постів юзера
exports.getSavedPosts = async (req, res) => {
    try {
        const saved = await SavedItem.find({ user: req.user.id, targetType: 'Post' }).sort({ createdAt: -1 }).lean();
        const postIds = saved.map((s) => s.target);
        const posts = await Post.find({ _id: { $in: postIds } })
            .populate('author', 'nickname avatar')
            .populate('category', 'name icon')
            .lean();
        const enriched = await enrichPosts(posts, req.user.id);
        // preserve save order
        const order = new Map(postIds.map((id, i) => [id.toString(), i]));
        enriched.sort((a, b) => order.get(a._id.toString()) - order.get(b._id.toString()));
        res.status(200).json(enriched);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/posts/category/:categoryId/pending - список постів, що очікують модерації (тільки для мод/творця)
exports.getPendingPosts = async (req, res) => {
    try {
        const { canModerate } = require('./categoryController');
        const category = await Category.findById(req.params.categoryId);
        if (!category) return res.status(404).json({ message: 'Категория не найдена' });
        if (!canModerate(category, req.user.id)) {
            return res.status(403).json({ message: 'Немає прав модератора' });
        }

        const posts = await Post.find({ category: category._id, moderationStatus: 'pending' })
            .populate('author', 'nickname avatar')
            .populate('category', 'name icon')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// POST /api/posts/:id/approve - схвалити пост, що чекає модерації
exports.approvePost = async (req, res) => {
    try {
        const { canModerate } = require('./categoryController');
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Пост не найден' });

        const category = await Category.findById(post.category);
        if (!category || !canModerate(category, req.user.id)) {
            return res.status(403).json({ message: 'Немає прав модератора' });
        }

        post.moderationStatus = 'approved';
        await post.save();

        res.status(200).json({ success: true, post });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// POST /api/posts/:id/reject - відхилити (видалити) пост, що чекає модерації
exports.rejectPost = async (req, res) => {
    try {
        const { canModerate } = require('./categoryController');
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Пост не найден' });

        const category = await Category.findById(post.category);
        if (!category || !canModerate(category, req.user.id)) {
            return res.status(403).json({ message: 'Немає прав модератора' });
        }

        post.moderationStatus = 'removed';
        await post.save();

        res.status(200).json({ success: true, message: 'Пост відхилено' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};