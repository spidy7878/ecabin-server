const { getPool, sql } = require('../config/db');

const SAFE_COLS = 'AircraftId, MSN, Registration, AircraftType, DOM, IsActive';

const aircraftController = {
  async getAll(req, res) {
    const pool = await getPool();

    // Only inspectors (role 'User') can sign into this app, and each inspector
    // sees only the aircraft assigned to them in dbo.InspectionDet.
    //
    // NOTE: InspectionDet.AircraftId actually stores the aircraft's MSN (not the
    // Aircraft primary key), so it is matched against Aircraft.MSN.  Soft-deleted
    // assignments (InspectionDelmark = 'Y') are excluded.  EXISTS de-duplicates
    // aircraft that have more than one inspection row for this inspector.
    const result = await pool
      .request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT ${SAFE_COLS.split(', ').map(col => `a.${col}`).join(', ')}
        FROM dbo.Aircraft a
        WHERE EXISTS (
          SELECT 1
          FROM dbo.InspectionDet d
          WHERE CAST(d.AircraftId AS nvarchar(10)) = a.MSN
            AND d.UserID = @userId
            AND RTRIM(d.InspectionDelmark) = 'N'
        )
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
