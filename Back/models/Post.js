const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const mediaItemSchema = new Schema({
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'gif', 'video', 'audio', 'other'], required: true },
    mimeType: { type: String },
    size: { type: Number }
}, { _id: true });

// один блок контенту посту, в порядку додавання
// text: { type: 'text', text }
// image/video: { type: 'image'|'video', url, mimeType, size, originalName }
// file: { type: 'file', url, mimeType, size, originalName }
const contentBlockSchema = new Schema({
    type: {
        type: String,
        enum: ['text', 'image', 'video', 'file'],
        required: true
    },
    text: { type: String }, // тільки для type: 'text'
    url: { type: String }, // тільки для image/video/file
    mimeType: { type: String },
    size: { type: Number },
    originalName: { type: String }
}, { _id: true });

const postSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300
    },
    // description лишається як швидкий текстовий превʼю поста (перший текстовий блок),
    // щоб не ламати пошук/картки, що досі читають description напряму
    description: {
        type: String,
        default: ''
    },
    // впорядкований список блоків контенту поста: текст/зображення/відео/файл
    content: {
        type: [contentBlockSchema],
        default: []
    },
    media: {
        type: [mediaItemSchema],
        default: []
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // якщо пост є репостом, посилається на оригінальний пост (не змінюється при видаленні оригіналу)
    repostOf: {
        type: Schema.Types.ObjectId,
        ref: 'Post',
        default: null
    },
    karma: {
        type: Number,
        default: 0
    },
    // pending пости не показуються в стрічках, доки модератор не схвалить (для спільнот з requiresApproval)
    moderationStatus: {
        type: String,
        enum: ['approved', 'pending', 'removed'],
        default: 'approved'
    }
}, {
    timestamps: true
});

postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ author: 1 });
postSchema.index({ moderationStatus: 1 });

module.exports = mongoose.model('Post', postSchema);