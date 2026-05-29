const express = require('express');
const { listMovies, getMovie } = require('../controllers/movieController');
const router = express.Router();

// GET /api/movies
router.get('/', listMovies);

// GET /api/movies/:id
router.get('/:id', getMovie);

module.exports = router;
