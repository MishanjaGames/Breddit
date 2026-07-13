const crypto = require('crypto');
const User = require('../models/User');

const PROVIDER_FIELDS = {
    google: 'googleId',
    facebook: 'facebookId'
};

// подбирает свободный никнейм на основе имени/email из OAuth-профиля
const generateUniqueNickname = async (base) => {
    let candidate = (base || 'user').toString().trim().replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
    if (candidate.length < 3) candidate = candidate.padEnd(3, '0');
    if (!candidate) candidate = 'user';

    let nickname = candidate;
    let attempt = 0;
    while (await User.findOne({ nickname })) {
        attempt += 1;
        nickname = `${candidate}${crypto.randomInt(1000, 9999)}`;
        if (attempt > 10) break;
    }
    return nickname;
};

/**
 * Находит существующего юзера по OAuth-профилю либо создаёт нового.
 * Если локальный аккаунт с таким email уже есть — привязывает провайдера к нему.
 */
exports.findOrCreateOAuthUser = async ({ provider, providerId, email, displayName }) => {
    const field = PROVIDER_FIELDS[provider];
    if (!field) throw new Error(`Unknown OAuth provider: ${provider}`);

    let user = await User.findOne({ [field]: providerId });
    if (user) return user;

    if (email) {
        user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
            user[field] = providerId;
            await user.save();
            return user;
        }
    }

    const nickname = await generateUniqueNickname(displayName || (email ? email.split('@')[0] : 'user'));

    user = new User({
        nickname,
        email: email ? email.toLowerCase() : `${provider}_${providerId}@no-email.oauth`,
        [field]: providerId
    });

    await user.save();
    return user;
};