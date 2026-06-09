const { Router } = require('express');
const ctrl       = require('../controllers/users.controller');

const router = Router();

router.get('/',    ctrl.getAll);
router.get('/:id', ctrl.getById);

module.exports = router;
