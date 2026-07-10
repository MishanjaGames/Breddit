const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { validatePost } = require('../middleware/validate');
const postController = require('../controllers/postController');

// Публичные роуты (персоналізовані якщо є токен: myVote, isSaved, feed=home)
router.get('/', optionalAuth, postController.getAllPosts);
router.get('/mine/saved', protect, postController.getSavedPosts);
router.get('/category/:categoryId', optionalAuth, postController.getPostsByCategory);
router.get('/:id', optionalAuth, postController.getPostById);

// Защищённые роуты
router.post('/', protect, validatePost, postController.createPost);
router.put('/:id', protect, postController.updatePost);
router.delete('/:id', protect, postController.deletePost);
router.post('/:id/save', protect, postController.savePost);
router.delete('/:id/save', protect, postController.unsavePost);

module.exports = router;
