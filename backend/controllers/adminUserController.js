const bcrypt = require('bcryptjs');
const { User, Provider, DeviceLicense } = require('../models');
const { Op } = require('sequelize');

async function list(req, res, next) {
  try {
    const q = (req.query?.q || '').toString().trim();
    const where = q
      ? { [Op.or]: [{ email: { [Op.iLike]: `%${q}%` } }, { name: { [Op.iLike]: `%${q}%` } }] }
      : {};
    const users = await User.findAll({
      where,
      attributes: ['id', 'email', 'name', 'role', 'providerId', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    res.json(users);
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const { email, password, name, role, providerId } = req.body || {};
    if (!email || !password) {
      res.status(400); return next(new Error('email and password are required'));
    }
    const existing = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    if (existing) { res.status(409); return next(new Error('Email already in use')); }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.trim().toLowerCase(),
      passwordHash,
      name: name || null,
      role: ['user', 'admin', 'provider_admin'].includes(role) ? role : 'user',
      providerId: providerId || null,
    });
    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role, providerId: user.providerId });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name, role, providerId, password } = req.body || {};
    const user = await User.findByPk(id);
    if (!user) { res.status(404); return next(new Error('User not found')); }
    if (name !== undefined) user.name = name;
    if (role !== undefined && ['user', 'admin', 'provider_admin'].includes(role)) user.role = role;
    if (providerId !== undefined) user.providerId = providerId || null;
    if (password) user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, providerId: user.providerId });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) { res.status(404); return next(new Error('User not found')); }
    await user.destroy();
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function stats(req, res, next) {
  try {
    const [totalUsers, totalDevices, activeDevices, providers] = await Promise.all([
      User.count(),
      DeviceLicense.count(),
      DeviceLicense.count({ where: { status: 'active' } }),
      Provider.count(),
    ]);
    const now = new Date();
    const trialActive = await DeviceLicense.count({
      where: { plan: 'trial', status: 'active', trialEndsAt: { [Op.gt]: now } },
    });
    const paid = await DeviceLicense.count({
      where: { plan: { [Op.in]: ['yearly', 'lifetime'] }, status: 'active' },
    });
    res.json({ totalUsers, totalDevices, activeDevices, providers, trialActive, paid });
  } catch (e) { next(e); }
}

module.exports = { list, create, update, remove, stats };
