const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { validateComment } = require('../middleware/validate');
const commentController = require('../controllers/commentController');

// Публичные роуты (персоналізовані якщо є токен: myVote)
router.get('/post/:postId', optionalAuth, commentController.getCommentsByPost);
router.get('/:id', optionalAuth, commentController.getCommentById);

// Защищённые роуты
router.post('/', protect, validateComment, commentController.createComment);
router.put('/:id', protect, commentController.updateComment);
router.delete('/:id', protect, commentController.deleteComment);

module.exports = router;
