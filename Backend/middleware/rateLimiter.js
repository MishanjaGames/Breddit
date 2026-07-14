const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

exports.authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' }
});

// базовый кулдаун на загрузку/удаление аватарки: до 5 запросов за 10 секунд
// на одного пользователя (защита от спама аплоадами, но не мешает штатной
// последовательности upload -> replace -> delete в рамках одной сессии)
exports.avatarLimiter = rateLimit({
    windowMs: 10 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req.user ? req.user.id : ipKeyGenerator(req.ip)),
    message: { success: false, message: 'Занадто часті запити. Спробуйте ще раз через пару секунд.' }
});

// ліміт на створення/редагування спільнот: захист від спаму POST/PUT /categories
exports.categoryWriteLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req.user ? req.user.id : ipKeyGenerator(req.ip)),
    message: { success: false, message: 'Занадто часті зміни спільноти. Спробуйте пізніше.' }
});

// ліміт на редагування профілю (PUT /users/me): захист від спаму зміною нікнейму/статусу
exports.profileLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req.user ? req.user.id : ipKeyGenerator(req.ip)),
    message: { success: false, message: 'Занадто часті зміни профілю. Спробуйте пізніше.' }
});