const Vote = require('../models/Vote');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const { emitToUser, emitToPost } = require('../utils/socket');

const updateKarma = async (targetType, targetId, delta) => {
    if (targetType === 'Post') {
        await Post.findByIdAndUpdate(targetId, { $inc: { karma: delta } });
    } else {
        await Comment.findByIdAndUpdate(targetId, { $inc: { karma: delta } });
    }
};

exports.vote = async (req, res) => {
    try {
        const { targetType, targetId, value } = req.body;
        const userId = req.user.id;

        if (!['Post', 'Comment'].includes(targetType) || !targetId || ![1, -1].includes(value)) {
            return res.status(400).json({ success: false, message: 'Invalid vote payload' });
        }

        const target = targetType === 'Post'
            ? await Post.findById(targetId)
            : await Comment.findById(targetId);

        if (!target) {
            return res.status(404).json({ success: false, message: 'Target not found' });
        }

        const existingVote = await Vote.findOne({ author: userId, target: targetId });

        if (existingVote) {
            if (existingVote.value === value) {
                await Vote.deleteOne({ _id: existingVote._id });
                await updateKarma(targetType, targetId, -value);
                return res.status(200).json({ success: true, message: 'Vote removed' });
            }

            await Vote.updateOne({ _id: existingVote._id }, { value });
            await updateKarma(targetType, targetId, value * 2);
            return res.status(200).json({ success: true, message: 'Vote updated' });
        }

        const vote = new Vote({ author: userId, targetType, target: targetId, value });
        await vote.save();
        await updateKarma(targetType, targetId, value);

        if (value === 1 && target.author.toString() !== userId) {
            await Notification.create({
                recipient: target.author,
                type: targetType === 'Post' ? 'upvote_post' : 'upvote_comment',
                message: targetType === 'Post' ? 'Ваш пост отримав апвоут' : 'Ваш коментар отримав апвоут',
                fromUser: userId,
                post: targetType === 'Post' ? targetId : target.post,
                comment: targetType === 'Comment' ? targetId : null
            });
            emitToUser(target.author.toString(), 'notification:new', { type: targetType === 'Post' ? 'upvote_post' : 'upvote_comment' });
        }

        const relatedPostId = targetType === 'Post' ? targetId : target.post?.toString();
        emitToPost(relatedPostId, 'vote:update', { targetType, targetId });

        res.status(201).json({ success: true, message: 'Vote created' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};