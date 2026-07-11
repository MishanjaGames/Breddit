const Post = require('../models/Post');
const Category = require('../models/Category');
const Comment = require('../models/Comment');
const Vote = require('../models/Vote');
const SavedItem = require('../models/SavedItem');
const Subscription = require('../models/Subscription');
const { buildMediaArray, removeMediaFiles, parseIdsList, MAX_FILES } = require('../middleware/mediaUpload');

// helper: applies sort order for a mongoose query based on ?sort=
// hot = recency-weighted score, new = createdAt, top = karma, controversial = low |karma| with activity
const SORTS = {
    new: { createdAt: -1 },
    top: { karma: -1, createdAt: -1 },
    hot: { karma: -1, createdAt: -1 }, // real "hot" needs a time-decay calc, approximated below post-fetch
    controversial: { createdAt: -1 }
};

const applyHotScore = (posts) => {
    // classic reddit "hot" approximation: log10(score) decaying with age
    const now = Date.now();
    return posts
        .map((p) => {
            const ageHours = (now - new Date(p.createdAt).getTime()) / 3600000;
            const score = Math.log10(Math.max(Math.abs(p.karma), 1)) * Math.sign(p.karma || 1) - ageHours / 45;
            return { ...p, _hot: score };
        })
        .sort((a, b) => b._hot - a._hot)
        .map(({ _hot, ...rest }) => rest);
};

const applyControversialScore = (posts) => {
    // controversial = lots of votes but karma near zero (rough proxy using |karma| and commentCount)
    return [...posts].sort((a, b) => {
        const aScore = (a.commentCount || 0) - Math.abs(a.karma || 0);
        const bScore = (b.commentCount || 0) - Math.abs(b.karma || 0);
        return bScore - aScore;
    });
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

// CREATE - создать пост
exports.createPost = async (req, res) => {
    try {
        const { title, description, category } = req.body;
        const author = req.user.id;

        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            return res.status(404).json({ message: 'Категория не найдена' });
        }

        const media = buildMediaArray(req.files);

        const post = new Post({ title, description, category, author, media });
        await post.save();

        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// READ - получить все посты (с пагинацией, feed, sort)
// query: page, limit, feed = home|popular|all, sort = hot|new|top|controversial
exports.getAllPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const feed = req.query.feed || 'popular';
        const sort = req.query.sort || 'hot';
        const userId = req.user?.id;

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
        }
        // 'popular' and 'all' both search everything for now (no separate popularity tiering)

        const needsPostProcessSort = sort === 'hot' || sort === 'controversial';
        const mongoSort = SORTS[sort] || SORTS.hot;

        let query = Post.find(categoryFilter)
            .populate('author', 'nickname avatar')
            .populate('category', 'name icon')
            .sort(mongoSort);

        // for hot/controversial we need commentCount before final ordering, so overfetch then re-sort in JS
        const total = await Post.countDocuments(categoryFilter);
        let posts;
        if (needsPostProcessSort) {
            const pool = await query.limit(Math.min(total, 300)).lean();
            const enrichedPool = await enrichPosts(pool, userId);
            const sorted = sort === 'hot' ? applyHotScore(enrichedPool) : applyControversialScore(enrichedPool);
            posts = sorted.slice(skip, skip + limit);
        } else {
            const pageDocs = await query.skip(skip).limit(limit).lean();
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

// READ - получить посты одной категории
exports.getPostsByCategory = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const sort = req.query.sort || 'new';
        const userId = req.user?.id;

        const posts = await Post.find({ category: req.params.categoryId })
            .populate('author', 'nickname avatar')
            .populate('category', 'name icon')
            .sort(SORTS[sort] || SORTS.new)
            .limit(limit)
            .lean();

        const enriched = await enrichPosts(posts, userId);
        const finalPosts = sort === 'hot' ? applyHotScore(enriched) : sort === 'controversial' ? applyControversialScore(enriched) : enriched;

        res.status(200).json(finalPosts);
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
        const { title, description, category, removeMediaIds } = req.body;

        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Пост не найден' });
        }

        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Нет прав на редактирование этого поста' });
        }

        post.title = title || post.title;
        post.description = description || post.description;
        post.category = category || post.category;

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