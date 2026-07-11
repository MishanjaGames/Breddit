const path = require('path');
const fs = require('fs');

const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');

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

        const [postAgg, commentAgg, postCount, commentCount, followerCount, followingCount] = await Promise.all([
            Post.aggregate([{ $match: { author: user._id } }, { $group: { _id: null, karma: { $sum: '$karma' } } }]),
            Comment.aggregate([{ $match: { author: user._id } }, { $group: { _id: null, karma: { $sum: '$karma' } } }]),
            Post.countDocuments({ author: user._id }),
            Comment.countDocuments({ author: user._id, isDeleted: false }),
            Follow.countDocuments({ following: user._id }),
            Follow.countDocuments({ follower: user._id })
        ]);

        let isFollowing = false;
        if (req.user && req.user.id !== user._id.toString()) {
            isFollowing = !!(await Follow.findOne({ follower: req.user.id, following: user._id }));
        }

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
                followerCount,
                followingCount,
                isFollowing,
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

// POST /api/users/:nickname/follow -> подписаться на юзера
exports.followUser = async (req, res) => {
    try {
        const target = await User.findOne({ nickname: req.params.nickname });
        if (!target) {
            return res.status(404).json({ success: false, message: 'Користувача не знайдено' });
        }

        if (target._id.toString() === req.user.id) {
            return res.status(400).json({ success: false, message: 'Не можна підписатися на самого себе' });
        }

        try {
            await Follow.create({ follower: req.user.id, following: target._id });
        } catch (err) {
            if (err.code !== 11000) throw err; // уже подписан — молча идём дальше (идемпотентно)
        }

        await Notification.create({
            recipient: target._id,
            type: 'follow',
            message: 'На вас підписався новий користувач',
            fromUser: req.user.id
        });

        const followerCount = await Follow.countDocuments({ following: target._id });
        res.status(200).json({ success: true, isFollowing: true, followerCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/users/:nickname/follow -> отписаться от юзера
exports.unfollowUser = async (req, res) => {
    try {
        const target = await User.findOne({ nickname: req.params.nickname });
        if (!target) {
            return res.status(404).json({ success: false, message: 'Користувача не знайдено' });
        }

        await Follow.deleteOne({ follower: req.user.id, following: target._id });

        const followerCount = await Follow.countDocuments({ following: target._id });
        res.status(200).json({ success: true, isFollowing: false, followerCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/users/:nickname/followers -> список подписчиков юзера
exports.getFollowers = async (req, res) => {
    try {
        const target = await User.findOne({ nickname: req.params.nickname });
        if (!target) {
            return res.status(404).json({ success: false, message: 'Користувача не знайдено' });
        }

        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const follows = await Follow.find({ following: target._id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('follower', 'nickname avatar');

        res.status(200).json({
            success: true,
            followers: follows.map((f) => f.follower)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/users/:nickname/following -> список тех, на кого подписан юзер
exports.getFollowing = async (req, res) => {
    try {
        const target = await User.findOne({ nickname: req.params.nickname });
        if (!target) {
            return res.status(404).json({ success: false, message: 'Користувача не знайдено' });
        }

        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const follows = await Follow.find({ follower: target._id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('following', 'nickname avatar');

        res.status(200).json({
            success: true,
            following: follows.map((f) => f.following)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};