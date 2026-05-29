const jwt = require('jsonwebtoken');

function generateToken(payload, options = {}) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not set');
  const signOptions = { expiresIn: '7d', ...options };
  return jwt.sign(payload, secret, signOptions);
}

module.exports = { generateToken };
