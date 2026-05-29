const express = require('express');
const { listSeries, getSeries, listEpisodes } = require('../controllers/seriesController');
const router = express.Router();

// GET /api/series
router.get('/', listSeries);

// GET /api/series/:id
router.get('/:id', getSeries);

// GET /api/series/:id/episodes
router.get('/:id/episodes', listEpisodes);

module.exports = router;
