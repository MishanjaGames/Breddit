const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const voteSchema = new Schema({
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
    },
    value: {
        type: Number,
        enum: [1, -1],
        required: true
    }
}, {
    timestamps: true
});

voteSchema.index({ user: 1, target: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);