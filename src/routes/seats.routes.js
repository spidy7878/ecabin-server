const { Router } = require('express');
const ctrl       = require('../controllers/seats.controller');

const router = Router();

router.get('/',             ctrl.getAll);
router.get('/:id',          ctrl.getById);
router.get('/:id/defects',  ctrl.getDefects);

module.exports = router;
