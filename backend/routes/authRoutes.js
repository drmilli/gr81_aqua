const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { register, login } = require('../controllers/authController');
const router = express.Router();

// Rate limiter
const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  validate([
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    body('name').optional().isString(),
    body('providerId').optional().isString(),
  ]),
  register
);

// POST /api/auth/login
router.post(
  '/login',
  validate([
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  login
);

module.exports = router;
