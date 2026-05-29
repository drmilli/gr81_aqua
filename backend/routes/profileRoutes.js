const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { auth } = require('../middleware/authMiddleware');
const { listProfiles, createProfile } = require('../controllers/profileController');
const router = express.Router();

const profileLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });

// GET /api/profiles
router.get('/', auth, profileLimiter, listProfiles);

// POST /api/profiles
router.post('/', auth, profileLimiter, validate([body('name').optional().isString()]), createProfile);

module.exports = router;
