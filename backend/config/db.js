const { Sequelize } = require('sequelize');
const { DATABASE_URL, NODE_ENV } = process.env;

const sequelize = new Sequelize(DATABASE_URL || '', {
  dialect: 'postgres',
  logging: false,
});

async function connectDB() {
  if (!DATABASE_URL) {
    console.warn('DATABASE_URL not set. Skipping DB connection.');
    return;
  }
  await sequelize.authenticate();
  console.log('Connected to PostgreSQL');
  // sync() only creates tables that don't exist — use migrations for schema changes
  await sequelize.sync();
  console.log('Sequelize models synchronized');
}

module.exports = { sequelize, connectDB };
