const express = require('express');
const { auth } = require('../middleware/authMiddleware');
const { getMySubscription, upsertSubscription, cancelSubscription } = require('../controllers/subscriptionController');
const router = express.Router();

// GET /api/subscriptions/me
router.get('/me', auth, getMySubscription);

// POST /api/subscriptions
router.post('/', auth, upsertSubscription);

// DELETE /api/subscriptions
router.delete('/', auth, cancelSubscription);

module.exports = router;
