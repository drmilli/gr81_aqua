const express = require('express');
const { listChannels, getChannel } = require('../controllers/tvController');
const router = express.Router();

// GET /api/tv
router.get('/', listChannels);

// GET /api/tv/:id
router.get('/:id', getChannel);

module.exports = router;
