const { Router } = require('express');
const { getBySubCatAndAircraft } = require('../controllers/parts.controller');

const router = Router();

router.get('/', getBySubCatAndAircraft);

module.exports = router;
