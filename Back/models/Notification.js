const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    recipient: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['reply', 'comment_on_post', 'upvote_post', 'upvote_comment', 'saved_post_activity', 'mention', 'follow'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    // кто вызвал уведомление (тот, кто ответил/лайкнул/прокомментировал)
    fromUser: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // ссылки на контекст, чтобы фронт мог перейти прямо к посту/комментарию
    post: {
        type: Schema.Types.ObjectId,
        ref: 'Post',
        default: null
    },
    comment: {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);