const Post = require('../models/Post');
const Category = require('../models/Category');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Follow = require('../models/Follow');

// экранирует спецсимволы regex, чтобы поиск с символами вида '.', '+', '(' не падал
// и не давал юзеру строить произвольный regex (ReDoS/некорректные паттерны)
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.search = async (req, res) => {
    try {
        const query = req.query.q || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const categoryLimit = parseInt(req.query.categoryLimit) || 5;
        const userLimit = parseInt(req.query.userLimit) || 5;
        const skip = (page - 1) * limit;

        const searchRegex = new RegExp(escapeRegex(query.trim()), 'i');

        const [posts, categories, users, total] = await Promise.all([
            Post.find({ $or: [{ title: searchRegex }, { description: searchRegex }] })
                .populate('author', 'nickname avatar')
                .populate('category', 'name')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Category.find({ name: searchRegex }).limit(categoryLimit).populate('creator', 'nickname avatar').lean(),
            // поиск пользователей по нікнейму — нужен для сценария "найти юзера -> открыть его профіль"
            User.find({ nickname: searchRegex }).select('nickname avatar bio karma').limit(userLimit).lean(),
            Post.countDocuments({ $or: [{ title: searchRegex }, { description: searchRegex }] })
        ]);

        if (req.user) {
            const [subs, follows] = await Promise.all([
                Subscription.find({ user: req.user.id }).select('category').lean(),
                Follow.find({ follower: req.user.id }).select('following').lean()
            ]);
            const subbedIds = new Set(subs.map((s) => s.category.toString()));
            categories.forEach((c) => { c.isSubscribed = subbedIds.has(c._id.toString()); });

            const followingIds = new Set(follows.map((f) => f.following.toString()));
            users.forEach((u) => { u.isFollowing = followingIds.has(u._id.toString()); });
        }

        res.status(200).json({ success: true, posts, categories, users, total, page, limit });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};