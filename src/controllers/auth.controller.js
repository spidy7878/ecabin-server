const { getPool, sql } = require('../config/db');
const jwt             = require('jsonwebtoken');
const crypto          = require('crypto');

/**
 * Constant-time string comparison to prevent timing attacks.
 * The underlying DB stores passwords as plain text (existing web-app constraint).
 */
function safeCompare(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // Pads shorter buffer so timingSafeEqual won't throw on length mismatch,
  // but still returns false if lengths differ.
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA); // consume time
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

const authController = {
  async login(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: { message: 'Username and password are required' } });
    }

    const pool   = await getPool();
    const result = await pool
      .request()
      .input('username', sql.NVarChar(200), username.trim())
      .query(`
        SELECT UserId, FirstName, LastName, Email, Username, Password, Role, EmployeeID
        FROM UsersDetail
        WHERE (Username = @username OR Email = @username)
          AND (Delmark != 'Y' OR Delmark IS NULL)
      `);

    // Use same error message for missing user and wrong password
    // to prevent user enumeration
    const user = result.recordset[0];
    const storedPassword = (user && user.Password) ? user.Password : 'INVALID_PLACEHOLDER';

    if (!user || !user.Password || !safeCompare(storedPassword, password)) {
      return res.status(401).json({ error: { message: 'Invalid username or password' } });
    }

    const payload = {
      userId:     user.UserId,
      username:   user.Username,
      fullName:   `${user.FirstName} ${user.LastName}`.trim(),
      role:       user.Role,        // 'Admin' | 'Manager' | 'User'
      email:      user.Email,
      employeeId: user.EmployeeID,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({ token, user: payload });
  },

  async me(req, res) {
    // req.user is set by requireAuth middleware
    res.json({ user: req.user });
  },
};

module.exports = authController;
