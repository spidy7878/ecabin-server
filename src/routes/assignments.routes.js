const { Router } = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/assignments.controller');

const router = Router();

// All assignment routes require Admin or Manager
router.get('/',       requireAuth, requireRole('Admin', 'Manager'), ctrl.getAll);
router.post('/',      requireAuth, requireRole('Admin', 'Manager'), ctrl.assign);
router.delete('/:id', requireAuth, requireRole('Admin', 'Manager'), ctrl.remove);

module.exports = router;
