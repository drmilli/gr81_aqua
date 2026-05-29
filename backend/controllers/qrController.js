const { v4: uuidv4 } = require('uuid');
const { QRSession } = require('../models');

// POST /api/qr/generate
async function generate(req, res, next) {
  try {
    const code = uuidv4().split('-')[0];
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const session = await QRSession.create({ code, status: 'pending', expiresAt });
    res.status(201).json({ code: session.code, expiresAt: session.expiresAt });
  } catch (err) {
    next(err);
  }
}

// POST /api/qr/verify { code }
async function verify(req, res, next) {
  try {
    const { code } = req.body || {};
    if (!code) {
      res.status(400);
      return next(new Error('Code is required'));
    }
    const session = await QRSession.findOne({ where: { code } });
    if (!session || session.expiresAt < new Date()) {
      res.status(400);
      return next(new Error('Invalid or expired code'));
    }
    // Simulate verification – attach user if already authenticated
    if (req.user?.id) {
      session.userId = req.user.id;
    }
    session.status = 'verified';
    await session.save();
    res.json({ status: 'verified', userId: session.userId || null });
  } catch (err) {
    next(err);
  }
}

module.exports = { generate, verify };
