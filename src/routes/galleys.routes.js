const { Router } = require('express');
const ctrl       = require('../controllers/galleys.controller');

const router = Router();

router.get('/',                  ctrl.getAll);
router.get('/:id',               ctrl.getById);
router.get('/:id/defects',       ctrl.getDefects);
router.get('/:id/inspections',   ctrl.getInspections);

module.exports = router;
