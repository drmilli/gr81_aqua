const { MyList, Movie, Series } = require('../models');

async function addToList(req, res, next) {
  try {
    const { itemType, itemId } = req.body || {};
    if (!itemType || !['movie', 'series'].includes(itemType) || !itemId) {
      res.status(400);
      return next(new Error('itemType (movie|series) and itemId are required'));
    }
    const exists = await MyList.findOne({ where: { userId: req.user.id, itemType, itemId } });
    if (exists) return res.status(200).json(exists);
    const row = await MyList.create({ userId: req.user.id, itemType, itemId });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

async function getMyList(req, res, next) {
  try {
    const items = await MyList.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] });
    res.json({ items, total: items.length });
  } catch (err) {
    next(err);
  }
}

async function removeFromList(req, res, next) {
  try {
    const { id } = req.params;
    const row = await MyList.findOne({ where: { id, userId: req.user.id } });
    if (!row) {
      res.status(404);
      return next(new Error('Item not found in your list'));
    }
    await row.destroy();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { addToList, getMyList, removeFromList };
