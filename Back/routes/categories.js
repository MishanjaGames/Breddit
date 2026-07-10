const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const categoryController = require('../controllers/categoryController');

// Публичные роуты (доступны без авторизации, персоналізовані якщо є токен)
router.get('/', optionalAuth, categoryController.getAllCategories);
router.get('/mine/subscribed', protect, categoryController.getMySubscriptions);
router.get('/:id', optionalAuth, categoryController.getCategoryById);

// Защищённые роуты (нужен JWT-токен)
router.post('/', protect, categoryController.createCategory);
router.put('/:id', protect, categoryController.updateCategory);
router.delete('/:id', protect, categoryController.deleteCategory);
router.post('/:id/subscribe', protect, categoryController.subscribe);
router.delete('/:id/subscribe', protect, categoryController.unsubscribe);

module.exports = router;
