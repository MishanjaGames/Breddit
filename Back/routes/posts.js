const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { validatePost } = require('../middleware/validate');
const { uploadMedia } = require('../middleware/mediaUpload');
const postController = require('../controllers/postController');

// Публичные роуты (персоналізовані якщо є токен: myVote, isSaved, feed=home)
router.get('/', optionalAuth, postController.getAllPosts);
router.get('/mine/saved', protect, postController.getSavedPosts);
router.get('/category/:categoryId', optionalAuth, postController.getPostsByCategory);
router.get('/:id', optionalAuth, postController.getPostById);

// Защищённые роуты
// uploadMedia стоит ДО validatePost: multer парсит multipart/form-data и кладёт текстовые поля в req.body
router.post('/', protect, uploadMedia, validatePost, postController.createPost);
router.put('/:id', protect, uploadMedia, postController.updatePost);
router.delete('/:id', protect, postController.deletePost);
router.post('/:id/save', protect, postController.savePost);
router.delete('/:id/save', protect, postController.unsavePost);

module.exports = router;