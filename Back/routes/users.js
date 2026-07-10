const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/:nickname', userController.getByNickname);

module.exports = router;