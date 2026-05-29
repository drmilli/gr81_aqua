const { Op } = require('sequelize');
const { EPGEvent } = require('../models');
const { getRedis } = require('../config/redis');

// GET /api/epg?channelId=&from=&to=
async function listEPG(req, res, next) {
  try {
    const { channelId, from, to } = req.query;
    if (!channelId) {
      res.status(400);
      return next(new Error('channelId is required'));
    }
    const where = { channelId };
    if (from || to) {
      where[Op.and] = [];
      if (from) where[Op.and].push({ endsAt: { [Op.gte]: new Date(from) } });
      if (to) where[Op.and].push({ startsAt: { [Op.lte]: new Date(to) } });
    }
    const events = await EPGEvent.findAll({ where, order: [['startsAt', 'ASC']], limit: 500 });
    res.json({ events, total: events.length });
  } catch (err) {
    next(err);
  }
}

// GET /api/epg/nownext?channelId=
async function nowNext(req, res, next) {
  try {
    const { channelId } = req.query;
    if (!channelId) {
      res.status(400);
      return next(new Error('channelId is required'));
    }
    const redis = getRedis();
    const cacheKey = `epg:nownext:${channelId}`;
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    }
    const now = new Date();
    const current = await EPGEvent.findOne({
      where: { channelId, startsAt: { [Op.lte]: now }, endsAt: { [Op.gte]: now } },
      order: [['startsAt', 'DESC']],
    });
    const nextEvent = await EPGEvent.findOne({
      where: { channelId, startsAt: { [Op.gte]: now } },
      order: [['startsAt', 'ASC']],
    });
    const payload = { now: current, next: nextEvent };
    if (redis) await redis.setex(cacheKey, 300, JSON.stringify(payload));
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

module.exports = { listEPG, nowNext };
