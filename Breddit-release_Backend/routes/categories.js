const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { categoryWriteLimiter } = require('../middleware/rateLimiter');
const categoryController = require('../controllers/categoryController');

// Публичные роуты (доступны без авторизации, персоналізовані якщо є токен)
router.get('/', optionalAuth, categoryController.getAllCategories);
router.get('/mine/subscribed', protect, categoryController.getMySubscriptions);
router.get('/:id', optionalAuth, categoryController.getCategoryById);

// Защищённые роуты (нужен JWT-токен)
router.post('/', protect, categoryWriteLimiter, categoryController.createCategory);
router.put('/:id', protect, categoryWriteLimiter, categoryController.updateCategory);
router.delete('/:id', protect, categoryController.deleteCategory);
router.post('/:id/subscribe', protect, categoryController.subscribe);
router.delete('/:id/subscribe', protect, categoryController.unsubscribe);

// Модерація спільноти
router.get('/:id/moderation-lists', protect, categoryController.getModerationLists);
router.post('/:id/ban/:userId', protect, categoryController.banUser);
router.delete('/:id/ban/:userId', protect, categoryController.unbanUser);
router.post('/:id/mute/:userId', protect, categoryController.muteUser);
router.delete('/:id/mute/:userId', protect, categoryController.unmuteUser);
router.post('/:id/moderators/:userId', protect, categoryController.addModerator);
router.delete('/:id/moderators/:userId', protect, categoryController.removeModerator);

module.exports = router;