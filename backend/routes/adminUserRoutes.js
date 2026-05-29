const express = require('express');
const { auth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roles');
const { list, create, update, remove, stats } = require('../controllers/adminUserController');

const router = express.Router();
const admin = [auth, requireRole('admin')];

router.get('/stats',  ...admin, stats);
router.get('/',       ...admin, list);
router.post('/',      ...admin, create);
router.put('/:id',    ...admin, update);
router.delete('/:id', ...admin, remove);

module.exports = router;
