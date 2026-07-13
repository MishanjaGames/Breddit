const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const savedItemSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    targetType: {
        type: String,
        enum: ['Post', 'Comment'],
        required: true
    },
    target: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'targetType'
    }
}, {
    timestamps: true
});

savedItemSchema.index({ user: 1, target: 1 }, { unique: true });
savedItemSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('SavedItem', savedItemSchema);
