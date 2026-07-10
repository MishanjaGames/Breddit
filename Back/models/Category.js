const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categorySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        default: '',
        maxlength: 500
    },
    icon: {
        type: String,
        default: null
    },
    banner: {
        type: String,
        default: null
    },
    rules: [{
        title: { type: String, trim: true, maxlength: 100 },
        body: { type: String, trim: true, maxlength: 500 }
    }],
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    subscriberCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});


module.exports = mongoose.model('Category', categorySchema);