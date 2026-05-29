const { Movie } = require('../models');

async function listMovies(req, res, next) {
  try {
    const items = await Movie.findAll({ limit: 50, order: [['createdAt', 'DESC']] });
    res.json({ items, total: items.length });
  } catch (err) {
    next(err);
  }
}

async function getMovie(req, res, next) {
  try {
    const item = await Movie.findByPk(req.params.id);
    if (!item) {
      res.status(404);
      return next(new Error('Movie not found'));
    }
    res.json(item);
  } catch (err) {
    next(err);
  }
}

module.exports = { listMovies, getMovie };
