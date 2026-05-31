const { Router } = require('express');
const c = require('../controllers/aircraft.controller');

const router = Router();

router.get('/',           c.getAll);
router.get('/:id',        c.getById);
router.get('/:id/summary', c.getSummary);

module.exports = router;
