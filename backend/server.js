require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const path        = require('path');
const connectDB   = require('./config/db');

const app = express();

// ── Connect DB ────────────────────────────────────────────────────────────────
connectDB();

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
    : ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
  methods:     ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// General rate limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — try again later' },
}));


// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Static uploads ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────────────────────────
// Note: formLimiter is passed into route files so it only applies to public
// form endpoints (contact, quote, subscribe, diagnostic submit), not admin routes.
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/leads',       require('./routes/leads'));
app.use('/api/diagnostics', require('./routes/diagnostics'));
app.use('/api/newsletter',  require('./routes/newsletter'));
app.use('/api/clients',     require('./routes/clients'));
app.use('/api/corporates',  require('./routes/corporates'));
app.use('/api/donors',      require('./routes/donors'));
app.use('/api/dashboard',   require('./routes/dashboard'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/email',       require('./routes/email'));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\nVertex Africa API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  console.log(`Health: http://localhost:${PORT}/health\n`);
});

module.exports = app;
