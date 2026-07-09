const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const postController = require('../controllers/postController');

// Публичные роуты
router.get('/', postController.getAllPosts);
router.get('/category/:categoryId', postController.getPostsByCategory);
router.get('/:id', postController.getPostById);

// Защищённые роуты
router.post('/', protect, postController.createPost);
router.put('/:id', protect, postController.updatePost);
router.delete('/:id', protect, postController.deletePost);

module.exports = router;