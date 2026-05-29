const { TVChannel } = require('../models');

async function listChannels(req, res, next) {
  try {
    const channels = await TVChannel.findAll({ limit: 100, order: [['createdAt', 'DESC']] });
    res.json({ channels, total: channels.length });
  } catch (err) {
    next(err);
  }
}

async function getChannel(req, res, next) {
  try {
    const channel = await TVChannel.findByPk(req.params.id);
    if (!channel) {
      res.status(404);
      return next(new Error('Channel not found'));
    }
    res.json(channel);
  } catch (err) {
    next(err);
  }
}

module.exports = { listChannels, getChannel };
