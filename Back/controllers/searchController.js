const Post = require('../models/Post');
const Category = require('../models/Category');

exports.search = async (req, res) => {
    try {
        const query = req.query.q || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const searchRegex = new RegExp(query.trim(), 'i');

        const [posts, categories, total] = await Promise.all([
            Post.find({ $or: [{ title: searchRegex }, { description: searchRegex }] })
                .populate('author', 'nickname avatar')
                .populate('category', 'name')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Category.find({ name: searchRegex }).populate('creator', 'nickname avatar').limit(5),
            Post.countDocuments({ $or: [{ title: searchRegex }, { description: searchRegex }] })
        ]);

        res.status(200).json({ success: true, posts, categories, total, page, limit });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};