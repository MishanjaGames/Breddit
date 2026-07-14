const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const User = require('../models/User')
const errorHandler = require('../utils/errorHandler')
const keys = require('../config/keys')
const { sendVerificationEmail, sendPasswordResetEmail, sendPasswordChangedEmail } = require('../utils/email')

// генерируем случайный токен + храним в БД только его хэш (сам токен уходит юзеру на почту и
// нигде не сохраняется в открытом виде — стандартная практика для email-verify/reset-password токенов)
const createRawTokenAndHash = () => {
    const raw = crypto.randomBytes(32).toString('hex')
    const hash = crypto.createHash('sha256').update(raw).digest('hex')
    return { raw, hash }
}
const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex')

const createToken = (user) => jwt.sign({
    userId: user._id,
    email: user.email,
    nickname: user.nickname
}, keys.jwtKey, { expiresIn: '2h' })

const buildUserResponse = (user) => ({
    id: user._id,
    email: user.email,
    nickname: user.nickname,
    avatar: user.avatar,
    karma: user.karma,
    emailVerified: user.emailVerified
})

module.exports.login = async (req, res) => {
    try {
        const email = req.body.email.toLowerCase()
        const userDb = await User.findOne({ email })

        if (!userDb) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }

        const isRulePassw = await userDb.comparePassword(req.body.password)

        if (!isRulePassw) {
            return res.status(401).json({ success: false, message: 'Invalid password' })
        }

        const token = createToken(userDb)

        return res.status(200).json({
            success: true,
            token: `Bearer ${token}`,
            user: buildUserResponse(userDb)
        })
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message || e })
    }
}

module.exports.register = async (req, res) => {
    try {
        const existingUser = await User.findOne({ email: req.body.email.toLowerCase() })

        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Email already registered' })
        }

        const newUser = new User({
            email: req.body.email.toLowerCase(),
            password: req.body.password,
            nickname: (req.body.nickname || req.body.username).trim().replace(/\s+/g, '_')
        })

        const { raw, hash } = createRawTokenAndHash()
        newUser.emailVerifyTokenHash = hash
        newUser.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 години

        await newUser.save()
        const token = createToken(newUser)
        
        sendVerificationEmail(newUser.email, `${keys.frontendUrl}/verify-email?token=${raw}`)
            .catch((e) => console.error('[auth] Failed to send verification email:', e.message))

        return res.status(201).json({
            success: true,
            token: `Bearer ${token}`,
            user: buildUserResponse(newUser)
        })
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message || e })
    }
}

module.exports.me = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            user: buildUserResponse(req.user)
        })
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message || e })
    }
}

module.exports.logout = async (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    })
}

module.exports.refresh = async (req, res) => {
    try {
        const authHeader = req.headers.authorization || ''
        const token = authHeader.split('Bearer ')[1]

        if (!token) {
            return res.status(400).json({ success: false, message: 'Token is required' })
        }

        const decoded = jwt.verify(token, keys.jwtKey)
        const user = await User.findById(decoded.userId).select('-password')

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }

        const refreshedToken = createToken(user)

        return res.status(200).json({
            success: true,
            token: `Bearer ${refreshedToken}`
        })
    } catch (e) {
        return res.status(401).json({ success: false, message: e.message || e })
    }
}

// Вызывается после успешной OAuth-авторизации (Google/Facebook).
// passport уже положил найденного/созданного юзера в req.user (см. utils/oauth.js).
// Это редирект-флоу браузера (а не fetch/XHR с фронта), поэтому токен
// возвращаем не в JSON, а через query-параметр редиректа на страницу фронта,
// которая должна его считать и сохранить (например, localStorage) на своей стороне.
module.exports.oauthCallback = async (req, res) => {
    try {
        const token = createToken(req.user)
        return res.redirect(`${keys.frontendUrl}/oauth/callback?token=${encodeURIComponent(token)}`)
    } catch (e) {
        return res.redirect(`${keys.frontendUrl}/login?error=oauth_failed`)
    }
}

// ---------- Email confirmation ----------

// POST /api/auth/resend-verification (protect) — переслати лист підтвердження на свій email
module.exports.resendVerification = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
        if (!user) return res.status(404).json({ success: false, message: 'User not found' })
        if (user.emailVerified) {
            return res.status(400).json({ success: false, message: 'Email is already verified' })
        }

        const { raw, hash } = createRawTokenAndHash()
        user.emailVerifyTokenHash = hash
        user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)
        await user.save()

        await sendVerificationEmail(user.email, `${keys.frontendUrl}/verify-email?token=${raw}`)

        return res.status(200).json({ success: true, message: 'Verification email sent' })
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message || e })
    }
}

// POST /api/auth/verify-email { token } — публічний ендпоінт, юзер переходить по лінку з листа
module.exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.body
        if (!token) return res.status(400).json({ success: false, message: 'Token is required' })

        const hash = hashToken(token)
        const user = await User.findOne({
            emailVerifyTokenHash: hash,
            emailVerifyExpires: { $gt: new Date() }
        })

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired verification link' })
        }

        user.emailVerified = true
        user.emailVerifyTokenHash = null
        user.emailVerifyExpires = null
        await user.save()

        return res.status(200).json({ success: true, message: 'Email verified successfully' })
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message || e })
    }
}

// ---------- Forgot / reset password ----------

// POST /api/auth/forgot-password { email } — публічний. Завжди відповідаємо success:true,
// щоб не давати змогу перебором дізнатись, які email зареєстровані в системі.
module.exports.forgotPassword = async (req, res) => {
    try {
        const email = (req.body.email || '').toLowerCase().trim()
        if (!email) return res.status(400).json({ success: false, message: 'Email is required' })

        const user = await User.findOne({ email })

        if (user && user.password) { // OAuth-юзерам без пароля скидання пароля не потрібне
            const { raw, hash } = createRawTokenAndHash()
            user.resetPasswordTokenHash = hash
            user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 година
            await user.save()

            sendPasswordResetEmail(user.email, `${keys.frontendUrl}/reset-password?token=${raw}`)
                .catch((e) => console.error('[auth] Failed to send reset email:', e.message))
        }

        return res.status(200).json({
            success: true,
            message: 'If this email is registered, a reset link has been sent'
        })
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message || e })
    }
}

// POST /api/auth/reset-password { token, password } — публічний, встановлює новий пароль за токеном з листа
module.exports.resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body
        if (!token || !password) {
            return res.status(400).json({ success: false, message: 'Token and new password are required' })
        }

        const hash = hashToken(token)
        const user = await User.findOne({
            resetPasswordTokenHash: hash,
            resetPasswordExpires: { $gt: new Date() }
        })

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset link' })
        }

        user.password = password // хешується в pre('save') хуку моделі User
        user.resetPasswordTokenHash = null
        user.resetPasswordExpires = null
        await user.save()

        sendPasswordChangedEmail(user.email).catch((e) => console.error('[auth] Failed to send password-changed email:', e.message))

        return res.status(200).json({ success: true, message: 'Password has been reset' })
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message || e })
    }
}

// PUT /api/auth/change-password (protect) { currentPassword, newPassword } — зміна пароля з налаштувань акаунта
module.exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current and new password are required' })
        }

        const user = await User.findById(req.user.id)
        if (!user) return res.status(404).json({ success: false, message: 'User not found' })

        if (!user.password) {
            return res.status(400).json({ success: false, message: 'This account has no password set (OAuth account). Use "forgot password" to set one.' })
        }

        const isValid = await user.comparePassword(currentPassword)
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' })
        }

        user.password = newPassword
        await user.save()

        sendPasswordChangedEmail(user.email).catch((e) => console.error('[auth] Failed to send password-changed email:', e.message))

        return res.status(200).json({ success: true, message: 'Password changed successfully' })
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message || e })
    }
}
