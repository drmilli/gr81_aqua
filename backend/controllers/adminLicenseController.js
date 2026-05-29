const { Op } = require('sequelize');
const { DeviceLicense } = require('../models');
const { computeStatus, getOrCreateLicense } = require('./licensingController');

function getDeviceIdParam(req) {
  return (req.params?.deviceId || '').toString().trim();
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function list(req, res, next) {
  try {
    const q = (req.query?.q || '').toString().trim();
    const where = q ? { deviceId: { [Op.iLike]: `%${q}%` } } : {};
    const rows = await DeviceLicense.findAll({ where, order: [['updatedAt', 'DESC']], limit: 200 });
    res.json(rows.map(r => ({ ...r.toJSON(), computed: computeStatus(r) })));
  } catch (e) {
    next(e);
  }
}

async function getOne(req, res, next) {
  try {
    const deviceId = getDeviceIdParam(req);
    if (!deviceId) {
      res.status(400);
      return next(new Error('deviceId is required'));
    }
    const lic = await DeviceLicense.findOne({ where: { deviceId } });
    if (!lic) {
      res.status(404);
      return next(new Error('Not found'));
    }
    res.json({ ...lic.toJSON(), computed: computeStatus(lic) });
  } catch (e) {
    next(e);
  }
}

async function grant(req, res, next) {
  try {
    const deviceId = getDeviceIdParam(req);
    const { plan, days } = req.body || {};
    if (!deviceId) {
      res.status(400);
      return next(new Error('deviceId is required'));
    }
    if (!['yearly', 'lifetime'].includes(plan)) {
      res.status(400);
      return next(new Error('plan must be yearly or lifetime'));
    }
    const lic = await getOrCreateLicense({ deviceId, platform: null });
    lic.status = 'active';
    lic.plan = plan;
    if (plan === 'yearly') {
      const add = Number.isFinite(Number(days)) && Number(days) > 0 ? Number(days) : 365;
      const now = new Date();
      const from = lic.paidUntil && new Date(lic.paidUntil) > now ? new Date(lic.paidUntil) : now;
      lic.paidUntil = addDays(from, add);
    } else {
      lic.paidUntil = null;
    }
    await lic.save();
    res.json({ ...lic.toJSON(), computed: computeStatus(lic) });
  } catch (e) {
    next(e);
  }
}

async function revoke(req, res, next) {
  try {
    const deviceId = getDeviceIdParam(req);
    if (!deviceId) {
      res.status(400);
      return next(new Error('deviceId is required'));
    }
    const lic = await DeviceLicense.findOne({ where: { deviceId } });
    if (!lic) {
      res.status(404);
      return next(new Error('Not found'));
    }
    lic.status = 'revoked';
    await lic.save();
    res.json({ ...lic.toJSON(), computed: computeStatus(lic) });
  } catch (e) {
    next(e);
  }
}

module.exports = { list, getOne, grant, revoke };

