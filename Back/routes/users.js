const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { uploadAvatar } = require('../middleware/upload');
const { avatarLimiter } = require('../middleware/rateLimiter');
const userController = require('../controllers/userController');

// ВАЖНО: этот роут должен стоять раньше '/:nickname', иначе Express
// примет 'me' за никнейм и запрос уйдёт не туда
// protect идёт первым, чтобы avatarLimiter мог считать лимит по req.user.id, а не по IP
router.put('/me/avatar', protect, avatarLimiter, uploadAvatar, userController.updateAvatar);
router.delete('/me/avatar', protect, avatarLimiter, userController.deleteAvatar);

router.get('/:nickname', userController.getByNickname);

module.exports = router;