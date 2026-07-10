const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

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