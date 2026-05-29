const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { createProvider, updateProvider, listProviders, ingestM3U, ingestXMLTV } = require('../controllers/providerController');
const router = express.Router();

const lim = rateLimit({ windowMs: 60 * 1000, max: 60 });

const providerFields = [
  body('name').optional().isString(),
  body('m3uUrl').optional({ nullable: true }).isString(),
  body('xtreamUrl').optional({ nullable: true }).isString(),
  body('xtreamUsername').optional({ nullable: true }).isString(),
  body('xtreamPassword').optional({ nullable: true }).isString(),
  body('xmltvUrl').optional({ nullable: true }).isString(),
];

// GET /api/providers
router.get('/', lim, listProviders);

// POST /api/providers
router.post('/', lim, validate([
  body('code').isString().notEmpty().withMessage('code is required'),
  body('name').isString().notEmpty().withMessage('name is required'),
  ...providerFields,
]), createProvider);

// PUT or PATCH /api/providers/:id  (admin sends PUT)
router.put('/:id',   lim, validate([param('id').isString().notEmpty(), ...providerFields]), updateProvider);
router.patch('/:id', lim, validate([param('id').isString().notEmpty(), ...providerFields]), updateProvider);

// Ingest routes
router.post('/:id/ingest/m3u',   lim, validate([param('id').isString().notEmpty(), body('url').optional().isString()]), ingestM3U);
router.post('/:id/ingest/xmltv', lim, validate([param('id').isString().notEmpty(), body('url').optional().isString()]), ingestXMLTV);

module.exports = router;
