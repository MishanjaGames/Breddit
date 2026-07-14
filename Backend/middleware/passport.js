const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt
const GoogleStrategy = require('passport-google-oauth20').Strategy
const FacebookStrategy = require('passport-facebook').Strategy

const User = require('../models/User')
const keys = require('../config/keys')
const { findOrCreateOAuthUser } = require('../utils/oauth')

const options = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: keys.jwtKey
}

module.exports = passport => {
    passport.use(
        new JwtStrategy(options, async (payload, done) => {
            try {
                const user = await User.findById(payload.userId).select('-password')

                if (user) {
                    return done(null, user)
                }

                return done(null, false)
            } catch (e) {
                return done(e, false)
            }
        })
    )

    // Google и Facebook стратегии регистрируются только если заданы реальные ключи —
    // иначе сервер упал бы при старте (passport-google-oauth20/passport-facebook требуют clientID/clientSecret)
    if (keys.google.clientId && keys.google.clientSecret) {
        passport.use(
            new GoogleStrategy(
                {
                    clientID: keys.google.clientId,
                    clientSecret: keys.google.clientSecret,
                    callbackURL: keys.google.callbackUrl
                },
                async (accessToken, refreshToken, profile, done) => {
                    try {
                        const user = await findOrCreateOAuthUser({
                            provider: 'google',
                            providerId: profile.id,
                            email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
                            displayName: profile.displayName
                        })
                        return done(null, user)
                    } catch (e) {
                        return done(e, false)
                    }
                }
            )
        )
    } else {
        console.warn('[oauth] Google OAuth disabled: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not set in .env')
    }

    if (keys.facebook.appId && keys.facebook.appSecret) {
        passport.use(
            new FacebookStrategy(
                {
                    clientID: keys.facebook.appId,
                    clientSecret: keys.facebook.appSecret,
                    callbackURL: keys.facebook.callbackUrl,
                    profileFields: ['id', 'displayName', 'emails']
                },
                async (accessToken, refreshToken, profile, done) => {
                    try {
                        const user = await findOrCreateOAuthUser({
                            provider: 'facebook',
                            providerId: profile.id,
                            email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
                            displayName: profile.displayName
                        })
                        return done(null, user)
                    } catch (e) {
                        return done(e, false)
                    }
                }
            )
        )
    } else {
        console.warn('[oauth] Facebook OAuth disabled: FACEBOOK_APP_ID/FACEBOOK_APP_SECRET not set in .env')
    }
}