require('express-async-errors'); // patches Express to catch async errors automatically
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const fs         = require('fs');
const jwt        = require('jsonwebtoken');

const config      = require('./config/env');
const routes      = require('./routes');
const notFound    = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── Security headers ────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ── CORS ────────────────────────────────────────────────────────────────────
// Fix 3: Warn loudly in production if CORS is still open wildcard.
if (config.server.nodeEnv === 'production' && config.server.corsOrigin === '*') {
  console.warn('[SECURITY] CORS_ORIGIN is "*" in production — set it to the web app domain in .env!');
}
app.use(cors({ origin: config.server.corsOrigin }));

// ── Request logging ─────────────────────────────────────────────────────────
app.use(morgan(config.server.nodeEnv === 'production' ? 'combined' : 'dev'));

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json());

// ── Fix 2: Protected image serving ───────────────────────────────────────────
// /uploads/* requires a valid JWT (Bearer token in Authorization header OR
// ?token=<jwt> query param — the query-param form lets <img> tags work in the
// web app without needing a fetch proxy).
//
// Web app display options:
//   Option A (API): fetch('/api/uploads/seats/2026-05-31/file.jpg', { headers: { Authorization: 'Bearer ...' } })
//   Option B (img):  <img src="http://server/uploads/seats/.../file.jpg?token=<jwt>" />
//
// The web app already reads ImageData (varbinary) directly from SQL Server for
// all historical records — both options above are provided for new records only.
app.use('/uploads', (req, res, next) => {
  // Accept token from Authorization header OR ?token= query param
  const authHeader = req.headers['authorization'];
  const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;
  const token = tokenFromHeader || req.query.token;

  if (!token) {
    return res.status(401).json({ error: { message: 'Authentication required to access inspection images' } });
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next(); // valid — fall through to static
  } catch {
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}, express.static(path.join(__dirname, '../uploads')));

// ── Fix 1: Rate limiting ──────────────────────────────────────────────────────
// Upload endpoint gets its own, higher limit because a single inspection task
// can have 400+ images (batched in groups of 5 = 80+ requests per 15 min window).
// General API routes keep the tighter 100 req/15 min limit.
app.use(
  '/api/inspections/upload',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,  // covers 400 images + overhead per inspector per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Key by user ID from JWT (not IP) so multiple inspectors on same network
      // (e.g. same airline WiFi) don't share the bucket.
      const header = req.headers['authorization'];
      const token  = header && header.startsWith('Bearer ') ? header.slice(7) : null;
      if (token) {
        try {
          const payload = jwt.verify(token, process.env.JWT_SECRET);
          return `user:${payload.userId}`;
        } catch { /* fall back to IP */ }
      }
      return req.ip;
    },
    message: { error: { message: 'Upload rate limit reached. Wait 15 minutes or contact support.' } },
  })
);

app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { message: 'Too many requests, please try again later.' } },
  })
);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── 404 & error handlers (must be last) ─────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
