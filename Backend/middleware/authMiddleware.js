const passport = require('passport');

// Проверяет JWT из заголовка Authorization: Bearer <token>
// Если токен валиден — кладёт юзера в req.user и пропускает дальше
// Если нет — возвращает 401
exports.protect = passport.authenticate('jwt', { session: false });

// Как protect, но не блокирует запрос если токена нет/невалидный —
// просто req.user остаётся undefined. Для публичных роутов, которые
// хотят персонализировать ответ (isSubscribed, myVote) когда юзер залогинен.
exports.optionalAuth = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user) => {
        if (user) req.user = user;
        next();
    })(req, res, next);
};