const { User, Provider } = require('../models');

async function getMe(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'name', 'providerId'],
    });
    if (!user) {
      res.status(404);
      return next(new Error('User not found'));
    }

    let provider = null;
    if (user.providerId) {
      // providerId may be the Provider's code string or UUID
      provider = await Provider.findOne({
        where: { code: user.providerId },
        attributes: ['id', 'code', 'name', 'xtreamUrl', 'xtreamUsername', 'xtreamPassword', 'm3uUrl'],
      });
      if (!provider) {
        try {
          provider = await Provider.findByPk(user.providerId, {
            attributes: ['id', 'code', 'name', 'xtreamUrl', 'xtreamUsername', 'xtreamPassword', 'm3uUrl'],
          });
        } catch (_) {}
      }
    }

    res.json({ ...user.toJSON(), provider: provider ? provider.toJSON() : null });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe };
