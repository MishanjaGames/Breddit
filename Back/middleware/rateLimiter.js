const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

exports.authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' }
});

// базовый кулдаун на загрузку/удаление аватарки: не чаще 1 запроса в 2 секунды
// на одного пользователя (защита от спама аплоадами/дискового I/O)
exports.avatarLimiter = rateLimit({
    windowMs: 2 * 1000,
    max: 1,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req.user ? req.user.id : ipKeyGenerator(req.ip)),
    message: { success: false, message: 'Занадто часті запити. Спробуйте ще раз через пару секунд.' }
});