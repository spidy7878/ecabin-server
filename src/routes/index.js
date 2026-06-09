const { Router }      = require('express');
const { getPool }     = require('../config/db');
const { requireAuth } = require('../middleware/auth.middleware');

const router = Router();

// Health check — confirms DB reachability (public)
router.get('/health', async (req, res) => {
  const pool = await getPool();
  await pool.request().query('SELECT 1');
  res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
});

// Public routes
router.use('/auth',         require('./auth.routes'));

// Protected routes — all require valid JWT
router.use('/aircraft',     requireAuth, require('./aircraft.routes'));
router.use('/seats',        requireAuth, require('./seats.routes'));
router.use('/galleys',      requireAuth, require('./galleys.routes'));
router.use('/lavatories',   requireAuth, require('./lavatories.routes'));
router.use('/attendantseats', requireAuth, require('./attendantseats.routes'));
router.use('/flights',      requireAuth, require('./flights.routes'));
router.use('/users',        requireAuth, require('./users.routes'));
router.use('/subcategories',requireAuth, require('./subcategories.routes'));
router.use('/parts',        requireAuth, require('./parts.routes'));
router.use('/issues',       requireAuth, require('./issues.routes'));
router.use('/dashboard',    requireAuth, require('./dashboard.routes'));
router.use('/inspections',  requireAuth, require('./inspections.routes'));

module.exports = router;
