const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/generateToken');
const { User } = require('../models');

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { email, password, name, providerId } = req.body || {};
    if (!email || !password) {
      res.status(400);
      return next(new Error('Email and password are required'));
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      res.status(409);
      return next(new Error('Email already in use'));
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, name, providerId });
    const token = generateToken({ id: user.id, role: user.role || 'user' });
    return res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login — accepts { username, password } (username is the account email)
async function login(req, res, next) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      res.status(400);
      return next(new Error('Username and password are required'));
    }
    const user = await User.findOne({ where: { email: username.trim() } });
    if (!user) {
      res.status(401);
      return next(new Error('Invalid credentials'));
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401);
      return next(new Error('Invalid credentials'));
    }
    const token = generateToken({ id: user.id, role: user.role || 'user' });
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
