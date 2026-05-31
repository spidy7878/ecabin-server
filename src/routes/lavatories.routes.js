const { Router } = require('express');
const c = require('../controllers/lavatories.controller');

const router = Router();

router.get('/',    c.getAll);
router.get('/:id', c.getById);

module.exports = router;
