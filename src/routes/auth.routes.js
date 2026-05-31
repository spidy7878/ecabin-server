const { Router }    = require('express');
const ctrl          = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = Router();

// Public
router.post('/login', ctrl.login);

// Protected — verify token and return current user
router.get('/me', requireAuth, ctrl.me);

module.exports = router;
