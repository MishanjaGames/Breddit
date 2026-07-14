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
    tags: {
        type: [String],
        default: [],
        set: (arr) => Array.isArray(arr) ? [...new Set(arr.map((t) => String(t).trim().toLowerCase()).filter(Boolean))] : [],
        validate: {
            validator: (arr) => Array.isArray(arr) && arr.length <= 10,
            message: 'Спільнота може мати максимум 10 тегів'
        }
    },
    banner: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['public', 'restricted', 'private'],
        default: 'public'
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
    },
    // модерація: забанені (не можуть постити/коментувати) та замучені (можуть постити, коментарі приховані) юзери
    bannedUsers: {
        type: [Schema.Types.ObjectId],
        ref: 'User',
        default: []
    },
    mutedUsers: {
        type: [Schema.Types.ObjectId],
        ref: 'User',
        default: []
    },
    moderators: {
        type: [Schema.Types.ObjectId],
        ref: 'User',
        default: []
    },
    // якщо true, нові пости в спільноті потребують схвалення модератора перед публікацією
    requiresApproval: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});


module.exports = mongoose.model('Category', categorySchema);