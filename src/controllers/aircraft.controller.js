const { getPool, sql } = require('../config/db');

const SAFE_COLS = 'AircraftId, MSN, Registration, AircraftType, DOM, IsActive';

const aircraftController = {
  async getAll(req, res) {
    const pool = await getPool();

    // Admin / Manager see the whole fleet.  An inspector (User) only sees the
    // aircraft belonging to their operator — i.e. Aircraft.OperatorId matches
    // their own UsersDetail.Organisation.  This is the only inspector→aircraft
    // assignment link that exists in the data (there is no per-inspector
    // assignment table populated yet), so an inspector whose Organisation is
    // NULL or unmatched correctly gets an empty fleet.
    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Manager';

    if (isPrivileged) {
      const result = await pool
        .request()
        .query(`SELECT ${SAFE_COLS} FROM dbo.Aircraft ORDER BY MSN`);
      return res.json(result.recordset);
    }

    const result = await pool
      .request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT ${SAFE_COLS.split(', ').map(col => `a.${col}`).join(', ')}
        FROM dbo.Aircraft a
        INNER JOIN dbo.UsersDetail u
          ON u.UserId = @userId
         AND RTRIM(LTRIM(CAST(a.OperatorId  AS NVARCHAR(50)))) =
             RTRIM(LTRIM(CAST(u.Organisation AS NVARCHAR(50))))
        ORDER BY a.MSN
      `);
    res.json(result.recordset);
  },

  async getById(req, res) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(req.params.id, 10))
      .query(`SELECT ${SAFE_COLS} FROM dbo.Aircraft WHERE AircraftId = @id`);
    if (!result.recordset.length) {
      return res.status(404).json({ error: { message: 'Aircraft not found' } });
    }
    res.json(result.recordset[0]);
  },

  /** Returns basic aircraft info plus galley and lavatory counts. */
  async getSummary(req, res) {
    const id = parseInt(req.params.id, 10);
    const pool = await getPool();

    const [acResult, galleyResult, lavResult] = await Promise.all([
      pool.request().input('id', sql.Int, id)
        .query(`SELECT ${SAFE_COLS} FROM dbo.Aircraft WHERE AircraftId = @id`),
      pool.request().input('id', sql.Int, id)
        .query('SELECT COUNT(*) AS cnt FROM dbo.Galleys WHERE AircraftId = @id'),
      pool.request().input('id', sql.Int, id)
        .query('SELECT COUNT(*) AS cnt FROM dbo.Lavatories WHERE AircraftId = @id'),
    ]);

    if (!acResult.recordset.length) {
      return res.status(404).json({ error: { message: 'Aircraft not found' } });
    }

    res.json({
      ...acResult.recordset[0],
      galleyCount:    galleyResult.recordset[0].cnt,
      lavatoryCount:  lavResult.recordset[0].cnt,
    });
  },
};

module.exports = aircraftController;
