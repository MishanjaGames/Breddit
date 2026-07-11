const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const mediaItemSchema = new Schema({
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'gif', 'video', 'audio', 'other'], required: true },
    mimeType: { type: String },
    size: { type: Number }
}, { _id: true });

const commentSchema = new Schema({
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    media: {
        type: [mediaItemSchema],
        default: []
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    post: {
        type: Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    parentComment: {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    },
    karma: {
        type: Number,
        default: 0
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parentComment: 1 });

module.exports = mongoose.model('Comment', commentSchema);