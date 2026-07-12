const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { uploadAvatar, uploadUserBanner } = require('../middleware/upload');
const { avatarLimiter } = require('../middleware/rateLimiter');
const userController = require('../controllers/userController');

// ВАЖНО: этот роут должен стоять раньше '/:nickname', иначе Express
// примет 'me' за никнейм и запрос уйдёт не туда
// protect идёт первым, чтобы avatarLimiter мог считать лимит по req.user.id, а не по IP
router.put('/me', protect, userController.updateProfile);
router.put('/me/avatar', protect, avatarLimiter, uploadAvatar, userController.updateAvatar);
router.delete('/me/avatar', protect, avatarLimiter, userController.deleteAvatar);
router.put('/me/banner', protect, avatarLimiter, uploadUserBanner, userController.updateBanner);
router.delete('/me/banner', protect, avatarLimiter, userController.deleteBanner);
router.get('/resolve', userController.resolveByIds);

router.post('/:nickname/follow', protect, userController.followUser);
router.delete('/:nickname/follow', protect, userController.unfollowUser);
router.get('/:nickname/followers', userController.getFollowers);
router.get('/:nickname/following', userController.getFollowing);

// optionalAuth — чтобы isFollowing считался, если токен передан, но профиль оставался публичным без него
router.get('/:nickname', optionalAuth, userController.getByNickname);

module.exports = router;