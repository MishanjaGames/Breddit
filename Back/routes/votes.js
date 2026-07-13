const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const voteController = require('../controllers/voteController');

router.post('/', protect, voteController.vote);

module.exports = router;
