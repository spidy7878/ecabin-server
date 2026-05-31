const { Router } = require('express');
const ctrl       = require('../controllers/flights.controller');

const router = Router();

router.get('/',                ctrl.getAll);
router.get('/:id',             ctrl.getById);
router.get('/:id/assignments', ctrl.getAssignments);

module.exports = router;
