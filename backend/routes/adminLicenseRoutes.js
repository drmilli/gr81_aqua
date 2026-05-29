const express = require('express');
const { auth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roles');
const rateLimit = require('express-rate-limit');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { list, getOne, grant, revoke } = require('../controllers/adminLicenseController');

const router = express.Router();

const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
const adminGuard = [auth, requireRole('admin')];

router.get('/', adminGuard, limiter, list);
router.get('/:deviceId', adminGuard, limiter, validate([param('deviceId').isString().notEmpty()]), getOne);
router.post(
  '/:deviceId/grant',
  adminGuard,
  limiter,
  validate([param('deviceId').isString().notEmpty(), body('plan').isString().notEmpty(), body('days').optional().isNumeric()]),
  grant
);
router.post('/:deviceId/revoke', adminGuard, limiter, validate([param('deviceId').isString().notEmpty()]), revoke);

module.exports = router;

