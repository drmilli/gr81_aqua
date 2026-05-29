const express = require('express');
const { auth } = require('../middleware/authMiddleware');
const { generate, verify } = require('../controllers/qrController');
const router = express.Router();

// Generate QR session (no auth required)
router.post('/generate', generate);

// Verify QR session, optionally attaching current user if token provided
router.post('/verify', authOptional, verify);

// Minimal optional auth wrapper: proceeds if token valid, else continues without user
function authOptional(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next();
  return auth(req, res, next);
}

module.exports = router;
