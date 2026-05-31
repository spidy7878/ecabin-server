const { Router }      = require('express');
const ctrl            = require('../controllers/inspections.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = Router();

// POST /api/inspections/upload  — multipart/form-data, requires JWT
router.post('/upload', requireAuth, ctrl.upload, ctrl.uploadImage);

module.exports = router;
