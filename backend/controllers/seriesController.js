const { Series, Episode } = require('../models');

async function listSeries(req, res, next) {
  try {
    const items = await Series.findAll({ limit: 50, order: [['createdAt', 'DESC']] });
    res.json({ items, total: items.length });
  } catch (err) {
    next(err);
  }
}

async function getSeries(req, res, next) {
  try {
    const item = await Series.findByPk(req.params.id);
    if (!item) {
      res.status(404);
      return next(new Error('Series not found'));
    }
    res.json(item);
  } catch (err) {
    next(err);
  }
}

async function listEpisodes(req, res, next) {
  try {
    if (!Episode) return res.json({ episodes: [] });
    const episodes = await Episode.findAll({ where: { seriesId: req.params.id }, order: [['season', 'ASC'], ['episodeNumber', 'ASC']] });
    res.json({ episodes, total: episodes.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { listSeries, getSeries, listEpisodes };
