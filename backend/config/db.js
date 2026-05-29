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
  // Auto-sync models — alter:true adds missing columns without dropping existing data
  await sequelize.sync({ alter: true });
  console.log('Sequelize models synchronized');
}

module.exports = { sequelize, connectDB };
