const { Router }      = require('express');
const ctrl            = require('../controllers/inspections.controller');
const totalsCtrl      = require('../controllers/totals.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = Router();

// POST /api/inspections/upload  — multipart/form-data, requires JWT
router.post('/upload', requireAuth, ctrl.upload, ctrl.uploadImage);

// GET /api/inspections/totals/:aircraftId — total inspectable items per zone type
router.get('/totals/:aircraftId', requireAuth, totalsCtrl.getTotals);

module.exports = router;
