const { Profile } = require('../models');

async function listProfiles(req, res, next) {
  try {
    const profiles = await Profile.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] });
    res.json(profiles);
  } catch (err) {
    next(err);
  }
}

async function createProfile(req, res, next) {
  try {
    const { name = 'Profile', avatar = null } = req.body || {};
    const profile = await Profile.create({ name, avatar, userId: req.user.id });
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
}

module.exports = { listProfiles, createProfile };
