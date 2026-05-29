const express = require('express');
const { auth } = require('../middleware/authMiddleware');
const { addToList, getMyList, removeFromList } = require('../controllers/myListController');
const router = express.Router();

// GET /api/mylist
router.get('/', auth, getMyList);

// POST /api/mylist
router.post('/', auth, addToList);

// DELETE /api/mylist/:id
router.delete('/:id', auth, removeFromList);

module.exports = router;
