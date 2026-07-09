const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    nickname: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: 'default-avatar.png'
    },
    karma: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// userSchema.pre('save', async function (next) {
//     if (!this.isModified('password')) return next();
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
// });

// userSchema.methods.comparePassword = async function (candidatePassword) {
//     return bcrypt.compare(candidatePassword, this.password);
// };

module.exports = mongoose.model('User', userSchema);