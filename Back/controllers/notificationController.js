const Notification = require('../models/Notification');

// GET /api/notifications -> { notifications }
exports.getMine = async (req, res) => {
    try {
        const items = await Notification.find({ recipient: req.user.id }).sort({ createdAt: -1 }).limit(50);
        res.status(200).json({
            success: true,
            notifications: items.map((n) => ({
                id: n._id,
                message: n.message,
                isRead: n.isRead,
                createdAt: n.createdAt
            }))
        });
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