const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const User = require('../models/User')
const errorHandler = require('../utils/errorHandler')
const keys = require('../config/keys')

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
    banner: user.banner,
    status: user.status,
    karma: user.karma
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
            nickname: (req.body.nickname || req.body.username).trim()
        })

        await newUser.save()
        const token = createToken(newUser)

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