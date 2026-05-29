const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { status, checkout } = require('../controllers/licensingController');

const router = express.Router();

const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });

router.get('/status', limiter, status);
router.post(
  '/checkout',
  limiter,
  validate([body('plan').isString().notEmpty()]),
  checkout
);

module.exports = router;

