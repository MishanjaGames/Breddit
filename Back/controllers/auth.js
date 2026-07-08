const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const User = require('../models/User')
const errorHandler = require('../utils/errorHandler')
const keys = require('../config/keys')

module.exports.login = async (req, res) => {
    // res.status(200).json({
    //     method: 'login...'
    // })
    const userDb = await User.findOne({ email: req.body.email })
    if (userDb) {
        const isRulePassw = bcrypt.compareSync(req.body.password, userDb.password)

        if (isRulePassw) {

            const token = jwt.sign({
                email: userDb.email,
                userId: userDb._id
            }, keys.jwtKey , {expiresIn: 60*60*2})

            res.status(200).json({
                token: `Bearer ${token}`
            })

        } else {
            // res.status(401).json({
            //     error: 'not found user'
            // })
            errorHandler(res, 401, 'not found user')
        }
    } else {
        // res.status(404).json({
        //     error: 'not found user'
        // })
        errorHandler(res, 404, 'not found user')
    }
}

module.exports.register = async (req, res) => {
    // res.status(201).json({
    //     method: 'register...',
    //     email: req.body.email,
    //     password: req.body.password
    // })
    const userDb = await User.findOne({ email: req.body.email })
    console.log(userDb)

    if (userDb) {
        // res.status(409).json({
        //     error: 'Error, email'
        // })
        errorHandler(res, 409, 'Error, email')
    } else  {

        const salt = bcrypt.genSaltSync(777)
        const passw = bcrypt.hashSync(req.body.password, salt)

        const newUser = new User({
            email: req.body.email,
            // password: req.body.password
            password: passw
        })

        try {
            await newUser.save()
            res.status(201).json(newUser)
            
        } catch (e) {
            // res.status(500).json({
            //     error: e.message ? e.message : 'error ...'
            // })
            errorHandler(res, 500, e)
        }
    }
}