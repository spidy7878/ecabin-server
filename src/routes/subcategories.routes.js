const { Router } = require('express');
const { getByCategory } = require('../controllers/subcategories.controller');

const router = Router();

router.get('/', getByCategory);

module.exports = router;
