require('dotenv').config();

// Секреты читаются ТОЛЬКО из переменных окружения — реальные значения
// (connection string, JWT secret) никогда не должны попадать в код/репозиторий.
// Если переменная не задана — падаем сразу с понятной ошибкой, а не тихо
// используем небезопасный дефолт или чужую базу данных.
const required = (name) => {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`
        );
    }
    return value;
};

module.exports = {
    mongoUrl: required('MONGO_URL'),
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