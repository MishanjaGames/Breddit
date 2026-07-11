const path = require('path');
const fs = require('fs');

const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

const DEFAULT_AVATAR = null; // фронтенд сам рисует дефолтную аватарку, когда avatar === null
const AVATARS_DIR = path.join(__dirname, '..', 'uploads');

// удаляет файл предыдущей аватарки, если она была реально загружена (не null)
const removeOldAvatar = (avatar) => {
    if (!avatar) return;
    const oldPath = path.join(AVATARS_DIR, avatar);
    fs.unlink(oldPath, () => {}); // не критично, если файла уже нет
};

// GET /api/users/:nickname -> { user }
exports.getByNickname = async (req, res) => {
    try {
        const user = await User.findOne({ nickname: req.params.nickname });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Користувача не знайдено' });
        }

        const [postAgg, commentAgg, postCount, commentCount] = await Promise.all([
            Post.aggregate([{ $match: { author: user._id } }, { $group: { _id: null, karma: { $sum: '$karma' } } }]),
            Comment.aggregate([{ $match: { author: user._id } }, { $group: { _id: null, karma: { $sum: '$karma' } } }]),
            Post.countDocuments({ author: user._id }),
            Comment.countDocuments({ author: user._id, isDeleted: false })
        ]);

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                username: user.nickname,
                bio: user.bio,
                avatar: user.avatar,
                postKarma: postAgg[0]?.karma || 0,
                commentKarma: commentAgg[0]?.karma || 0,
                postCount,
                commentCount,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/users/me/avatar -> загрузить/заменить аватарку текущего юзера
exports.updateAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Файл не загружен' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        removeOldAvatar(user.avatar);

        user.avatar = `avatars/${req.file.filename}`;
        await user.save();

        res.status(200).json({
            success: true,
            avatar: user.avatar,
            avatarUrl: `/uploads/${user.avatar}`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/users/me/avatar -> сбросить аватарку на дефолтную
exports.deleteAvatar = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        removeOldAvatar(user.avatar);

        user.avatar = DEFAULT_AVATAR;
        await user.save();

        res.status(200).json({ success: true, avatar: user.avatar });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};