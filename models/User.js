const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    nickname: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20,
        match: [/^[a-zA-Z0-9_]+$/, 'Nickname can only contain letters, numbers and underscores']
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format']
    },
    password: {
        type: String,
        // локальным юзерам пароль обязателен, OAuth-юзерам (google/facebook) — нет
        required: function () {
            return !this.googleId && !this.facebookId;
        }
    },
    googleId: {
        type: String,
        default: undefined,
        unique: true,
        sparse: true // sparse — чтобы несколько null не конфликтовали с unique-индексом
    },
    facebookId: {
        type: String,
        default: undefined,
        unique: true,
        sparse: true
    },
    avatar: {
        type: String,
        default: null
    },
    banner: {
        type: String,
        default: null
    },
    status: {
        type: String,
        default: '',
        maxlength: 100
    },
    karma: {
        type: Number,
        default: 0
    },
    bio: {
        type: String,
        default: '',
        maxlength: 300
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerifyTokenHash: { type: String, default: null },
    emailVerifyExpires: { type: Date, default: null },
    resetPasswordTokenHash: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null }
}, {
    timestamps: true
});


userSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false; // OAuth-юзер без пароля — локальный логин для него невозможен
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);