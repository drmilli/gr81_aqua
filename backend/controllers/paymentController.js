const Stripe = require('stripe');
const { Subscription, Provider, DeviceLicense } = require('../models');

// POST /api/payments/stripe/checkout (stub)
async function createStripeCheckout(req, res, next) {
  try {
    // In a real implementation, call Stripe API with STRIPE_SECRET_KEY
    // and create a checkout session for the plan/provider.
    const { plan = 'basic', providerId = null } = req.body || {};
    if (!plan) { res.status(400); return next(new Error('plan is required')); }
    if (providerId) {
      const p = await Provider.findByPk(providerId);
      if (!p) { res.status(400); return next(new Error('Invalid providerId')); }
    }
    // Return a fake URL as placeholder
    return res.status(201).json({ url: 'https://checkout.stripe.com/pay/cs_test_placeholder' });
  } catch (err) { next(err); }
}

// POST /api/payments/stripe/webhook (stub)
async function stripeWebhook(req, res, next) {
  try {
    // Verify signature using raw body
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });
    let event;
    if (secret) {
      const sig = req.headers['stripe-signature'];
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } else {
      // Fallback if not configured
      event = JSON.parse(req.body.toString());
    }
    if (event?.type === 'checkout.session.completed') {
      const obj = event.data?.object || {};
      const deviceId = obj?.metadata?.deviceId;
      const plan = obj?.metadata?.plan;
      if (deviceId && (plan === 'yearly' || plan === 'lifetime')) {
        let lic = await DeviceLicense.findOne({ where: { deviceId } });
        const now = new Date();
        if (!lic) {
          lic = await DeviceLicense.create({
            deviceId,
            firstSeenAt: now,
            trialEndsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            plan: 'trial',
            status: 'active',
          });
        }
        lic.status = 'active';
        lic.plan = plan;
        if (plan === 'yearly') {
          const from = lic.paidUntil && new Date(lic.paidUntil) > now ? new Date(lic.paidUntil) : now;
          lic.paidUntil = new Date(from.getTime() + 365 * 24 * 60 * 60 * 1000);
        } else {
          lic.paidUntil = null;
        }
        await lic.save();
      }
    }

    const userId = event?.data?.object?.metadata?.userId;
    if (userId) {
      let sub = await Subscription.findOne({ where: { userId } });
      if (!sub) sub = await Subscription.create({ userId, plan: 'basic', status: 'active' });
      sub.status = 'active';
      await sub.save();
    }
    res.status(200).json({ received: true });
  } catch (err) { next(err); }
}

module.exports = { createStripeCheckout, stripeWebhook };
