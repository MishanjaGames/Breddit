const { deleteBlobByUrl } = require('../utils/azureBlob');

const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');
const Vote = require('../models/Vote');
const SavedItem = require('../models/SavedItem');
const Subscription = require('../models/Subscription');
const { emitToUser } = require('../utils/socket');
const Category = require('../models/Category');
const { removeMediaFiles } = require('../middleware/mediaUpload');

const DEFAULT_AVATAR = null; // фронтенд сам рисует дефолтную аватарку, когда avatar === null

// удаляет предыдущий blob аватарки/банера из Azure Blob Storage, если он был реально загружен (не null).
// Не критично, если blob уже нет или Azure недоступен на секунду — старый файл просто останется висеть,
// это не должно ронять сохранение нового аватара/сброс на дефолтный.
const removeOldAvatar = async (avatarUrl) => {
    if (!avatarUrl) return;
    try {
        await deleteBlobByUrl(avatarUrl);
    } catch (err) {
        console.error('Failed to delete old avatar/banner blob:', err.message);
    }
};

// PUT /api/users/me -> обновить нікнейм/статус/біо текущего юзера
exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        const { nickname, status, bio } = req.body;

        if (nickname !== undefined) {
            const clean = String(nickname).trim().replace(/\s+/g, '_');
            if (clean.length < 3) {
                return res.status(400).json({ success: false, message: 'Нікнейм має бути не менше 3 символів' });
            }
            if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
                return res.status(400).json({ success: false, message: 'Нікнейм може містити лише латинські літери, цифри та підкреслення' });
            }
            user.nickname = clean;
        }
        if (status !== undefined) user.status = String(status).slice(0, 100);
        if (bio !== undefined) user.bio = String(bio).slice(0, 300);

        await user.save();

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                username: user.nickname,
                nickname: user.nickname,
                status: user.status,
                bio: user.bio,
                avatar: user.avatar,
                banner: user.banner
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Цей нікнейм вже зайнятий' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
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

        await removeOldAvatar(user.avatar);

        user.avatar = req.file.blobUrl;
        await user.save();

        res.status(200).json({
            success: true,
            avatar: user.avatar,
            avatarUrl: user.avatar
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

        await removeOldAvatar(user.avatar);

        user.avatar = DEFAULT_AVATAR;
        await user.save();

        res.status(200).json({ success: true, avatar: user.avatar });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/users/me/banner -> загрузить/заменить банер текущего юзера
exports.updateBanner = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Файл не загружен' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        await removeOldAvatar(user.banner);

        user.banner = req.file.blobUrl;
        await user.save();

        res.status(200).json({
            success: true,
            banner: user.banner,
            bannerUrl: user.banner
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/users/me/banner -> прибрати банер
exports.deleteBanner = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        await removeOldAvatar(user.banner);

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
        emitToUser(target._id.toString(), 'notification:new', { type: 'follow' });

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
// DELETE /api/users/me -> видалити акаунт та каскадно всі повʼязані дані
exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        // видаляємо медіафайли власних постів і коментарів перед видаленням записів
        const ownPosts = await Post.find({ author: userId }).select('media').lean();
        ownPosts.forEach((p) => removeMediaFiles(p.media));
        const ownComments = await Comment.find({ author: userId }).select('media').lean();
        ownComments.forEach((c) => removeMediaFiles(c.media));

        // видаляємо файли аватара/банера
        await removeOldAvatar(user.avatar);
        await removeOldAvatar(user.banner);

        await Promise.all([
            Post.deleteMany({ author: userId }),
            Comment.deleteMany({ author: userId }),
            Vote.deleteMany({ author: userId }),
            SavedItem.deleteMany({ user: userId }),
            Subscription.deleteMany({ user: userId }),
            Follow.deleteMany({ $or: [{ follower: userId }, { following: userId }] }),
            Notification.deleteMany({ $or: [{ recipient: userId }, { fromUser: userId }] })
        ]);

        // прибираємо юзера зі списків бан/мут/модераторів усіх спільнот
        await Category.updateMany(
            {},
            { $pull: { bannedUsers: userId, mutedUsers: userId, moderators: userId } }
        );

        // спільноти, де юзер був єдиним творцем, залишаються без творця (creator: null),
        // а не видаляються — це зберігає контент спільноти для інших учасників
        await Category.updateMany({ creator: userId }, { creator: null });

        await User.findByIdAndDelete(userId);

        res.status(200).json({ success: true, message: 'Акаунт видалено' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
