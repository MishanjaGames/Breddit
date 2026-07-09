const Comment = require('../models/Comment');
const Post = require('../models/Post');

// CREATE - создать комментарий (или ответ на комментарий)
exports.createComment = async (req, res) => {
    try {
        const { text, post, parentComment } = req.body;
        const author = req.user.id;

        const postExists = await Post.findById(post);
        if (!postExists) {
            return res.status(404).json({ message: 'Пост не найден' });
        }

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
            parentComment: parentComment || null
        });

        await comment.save();

        res.status(201).json(comment);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// READ - получить все комментарии к посту
exports.getCommentsByPost = async (req, res) => {
    try {
        const comments = await Comment.find({
            post: req.params.postId,
            isDeleted: false
        })
            .populate('author', 'nickname avatar')
            .sort({ createdAt: -1 });

        res.status(200).json(comments);
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

        res.status(200).json(comment);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// UPDATE - обновить комментарий
exports.updateComment = async (req, res) => {
    try {
        const { text } = req.body;

        const comment = await Comment.findById(req.params.id);
        if (!comment || comment.isDeleted) {
            return res.status(404).json({ message: 'Комментарий не найден' });
        }

        if (comment.author.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Нет прав на редактирование этого комментария' });
        }

        comment.text = text || comment.text;
        await comment.save();

        res.status(200).json(comment);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};

// DELETE - "мягкое" удаление комментария
exports.deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'Комментарий не найден' });
        }

        if (comment.author.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Нет прав на удаление этого комментария' });
        }

        // мягкое удаление — текст скрываем, но структура дерева не ломается
        comment.isDeleted = true;
        comment.text = '[удалено]';
        await comment.save();

        res.status(200).json({ message: 'Комментарий удалён' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};