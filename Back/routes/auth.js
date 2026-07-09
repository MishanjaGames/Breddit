const express = require('express')
const controller = require('../controllers/auth')
const { protect } = require('../middleware/authMiddleware')
const { authLimiter } = require('../middleware/rateLimiter')
const { validateAuth } = require('../middleware/validate')

const router = express.Router()

router.post('/register', authLimiter, validateAuth, controller.register)
router.post('/login', authLimiter, validateAuth, controller.login)
router.get('/me', protect, controller.me)
router.post('/logout', protect, controller.logout)
router.post('/refresh', controller.refresh)

module.exports = router