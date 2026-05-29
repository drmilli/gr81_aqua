const { User } = require('../models');

async function getMe(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'name', 'providerId'],
    });
    if (!user) {
      res.status(404);
      return next(new Error('User not found'));
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe };
