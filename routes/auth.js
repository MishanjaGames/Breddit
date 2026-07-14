const express = require('express')
const passport = require('passport')
const controller = require('../controllers/auth')
const { protect } = require('../middleware/authMiddleware')
const { authLimiter } = require('../middleware/rateLimiter')
const { validateAuth } = require('../middleware/validate')
const keys = require('../config/keys')

const router = express.Router()

router.post('/register', authLimiter, validateAuth, controller.register)
router.post('/login', authLimiter, validateAuth, controller.login)
router.get('/me', protect, controller.me)
router.post('/logout', protect, controller.logout)
router.post('/refresh', controller.refresh)

// ---------- Email confirmation ----------
router.post('/resend-verification', protect, authLimiter, controller.resendVerification)
router.post('/verify-email', authLimiter, controller.verifyEmail)

// ---------- Forgot / reset password ----------
router.post('/forgot-password', authLimiter, controller.forgotPassword)
router.post('/reset-password', authLimiter, controller.resetPassword)
router.put('/change-password', protect, authLimiter, controller.changePassword)

// ---------- Google OAuth ----------
router.get('/google', (req, res, next) => {
    if (!keys.google.clientId) {
        return res.status(503).json({ success: false, message: 'Google OAuth is not configured on the server' })
    }
    next()
}, passport.authenticate('google', { scope: ['profile', 'email'], session: false }))

router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${keys.frontendUrl}/login?error=google` }),
    controller.oauthCallback
)

// ---------- Facebook OAuth ----------
router.get('/facebook', (req, res, next) => {
    if (!keys.facebook.appId) {
        return res.status(503).json({ success: false, message: 'Facebook OAuth is not configured on the server' })
    }
    next()
}, passport.authenticate('facebook', { scope: ['email'], session: false }))

router.get('/facebook/callback',
    passport.authenticate('facebook', { session: false, failureRedirect: `${keys.frontendUrl}/login?error=facebook` }),
    controller.oauthCallback
)

module.exports = router