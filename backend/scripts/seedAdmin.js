require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models');
const { generateToken } = require('../utils/generateToken');

async function main() {
  try {
    await sequelize.authenticate();
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync();
    }

    const email = process.env.ADMIN_EMAIL || 'admin@gr81aqua.local';
    const password = process.env.ADMIN_PASSWORD || 'Admin123!';

    let user = await User.findOne({ where: { email } });
    const passwordHash = await bcrypt.hash(password, 10);
    if (!user) {
      user = await User.create({ email, passwordHash, role: 'admin', name: 'Admin User' });
      console.log(`Created admin user: ${email}`);
    } else {
      user.role = 'admin';
      user.passwordHash = passwordHash;
      await user.save();
      console.log(`Updated admin user: ${email}`);
    }

    const token = generateToken({ id: user.id, role: user.role || 'admin' });
    console.log('ADMIN_EMAIL=' + email);
    console.log('ADMIN_PASSWORD=' + password);
    console.log('ADMIN_JWT=' + token);
    process.exit(0);
  } catch (err) {
    console.error('seedAdmin failed:', err);
    process.exit(1);
  }
}

main();
