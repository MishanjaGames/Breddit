const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const commentController = require('../controllers/commentController');

// Публичные роуты
router.get('/post/:postId', commentController.getCommentsByPost);
router.get('/:id', commentController.getCommentById);

// Защищённые роуты
router.post('/', protect, commentController.createComment);
router.put('/:id', protect, commentController.updateComment);
router.delete('/:id', protect, commentController.deleteComment);

module.exports = router;