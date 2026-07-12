const Notification = require('../models/Notification');

// GET /api/notifications -> { notifications, unreadCount }
exports.getMine = async (req, res) => {
    try {
        const items = await Notification.find({ recipient: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('fromUser', 'nickname avatar')
            .populate('post', 'title')
            .populate('comment', 'text');

        const unreadCount = await Notification.countDocuments({ recipient: req.user.id, isRead: false });

        res.status(200).json({
            success: true,
            unreadCount,
            notifications: items.map((n) => ({
                id: n._id,
                type: n.type,
                message: n.message,
                isRead: n.isRead,
                fromUser: n.fromUser ? { id: n.fromUser._id, nickname: n.fromUser.nickname, avatar: n.fromUser.avatar } : null,
                post: n.post ? { id: n.post._id, title: n.post.title } : null,
                comment: n.comment ? { id: n.comment._id, text: n.comment.text } : null,
                createdAt: n.createdAt
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/notifications/unread-count -> { unreadCount } — легковесный эндпоинт для бейджа/поллинга
exports.getUnreadCount = async (req, res) => {
    try {
        const unreadCount = await Notification.countDocuments({ recipient: req.user.id, isRead: false });
        res.status(200).json({ success: true, unreadCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/notifications/:id/read
exports.markRead = async (req, res) => {
    try {
        const n = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user.id },
            { isRead: true },
            { new: true }
        );
        if (!n) return res.status(404).json({ success: false, message: 'Сповіщення не знайдено' });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/notifications/read-all
exports.markAllRead = async (req, res) => {
    try {
        await Notification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};