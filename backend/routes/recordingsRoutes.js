const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { list, start, stop, download } = require('../controllers/recordingsController');

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60 });

router.get('/', limiter, list);
router.post('/start', limiter, validate([body('streamUrl').isString().notEmpty(), body('title').optional().isString()]), start);
router.post('/:id/stop', limiter, validate([param('id').isString().notEmpty()]), stop);
router.get('/:id/download', limiter, validate([param('id').isString().notEmpty()]), download);

module.exports = router;

