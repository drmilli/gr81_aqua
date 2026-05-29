const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/authRoutes');
const movieRoutes = require('./routes/movieRoutes');
const seriesRoutes = require('./routes/seriesRoutes');
const tvRoutes = require('./routes/tvRoutes');
const profileRoutes = require('./routes/profileRoutes');
const epgRoutes = require('./routes/epgRoutes');
const providerRoutes = require('./routes/providerRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminContentRoutes = require('./routes/adminContentRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const userRoutes = require('./routes/userRoutes');
const qrRoutes = require('./routes/qrRoutes');
const myListRoutes = require('./routes/myListRoutes');
const portalsRoutes = require('./routes/portalsRoutes');
const licensingRoutes = require('./routes/licensingRoutes');
const adminLicenseRoutes = require('./routes/adminLicenseRoutes');
const recordingsRoutes = require('./routes/recordingsRoutes');
const adminPage = require('./admin');
const { requestLogger } = require('./middleware/requestLogger');

const app = express();

// Security & middleware
app.set('trust proxy', 1); // required behind Render/Proxies
app.use(helmet({ crossOriginResourcePolicy: false, contentSecurityPolicy: false }));

// CORS allowlist
const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
const corsOptions = {
  origin: (origin, cb) => {
    // allow same-origin / curl / server-to-server
    if (!origin || origin === 'null') return cb(null, true);
    if (allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
    // disallow without throwing to avoid unhandled errors and keep headers consistent
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Compression for responses
app.use(compression());
// Webhooks need raw body for signature verification
app.use('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(requestLogger);

// Basic rate limiter (tune for production)
const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use(limiter);

// Minimal request id middleware
app.use((req, _res, next) => {
  req.id = req.headers['x-request-id'] || Math.random().toString(36).slice(2);
  next();
});

// Healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/tv', tvRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/epg', epgRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin/content', adminContentRoutes);
app.use('/api/admin/users',  adminUserRoutes);
app.use('/api/users', userRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/mylist', myListRoutes);
app.use('/api/licensing', licensingRoutes);
app.use('/api/admin/licenses', adminLicenseRoutes);
app.use('/api/recordings', recordingsRoutes);
// Portals API for admin (CRUD) and mobile (read)
app.use('/portals', portalsRoutes);
app.use('/api/portals', portalsRoutes);
app.use('/admin', adminPage);

// 404 and error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
