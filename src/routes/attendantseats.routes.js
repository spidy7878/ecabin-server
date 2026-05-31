const { Router } = require('express');
const c = require('../controllers/attendantseats.controller');

const router = Router();

router.get('/',    c.getAll);
router.get('/:id', c.getById);

module.exports = router;
