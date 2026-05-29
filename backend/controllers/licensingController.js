const Stripe = require('stripe');
const { DeviceLicense } = require('../models');

function getDeviceId(req) {
  const header = req.headers['x-device-id'];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  return (fromHeader || req.query?.deviceId || req.body?.deviceId || '').toString().trim();
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function getOrCreateLicense({ deviceId, platform }) {
  let lic = await DeviceLicense.findOne({ where: { deviceId } });
  if (lic) return lic;
  const now = new Date();
  lic = await DeviceLicense.create({
    deviceId,
    platform: platform || null,
    firstSeenAt: now,
    trialEndsAt: addDays(now, 7),
    plan: 'trial',
    status: 'active',
  });
  return lic;
}

function computeStatus(lic) {
  const now = new Date();
  if (lic.status === 'revoked') return { allowed: false, reason: 'revoked' };
  if (lic.plan === 'lifetime') return { allowed: true, reason: 'lifetime' };
  if (lic.plan === 'yearly' && lic.paidUntil && new Date(lic.paidUntil) > now) return { allowed: true, reason: 'paid' };
  if (lic.trialEndsAt && new Date(lic.trialEndsAt) > now) return { allowed: true, reason: 'trial' };
  return { allowed: false, reason: 'expired' };
}

async function status(req, res, next) {
  try {
    const deviceId = getDeviceId(req);
    if (!deviceId) {
      res.status(400);
      return next(new Error('deviceId is required'));
    }
    const platform = (req.headers['x-platform'] || req.body?.platform || req.query?.platform || '').toString().trim() || null;
    const lic = await getOrCreateLicense({ deviceId, platform });
    lic.lastCheckedAt = new Date();
    if (platform && !lic.platform) lic.platform = platform;
    await lic.save();

    const s = computeStatus(lic);
    res.json({
      allowed: s.allowed,
      reason: s.reason,
      plan: lic.plan,
      status: lic.status,
      firstSeenAt: lic.firstSeenAt,
      trialEndsAt: lic.trialEndsAt,
      paidUntil: lic.paidUntil,
      serverTime: new Date().toISOString(),
    });
  } catch (e) {
    next(e);
  }
}

async function checkout(req, res, next) {
  try {
    const deviceId = getDeviceId(req);
    const { plan } = req.body || {};
    if (!deviceId) {
      res.status(400);
      return next(new Error('deviceId is required'));
    }
    if (!['yearly', 'lifetime'].includes(plan)) {
      res.status(400);
      return next(new Error('plan must be yearly or lifetime'));
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    if (!stripeKey) {
      res.status(500);
      return next(new Error('Stripe is not configured'));
    }

    const platform = (req.headers['x-platform'] || req.body?.platform || '').toString().trim() || null;
    await getOrCreateLicense({ deviceId, platform });

    const stripe = Stripe(stripeKey, { apiVersion: '2024-06-20' });
    const amount = plan === 'yearly' ? 500 : 1000;
    const name = plan === 'yearly' ? 'GR81 Aqua Yearly Access' : 'GR81 Aqua Lifetime Access';
    const scheme = process.env.APP_SCHEME || 'gr81aqua';
    const successUrl = process.env.PAYMENT_SUCCESS_URL || `${scheme}://payment/success`;
    const cancelUrl = process.env.PAYMENT_CANCEL_URL || `${scheme}://payment/cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: amount,
            product_data: { name },
          },
        },
      ],
      metadata: { deviceId, plan },
      client_reference_id: deviceId,
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
    });

    res.status(201).json({ url: session.url });
  } catch (e) {
    next(e);
  }
}

module.exports = { status, checkout, computeStatus, getOrCreateLicense };

