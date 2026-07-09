const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const categoryController = require('../controllers/categoryController');

// Публичные роуты (доступны без авторизации)
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

// Защищённые роуты (нужен JWT-токен)
router.post('/', protect, categoryController.createCategory);
router.put('/:id', protect, categoryController.updateCategory);
router.delete('/:id', protect, categoryController.deleteCategory);

module.exports = router;