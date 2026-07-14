const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Category = require('../models/Category');
const Notification = require('../models/Notification');
const Vote = require('../models/Vote');
const SavedItem = require('../models/SavedItem');
const { buildMediaArray, removeMediaFiles, parseIdsList, MAX_FILES } = require('../middleware/mediaUpload');
const { extractMentionedNicknames, findMentionedUsers } = require('../utils/mentions');
const { emitToUser, emitToPost, emitToCategory } = require('../utils/socket');

// enrich flat comment list with myVote for the current user
const enrichComments = async (comments, userId) => {
    if (!userId || comments.length === 0) return comments.map((c) => (c.toObject ? c.toObject() : c));
    const ids = comments.map((c) => c._id);
    const votes = await Vote.find({ author: userId, target: { $in: ids }, targetType: 'Comment' }).lean();
    const voteMap = new Map(votes.map((v) => [v.target.toString(), v.value]));
    return comments.map((c) => {
        const obj = c.toObject ? c.toObject() : c;
        return { ...obj, myVote: voteMap.get(c._id.toString()) || null };
    });
};

// CREATE - создать комментарий (или ответ на комментарий)
exports.createComment = async (req, res) => {
    try {
        const { text, post, parentComment } = req.body;
        const author = req.user.id;

        const postExists = await Post.findById(post);
        if (!postExists) {
            return res.status(404).json({ message: 'Пост не найден' });
        }

        const postCategory = await Category.findById(postExists.category).select('bannedUsers mutedUsers').lean();
        if (postCategory?.bannedUsers?.some((id) => id.toString() === author)) {
            return res.status(403).json({ message: 'Вас забанено в цій спільноті' });
        }
        const isMuted = !!postCategory?.mutedUsers?.some((id) => id.toString() === author);

        if (parentComment) {
            const parentExists = await Comment.findById(parentComment);
            if (!parentExists) {
                return res.status(404).json({ message: 'Родительский комментарий не найден' });
            }
        }

        const comment = new Comment({
            text,
            author,
            post,
            parentComment: parentComment || null,
            media: buildMediaArray(req.files),
            isHiddenByModeration: isMuted
        });

        await comment.save();
        await comment.populate('author', 'nickname avatar');

        const notifiedUserIds = new Set([author]); // себе не уведомляем

        // 1) уведомление автору поста (comment_on_post) либо автору родительского комментария (reply)
        const primaryRecipient = parentComment
            ? (await Comment.findById(parentComment)).author
            : postExists.author;

        if (!notifiedUserIds.has(primaryRecipient.toString())) {
            await Notification.create({
                recipient: primaryRecipient,
                type: parentComment ? 'reply' : 'comment_on_post',
                message: parentComment ? 'Хтось відповів на ваш коментар' : 'Хтось прокоментував ваш пост',
                fromUser: author,
                post,
                comment: comment._id
            });
            notifiedUserIds.add(primaryRecipient.toString());
            emitToUser(primaryRecipient.toString(), 'notification:new', { type: parentComment ? 'reply' : 'comment_on_post' });
        }

        // 2) уведомляем всех, кто добавил этот пост в избранное, о новой активности в теме
        const savers = await SavedItem.find({ target: post, targetType: 'Post' }).select('user').lean();
        const toNotify = [...new Set(savers.map((s) => s.user.toString()))]
            .filter((userId) => !notifiedUserIds.has(userId));

        if (toNotify.length > 0) {
            await Notification.insertMany(
                toNotify.map((userId) => ({
                    recipient: userId,
                    type: 'saved_post_activity',
                    message: 'Нова активність у збереженій темі',
                    fromUser: author,
                    post,
                    comment: comment._id
                }))
            );
            toNotify.forEach((id) => notifiedUserIds.add(id));
            toNotify.forEach((id) => emitToUser(id, 'notification:new', { type: 'saved_post_activity' }));
        }

        // 3) уведомляем упомянутых юзеров (u/nickname или @nickname) в тексте комментария
        const mentionedNicknames = extractMentionedNicknames(text);
        if (mentionedNicknames.length > 0) {
            const mentionedUsers = await findMentionedUsers(mentionedNicknames);
            const mentionTargets = mentionedUsers
                .map((u) => u._id.toString())
                .filter((userId) => userId !== author && !notifiedUserIds.has(userId));

            if (mentionTargets.length > 0) {
                await Notification.insertMany(
                    mentionTargets.map((userId) => ({
                        recipient: userId,
                        type: 'mention',
                        message: 'Вас згадали в коментарі',
                        fromUser: author,
                        post,
                        comment: comment._id
                    }))
                );
                mentionTargets.forEach((id) => emitToUser(id, 'notification:new', { type: 'mention' }));
            }
        }

        // broadcast the new comment to anyone currently viewing this post/category, so their
        // comment thread updates live instead of needing a manual refresh or GET poll
        emitToPost(post.toString(), 'comment:new', { comment });
        emitToCategory(postExists.category?.toString(), 'comment:new', { postId: post.toString() });

        res.status(201).json(comment);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// READ - получить все комментарии к посту
exports.getCommentsByPost = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 200, 500);
        const userId = req.user?.id;

        // Deleted comments are kept (with text/media scrubbed) rather than excluded, so that any
        // replies underneath them aren't orphaned when the tree is rebuilt client-side.
        const filter = { post: req.params.postId };
        // муті-приховані коментарі бачить лише сам автор; для інших виключаємо їх зі стрічки
        if (userId) {
            filter.$or = [{ isHiddenByModeration: false }, { author: userId }];
        } else {
            filter.isHiddenByModeration = false;
        }

        const comments = await Comment.find(filter)
            .populate('author', 'nickname avatar')
            .sort({ createdAt: -1 })
            .limit(limit);

        const enriched = await enrichComments(comments, req.user?.id);
        res.status(200).json(enriched);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// READ - получить комментарі одного користувача (з пагінацією), для вкладки "Коментарі" в профілі
// query: page, limit
exports.getCommentsByAuthor = async (req, res) => {
    try {
        const User = require('../models/User');
        const author = await User.findOne({ nickname: req.params.nickname }).select('_id').lean();
        if (!author) return res.status(404).json({ message: 'Користувача не знайдено' });

        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;

        const filter = { author: author._id, isDeleted: false };
        const total = await Comment.countDocuments(filter);

        const comments = await Comment.find(filter)
            .populate('author', 'nickname avatar')
            .populate({ path: 'post', select: 'title category', populate: { path: 'category', select: 'name' } })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // posts that got deleted after the comment was made leave `post: null`; drop those, they can't be linked to
        const linkable = comments.filter((c) => c.post && c.post.category);

        res.status(200).json({
            comments: linkable,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalComments: total
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// READ - получить один комментарий по ID
exports.getCommentById = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id)
            .populate('author', 'nickname avatar');

        if (!comment || comment.isDeleted) {
            return res.status(404).json({ message: 'Комментарий не найден' });
        }

        const [enriched] = await enrichComments([comment], req.user?.id);
        res.status(200).json(enriched);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// UPDATE - обновить комментарий
exports.updateComment = async (req, res) => {
    try {
        const { text, removeMediaIds } = req.body;

        const comment = await Comment.findById(req.params.id);
        if (!comment || comment.isDeleted) {
            return res.status(404).json({ message: 'Комментарий не найден' });
        }

        if (comment.author.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Нет прав на редактирование этого комментария' });
        }

        comment.text = text || comment.text;

        // удаляем выбранные медиа-вложения (removeMediaIds — id элементов media, JSON-массив или CSV)
        const idsToRemove = parseIdsList(removeMediaIds);
        if (idsToRemove.length > 0) {
            const toDelete = comment.media.filter((m) => idsToRemove.includes(m._id.toString()));
            removeMediaFiles(toDelete);
            comment.media = comment.media.filter((m) => !idsToRemove.includes(m._id.toString()));
        }

        // добавляем новые загруженные файлы
        const newMedia = buildMediaArray(req.files);
        if (newMedia.length > 0) {
            if (comment.media.length + newMedia.length > MAX_FILES) {
                removeMediaFiles(buildMediaArray(req.files));
                return res.status(400).json({ message: `Максимум ${MAX_FILES} медіафайлів на коментар` });
            }
            comment.media.push(...newMedia);
        }

        await comment.save();

        res.status(200).json(comment);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// DELETE - "мягкое" удаление комментария (владелец коментаря АБО модератор спільноти поста)
exports.deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'Комментарий не найден' });
        }

        const isOwner = comment.author.toString() === req.user.id;
        let isModerator = false;
        if (!isOwner) {
            const post = await Post.findById(comment.post).select('category').lean();
            if (post) {
                const category = await Category.findById(post.category).select('creator moderators').lean();
                if (category) {
                    const { canModerate } = require('./categoryController');
                    isModerator = canModerate(category, req.user.id);
                }
            }
        }

        if (!isOwner && !isModerator) {
            return res.status(403).json({ message: 'Нет прав на удаление этого комментария' });
        }

        removeMediaFiles(comment.media);

        comment.isDeleted = true;
        comment.text = '[удалено]';
        comment.media = [];
        await comment.save();

        res.status(200).json({ message: 'Комментарий удалён' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};