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

// GET /api/users/resolve?ids=id1,id2 -> { users: [{ id, nickname }] } (публічний lookup id -> нікнейм)
exports.resolveByIds = async (req, res) => {
    try {
        const raw = (req.query.ids || '').split(',').map((s) => s.trim()).filter(Boolean);
        const ids = raw.filter((id) => /^[0-9a-fA-F]{24}$/.test(id)).slice(0, 100);
        if (ids.length === 0) return res.status(200).json({ success: true, users: [] });

        const users = await User.find({ _id: { $in: ids } }).select('_id nickname');
        res.status(200).json({
            success: true,
            users: users.map((u) => ({ id: u._id.toString(), nickname: u.nickname }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
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
                status: user.status,
                avatar: user.avatar,
                banner: user.banner,
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

// PUT /api/users/me -> оновити нікнейм/статус/біо поточного юзера
exports.updateProfile = async (req, res) => {
    try {
        const { nickname, bio, status } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        if (nickname && nickname !== user.nickname) {
            const trimmed = nickname.trim();
            if (trimmed.length < 3 || trimmed.length > 30 || !/^[a-zA-Z0-9_]+$/.test(trimmed)) {
                return res.status(400).json({ success: false, message: 'Нікнейм: 3-30 символів, латиниця/цифри/підкреслення' });
            }
            const taken = await User.findOne({ nickname: trimmed, _id: { $ne: user._id } });
            if (taken) {
                return res.status(400).json({ success: false, message: 'Цей нікнейм вже зайнято' });
            }
            user.nickname = trimmed;
        }

        if (bio !== undefined) user.bio = bio;
        if (status !== undefined) user.status = status;

        await user.save();

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                nickname: user.nickname,
                bio: user.bio,
                status: user.status,
                avatar: user.avatar,
                banner: user.banner
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Цей нікнейм вже зайнято' });
        }
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

// PUT /api/users/me/banner -> загрузить/заменить банер профілю
exports.updateBanner = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Файл не загружен' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        removeOldAvatar(user.banner);

        user.banner = `banners/${req.file.filename}`;
        await user.save();

        res.status(200).json({ success: true, banner: user.banner });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/users/me/banner -> прибрати банер профілю
exports.deleteBanner = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        removeOldAvatar(user.banner);

        user.banner = null;
        await user.save();

        res.status(200).json({ success: true, banner: null });
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