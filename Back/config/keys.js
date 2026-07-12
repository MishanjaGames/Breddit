// Secrets are read from environment variables; the hardcoded values are
// local-dev fallbacks only and must not be used in production.
require('dotenv').config();

module.exports = {
    mongoUrl: process.env.MONGO_URL || 'mongodb+srv://mishanja:qwerty123@cluster0.oewbabf.mongodb.net/?appName=Cluster0',
    jwtKey: process.env.JWT_SECRET || '777',
    // куда редиректить браузер после успешного OAuth-логина (адрес фронтенда)
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || null,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || null,
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback'
    },
    facebook: {
        appId: process.env.FACEBOOK_APP_ID || null,
        appSecret: process.env.FACEBOOK_APP_SECRET || null,
        callbackUrl: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:4000/api/auth/facebook/callback'
    }
}