require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');
const { PORT = 5000, NODE_ENV = 'development' } = process.env;
const { ensureTable } = require('./services/portalsDb');

async function start() {
  try {
    await connectDB();
    // Ensure the portals table exists (id, name, base_url, primary_flag)
    await ensureTable();
  } catch (err) {
    console.error('Database connection failed:', err.message);
  }

  const server = http.createServer(app);
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the other process or set PORT to a different value.`);
      process.exit(1);
      return;
    }
    console.error('Server error:', err?.message || err);
    process.exit(1);
  });
  server.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT} [${NODE_ENV}]`);
  });
}

start();
