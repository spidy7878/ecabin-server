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

  // GET /api/users/inspectors — all User-role accounts with their assignment count
  async getInspectors(req, res) {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        ud.UserId,
        ud.Username,
        ud.FirstName + ' ' + ud.LastName AS FullName,
        ud.Email,
        ud.Role,
        COUNT(ia.AircraftId) AS AssignedCount
      FROM dbo.UsersDetail ud
      LEFT JOIN dbo.InspectorAircraftAssignment ia
        ON ia.UserId  = ud.UserId
       AND ia.Delmark = 'N'
      WHERE ud.Role = 'User'
        AND (ud.Delmark != 'Y' OR ud.Delmark IS NULL)
      GROUP BY ud.UserId, ud.Username, ud.FirstName, ud.LastName, ud.Email, ud.Role
      ORDER BY ud.FirstName, ud.LastName
    `);
    res.json(result.recordset);
  },
};

module.exports = usersController;
