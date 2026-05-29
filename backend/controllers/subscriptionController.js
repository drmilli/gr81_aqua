const { Subscription } = require('../models');

// GET /api/subscriptions/me
async function getMySubscription(req, res, next) {
  try {
    const sub = await Subscription.findOne({ where: { userId: req.user.id }, order: [['updatedAt', 'DESC']] });
    res.json(sub || null);
  } catch (err) {
    next(err);
  }
}

// POST /api/subscriptions { plan, providerId }
// Upsert simple subscription state for MVP (no payment gateway yet)
async function upsertSubscription(req, res, next) {
  try {
    const { plan = 'basic', providerId = null, status = 'active', currentPeriodEnd = null } = req.body || {};
    let sub = await Subscription.findOne({ where: { userId: req.user.id } });
    if (!sub) {
      sub = await Subscription.create({ userId: req.user.id, providerId, plan, status, currentPeriodEnd });
    } else {
      sub.plan = plan;
      if (providerId !== undefined) sub.providerId = providerId;
      if (status !== undefined) sub.status = status;
      if (currentPeriodEnd !== undefined) sub.currentPeriodEnd = currentPeriodEnd;
      await sub.save();
    }
    res.status(201).json(sub);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/subscriptions (cancel)
async function cancelSubscription(req, res, next) {
  try {
    const sub = await Subscription.findOne({ where: { userId: req.user.id } });
    if (!sub) {
      res.status(404);
      return next(new Error('No active subscription'));
    }
    sub.status = 'canceled';
    await sub.save();
    res.json(sub);
  } catch (err) {
    next(err);
  }
}

module.exports = { getMySubscription, upsertSubscription, cancelSubscription };
