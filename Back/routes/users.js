const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { uploadAvatar } = require('../middleware/upload');
const userController = require('../controllers/userController');

// ВАЖНО: этот роут должен стоять раньше '/:nickname', иначе Express
// примет 'me' за никнейм и запрос уйдёт не туда
router.put('/me/avatar', protect, uploadAvatar, userController.updateAvatar);
router.delete('/me/avatar', protect, userController.deleteAvatar);

router.get('/:nickname', userController.getByNickname);

module.exports = router;