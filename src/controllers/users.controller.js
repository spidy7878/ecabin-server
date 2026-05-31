const { getPool, sql } = require('../config/db');

// Columns explicitly whitelisted — never expose PasswordHash, Salt, UserPassword
const SAFE_COLUMNS = 'UserId, FirstName, LastName, Email, IsActive, DateCreated, DateModified, LastLoginDate';

const usersController = {
  async getAll(req, res) {
    const pool   = await getPool();
    const result = await pool
      .request()
      .query(`SELECT ${SAFE_COLUMNS} FROM dbo.Users WHERE IsActive = 1`);
    res.json(result.recordset);
  },

  async getById(req, res) {
    const pool   = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(req.params.id, 10))
      .query(`SELECT ${SAFE_COLUMNS} FROM dbo.Users WHERE UserId = @id`);

    if (!result.recordset.length) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }
    res.json(result.recordset[0]);
  },
};

module.exports = usersController;
