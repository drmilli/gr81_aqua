const express = require('express');
const router = express.Router();
const { pool } = require('../services/portalsDb');

// Normalize base URL by stripping trailing slashes
function normalize(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

// GET /portals (mobile) and /api/portals (admin/ui)
router.get(['/', '/'], async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, base_url AS "baseUrl", primary_flag AS "primary" FROM portals ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    console.error('[GET /portals] Error:', e);
    res.status(500).json({ error: 'Failed to fetch portals' });
  }
});

// POST /portals
router.post(['/', '/'], async (req, res) => {
  try {
    const { name, baseUrl, primary } = req.body || {};
    if (!baseUrl) return res.status(400).json({ error: 'baseUrl required' });
    const normalized = normalize(baseUrl);
    const { rows } = await pool.query(
      'INSERT INTO portals (name, base_url, primary_flag) VALUES ($1,$2,$3) RETURNING id, name, base_url AS "baseUrl", primary_flag AS "primary"',
      [name || null, normalized, !!primary]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('[POST /portals] Error:', e);
    if (e?.code === '23505') {
      return res.status(409).json({ error: 'A portal with this Base URL already exists' });
    }
    res.status(500).json({ error: 'Failed to create portal' });
  }
});

// PUT /portals/:id
router.put(['/:id', '/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const { name, baseUrl, primary } = req.body || {};
    const normalized = typeof baseUrl === 'string' ? normalize(baseUrl) : null;
    const { rows } = await pool.query(
      'UPDATE portals SET name = COALESCE($1, name), base_url = COALESCE($2, base_url), primary_flag = COALESCE($3, primary_flag) WHERE id = $4 RETURNING id, name, base_url AS "baseUrl", primary_flag AS "primary"',
      [name ?? null, normalized ?? null, typeof primary === 'boolean' ? primary : null, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('[PUT /portals/:id] Error:', e);
    if (e?.code === '23505') {
      return res.status(409).json({ error: 'A portal with this Base URL already exists' });
    }
    res.status(500).json({ error: 'Failed to update portal' });
  }
});

// DELETE /portals/:id
router.delete(['/:id', '/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query('DELETE FROM portals WHERE id = $1', [id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /portals/:id] Error:', e);
    res.status(500).json({ error: 'Failed to delete portal' });
  }
});

module.exports = router;
