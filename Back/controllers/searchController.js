const Post = require('../models/Post');
const Category = require('../models/Category');
const Subscription = require('../models/Subscription');

exports.search = async (req, res) => {
    try {
        const query = req.query.q || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const categoryLimit = parseInt(req.query.categoryLimit) || 5;
        const skip = (page - 1) * limit;

        const searchRegex = new RegExp(query.trim(), 'i');

        const [posts, categories, total] = await Promise.all([
            Post.find({ $or: [{ title: searchRegex }, { description: searchRegex }] })
                .populate('author', 'nickname avatar')
                .populate('category', 'name')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Category.find({ name: searchRegex }).limit(categoryLimit).populate('creator', 'nickname avatar').lean(),
            Post.countDocuments({ $or: [{ title: searchRegex }, { description: searchRegex }] })
        ]);

        if (req.user) {
            const subs = await Subscription.find({ user: req.user.id }).select('category').lean();
            const subbedIds = new Set(subs.map((s) => s.category.toString()));
            categories.forEach((c) => { c.isSubscribed = subbedIds.has(c._id.toString()); });
        }

        res.status(200).json({ success: true, posts, categories, total, page, limit });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};