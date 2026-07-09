const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
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
//Ответ к коменту массив
module.exports = mongoose.model('Comment', commentSchema);