const express = require('express');
const { listEPG, nowNext } = require('../controllers/epgController');
const router = express.Router();

// GET /api/epg
router.get('/', listEPG);

// GET /api/epg/nownext
router.get('/nownext', nowNext);

module.exports = router;
