const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const mediaItemSchema = new Schema({
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'gif', 'video', 'audio', 'other'], required: true },
    mimeType: { type: String },
    size: { type: Number }
}, { _id: true });

const postSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300
    },
    description: {
        type: String,
        required: true
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