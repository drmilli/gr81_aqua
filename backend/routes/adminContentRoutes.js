const express = require('express');
const { auth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roles');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const {
  createMovie,
  updateMovie,
  deleteMovie,
  createSeries,
  updateSeries,
  deleteSeries,
  addEpisode,
  createChannel,
  updateChannel,
  deleteChannel,
} = require('../controllers/adminContentController');

const router = express.Router();

// Admin/provider-admin only
const adminGuard = [auth, requireRole('admin', 'provider_admin')];

// Movies
router.post(
  '/movies',
  adminGuard,
  validate([body('title').isString().notEmpty()]),
  createMovie
);
router.patch(
  '/movies/:id',
  adminGuard,
  validate([param('id').isString().notEmpty()]),
  updateMovie
);
router.delete(
  '/movies/:id',
  adminGuard,
  validate([param('id').isString().notEmpty()]),
  deleteMovie
);

// Series
router.post(
  '/series',
  adminGuard,
  validate([body('title').isString().notEmpty()]),
  createSeries
);
router.patch(
  '/series/:id',
  adminGuard,
  validate([param('id').isString().notEmpty()]),
  updateSeries
);
router.delete(
  '/series/:id',
  adminGuard,
  validate([param('id').isString().notEmpty()]),
  deleteSeries
);

// Episodes for a series
router.post(
  '/series/:id/episodes',
  adminGuard,
  validate([param('id').isString().notEmpty(), body('title').isString().notEmpty()]),
  addEpisode
);

// TV Channels
router.post(
  '/channels',
  adminGuard,
  validate([body('name').isString().notEmpty()]),
  createChannel
);
router.patch(
  '/channels/:id',
  adminGuard,
  validate([param('id').isString().notEmpty()]),
  updateChannel
);
router.delete(
  '/channels/:id',
  adminGuard,
  validate([param('id').isString().notEmpty()]),
  deleteChannel
);

module.exports = router;
