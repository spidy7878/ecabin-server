const { Router }    = require('express');
const { requireRole } = require('../middleware/auth.middleware');
const ctrl            = require('../controllers/users.controller');

const router = Router();

router.get('/inspectors', requireRole('Admin', 'Manager'), ctrl.getInspectors);
router.get('/',    ctrl.getAll);
router.get('/:id', ctrl.getById);

module.exports = router;
