const { Movie, Series, Episode, TVChannel } = require('../models');

// Movies
async function createMovie(req, res, next) {
  try {
    const { title, description = null, posterUrl = null, hlsUrl = null, category = null, tags = [], providerId = null } = req.body || {};
    if (!title) { res.status(400); return next(new Error('title is required')); }
    const movie = await Movie.create({ title, description, posterUrl, hlsUrl, category, tags, providerId });
    res.status(201).json(movie);
  } catch (err) { next(err); }
}

async function updateMovie(req, res, next) {
  try {
    const { id } = req.params;
    const movie = await Movie.findByPk(id);
    if (!movie) { res.status(404); return next(new Error('Movie not found')); }
    const fields = ['title','description','posterUrl','hlsUrl','category','tags','providerId'];
    for (const f of fields) if (req.body[f] !== undefined) movie[f] = req.body[f];
    await movie.save();
    res.json(movie);
  } catch (err) { next(err); }
}

async function deleteMovie(req, res, next) {
  try {
    const { id } = req.params;
    const movie = await Movie.findByPk(id);
    if (!movie) { res.status(404); return next(new Error('Movie not found')); }
    await movie.destroy();
    res.json({ success: true });
  } catch (err) { next(err); }
}

// Series
async function createSeries(req, res, next) {
  try {
    const { title, description = null, posterUrl = null, category = null, tags = [], providerId = null } = req.body || {};
    if (!title) { res.status(400); return next(new Error('title is required')); }
    const s = await Series.create({ title, description, posterUrl, category, tags, providerId });
    res.status(201).json(s);
  } catch (err) { next(err); }
}

async function updateSeries(req, res, next) {
  try {
    const { id } = req.params;
    const s = await Series.findByPk(id);
    if (!s) { res.status(404); return next(new Error('Series not found')); }
    const fields = ['title','description','posterUrl','category','tags','providerId'];
    for (const f of fields) if (req.body[f] !== undefined) s[f] = req.body[f];
    await s.save();
    res.json(s);
  } catch (err) { next(err); }
}

async function deleteSeries(req, res, next) {
  try {
    const { id } = req.params;
    const s = await Series.findByPk(id);
    if (!s) { res.status(404); return next(new Error('Series not found')); }
    await s.destroy();
    res.json({ success: true });
  } catch (err) { next(err); }
}

// Episodes
async function addEpisode(req, res, next) {
  try {
    const { id } = req.params; // seriesId
    const { season = 1, episodeNumber = 1, title, description = null, hlsUrl = null } = req.body || {};
    if (!title) { res.status(400); return next(new Error('title is required')); }
    if (!Episode) return res.status(501).json({ message: 'Episodes not supported in this build' });
    const ep = await Episode.create({ seriesId: id, season, episodeNumber, title, description, hlsUrl });
    res.status(201).json(ep);
  } catch (err) { next(err); }
}

// TV Channels
async function createChannel(req, res, next) {
  try {
    const { name, logoUrl = null, hlsUrl = null, category = null, epgId = null, providerId = null } = req.body || {};
    if (!name) { res.status(400); return next(new Error('name is required')); }
    const ch = await TVChannel.create({ name, logoUrl, hlsUrl, category, epgId, providerId });
    res.status(201).json(ch);
  } catch (err) { next(err); }
}

async function updateChannel(req, res, next) {
  try {
    const { id } = req.params;
    const ch = await TVChannel.findByPk(id);
    if (!ch) { res.status(404); return next(new Error('Channel not found')); }
    const fields = ['name','logoUrl','hlsUrl','category','epgId','providerId'];
    for (const f of fields) if (req.body[f] !== undefined) ch[f] = req.body[f];
    await ch.save();
    res.json(ch);
  } catch (err) { next(err); }
}

async function deleteChannel(req, res, next) {
  try {
    const { id } = req.params;
    const ch = await TVChannel.findByPk(id);
    if (!ch) { res.status(404); return next(new Error('Channel not found')); }
    await ch.destroy();
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { createMovie, updateMovie, deleteMovie, createSeries, updateSeries, deleteSeries, addEpisode, createChannel, updateChannel, deleteChannel };
