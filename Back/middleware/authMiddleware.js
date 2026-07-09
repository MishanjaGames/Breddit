const passport = require('passport');

// Проверяет JWT из заголовка Authorization: Bearer <token>
// Если токен валиден — кладёт юзера в req.user и пропускает дальше
// Если нет — возвращает 401
exports.protect = passport.authenticate('jwt', { session: false });