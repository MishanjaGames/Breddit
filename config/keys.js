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
    },
    azureStorage: {
        connectionString: required('AZURE_STORAGE_CONNECTION_STRING'),
        // один контейнер на аватарки и банеры, они лежат в нём под префиксами avatars/ и banners/
        containerName: process.env.AZURE_STORAGE_CONTAINER || 'avatars'
    },
    // ---------- Почта ----------
    // EmailJS: один общий шаблон (template_id) используется для всех видов писем,
    // конкретный "тип" письма определяется параметрами (subject/title/message), см. utils/email.js
    emailjs: {
        serviceId: process.env.EMAILJS_SERVICE_ID || null,
        templateId: process.env.EMAILJS_TEMPLATE_ID || null,
        publicKey: process.env.EMAILJS_PUBLIC_KEY || null,
        privateKey: process.env.EMAILJS_PRIVATE_KEY || null
    },
    // SMTP — резервный вариант отправки почты, если EmailJS не настроен/недоступен
    smtp: {
        host: process.env.SMTP_HOST || null,
        port: Number(process.env.SMTP_PORT || 587),
        user: process.env.SMTP_USER || null,
        pass: process.env.SMTP_PASS || null,
        from: process.env.SMTP_FROM || 'no-reply@breddit.local'
    }
}