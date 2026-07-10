const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const subscriptionSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    }
}, {
    timestamps: true
});

subscriptionSchema.index({ user: 1, category: 1 }, { unique: true });
subscriptionSchema.index({ category: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
