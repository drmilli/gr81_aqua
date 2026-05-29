const express = require('express');
const path = require('path');

const router = express.Router();
const adminHtml = path.join(__dirname, 'admin.html');

router.get(['/', '/index.html'], (_req, res) => {
  res.sendFile(adminHtml);
});

module.exports = router;

