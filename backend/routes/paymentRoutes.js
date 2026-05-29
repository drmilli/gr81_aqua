const express = require('express');
const rateLimit = require('express-rate-limit');
const { createStripeCheckout, stripeWebhook } = require('../controllers/paymentController');
const router = express.Router();

// Rate limiters
const checkoutLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
const webhookLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });

// Create a Stripe checkout session (stub)
router.post('/stripe/checkout', checkoutLimiter, createStripeCheckout);

// Stripe webhook receiver (raw body mounted in app.js)
router.post('/stripe/webhook', webhookLimiter, stripeWebhook);

module.exports = router;
