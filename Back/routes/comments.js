const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { validateComment } = require('../middleware/validate');
const { uploadMedia } = require('../middleware/mediaUpload');
const commentController = require('../controllers/commentController');

// Публичные роуты (персоналізовані якщо є токен: myVote)
router.get('/post/:postId', optionalAuth, commentController.getCommentsByPost);
router.get('/:id', optionalAuth, commentController.getCommentById);

// Защищённые роуты
// uploadMedia стоит ДО validateComment: multer парсит multipart/form-data и кладёт текстовые поля в req.body
router.post('/', protect, uploadMedia, validateComment, commentController.createComment);
router.put('/:id', protect, uploadMedia, commentController.updateComment);
router.delete('/:id', protect, commentController.deleteComment);

module.exports = router;