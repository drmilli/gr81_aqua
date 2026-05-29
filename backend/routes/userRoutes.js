const express = require('express');
const { auth } = require('../middleware/authMiddleware');
const { getMe } = require('../controllers/userController');
const router = express.Router();

// GET /api/users/me
router.get('/me', auth, getMe);

module.exports = router;
