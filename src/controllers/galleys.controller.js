const { getPool, sql } = require('../config/db');

const BASE_SELECT = `
  SELECT g.GalleyId, g.AircraftId, g.GalleyCode, g.GalleyName,
         g.Location, g.GalleyType, g.Status, g.LastInspectionDate, g.NextInspectionDate,
         sub.SubCatID
  FROM dbo.Galleys g
  OUTER APPLY (
    SELECT TOP 1 CAST(s.SubCatID AS NVARCHAR(20)) AS SubCatID
    FROM dbo.SubCategory s
    WHERE UPPER(RTRIM(LTRIM(s.SubCatName))) = UPPER(RTRIM(LTRIM(g.GalleyCode)))
      AND RTRIM(CAST(s.CatID AS NVARCHAR(10))) = '2'
      AND s.SubCatDelMrk = 'N'
    ORDER BY CAST(s.SubCatID AS INT)
  ) sub
`;

const galleysController = {
  async getAll(req, res) {
    const pool = await getPool();
    const req2 = pool.request();
    let query  = BASE_SELECT;
    if (req.query.aircraftId) {
      req2.input('aircraftId', sql.Int, parseInt(req.query.aircraftId, 10));
      query += ' WHERE g.AircraftId = @aircraftId';
    }
    query += ' ORDER BY g.GalleyCode';
    const result = await req2.query(query);
    res.json(result.recordset);
  },

  async getById(req, res) {
    const pool   = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(req.params.id, 10))
      .query(BASE_SELECT + ' WHERE g.GalleyId = @id');

    if (!result.recordset.length) {
      return res.status(404).json({ error: { message: 'Galley not found' } });
    }
    res.json(result.recordset[0]);
  },

  async getDefects(req, res) {
    const pool   = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(req.params.id, 10))
      .query('SELECT * FROM dbo.GalleyDefects WHERE GalleyId = @id');
    res.json(result.recordset);
  },

  async getInspections(req, res) {
    const pool   = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(req.params.id, 10))
      .query('SELECT * FROM dbo.GalleyInspections WHERE GalleyId = @id');
    res.json(result.recordset);
  },
};

module.exports = galleysController;
