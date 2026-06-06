const jwt = require('jsonwebtoken');

/**
 * Verifies JWT from Authorization: Bearer <token> header.
 * Attaches decoded payload to req.user.
 */
function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: 'Authentication required' } });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}

/**
 * Returns middleware that allows only the specified roles.
 * Must be used after requireAuth.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: { message: 'Insufficient permissions' } });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
