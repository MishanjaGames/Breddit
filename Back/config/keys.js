require('dotenv').config();

// Secrets must come from environment variables (.env locally, dashboard env
// vars in production). No real credentials are hardcoded here — if a
// required variable is missing, the app fails fast instead of silently
// falling back to some default that could point at a shared/real database.
const required = (name, fallback) => {
    const value = process.env[name] ?? fallback;
    if (value === undefined) {
        throw new Error(`Missing required environment variable: ${name}. Copy .env.example to .env and fill it in.`);
    }
    return value;
};

module.exports = {
    mongoUrl: required('MONGO_URL', 'mongodb://localhost:27017/Breddit'),
    jwtKey: required('JWT_SECRET'),
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