const { getPool, sql } = require('../config/db');

const BASE_SELECT = `
  SELECT l.LavatoriesId, l.AircraftId, l.LavatoriesCode, l.LavatoriesName,
         l.Location, l.LavatoriesType, l.Status, l.LastInspectionDate,
         l.NextInspectionDate, l.Notes,
         sub.SubCatID
  FROM dbo.Lavatories l
  OUTER APPLY (
    SELECT TOP 1 CAST(s.SubCatID AS NVARCHAR(20)) AS SubCatID
    FROM dbo.SubCategory s
    WHERE UPPER(RTRIM(LTRIM(s.SubCatName))) = UPPER(RTRIM(LTRIM(l.LavatoriesCode)))
      AND RTRIM(CAST(s.CatID AS NVARCHAR(10))) = '3'
      AND s.SubCatDelMrk = 'N'
    ORDER BY CAST(s.SubCatID AS INT)
  ) sub
`;

const lavatoriesController = {
  async getAll(req, res) {
    const pool = await getPool();
    const req2  = pool.request();
    let query   = BASE_SELECT;
    if (req.query.aircraftId) {
      req2.input('aircraftId', sql.Int, parseInt(req.query.aircraftId, 10));
      query += ' WHERE l.AircraftId = @aircraftId';
    }
    query += ' ORDER BY l.LavatoriesCode';
    const result = await req2.query(query);
    res.json(result.recordset);
  },

  async getById(req, res) {
    const pool   = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(req.params.id, 10))
      .query(BASE_SELECT + ' WHERE l.LavatoriesId = @id');
    if (!result.recordset.length) {
      return res.status(404).json({ error: { message: 'Lavatory not found' } });
    }
    res.json(result.recordset[0]);
  },
};

module.exports = lavatoriesController;
