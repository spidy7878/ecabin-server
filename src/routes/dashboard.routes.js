const { Router } = require('express');
const ctrl        = require('../controllers/dashboard.controller');

const router = Router();

router.get('/', ctrl.getDashboard);

module.exports = router;
