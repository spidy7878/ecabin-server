const { Router } = require('express');
const { getAll } = require('../controllers/issues.controller');

const router = Router();

router.get('/', getAll);

module.exports = router;
