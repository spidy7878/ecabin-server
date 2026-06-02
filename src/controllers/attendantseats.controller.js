const { getPool, sql } = require('../config/db');

const BASE_SELECT = `
  SELECT a.AttendantSeatId, a.AircraftId, a.AttendantSeatCode, a.AttendantSeatName,
         a.Location, a.AttendantSeatType, a.Status, a.LastInspectionDate,
         a.NextInspectionDate, a.Notes, a.MSN,
         sub.SubCatID
  FROM dbo.AttendantSeat a
  OUTER APPLY (
    SELECT TOP 1 CAST(s.SubCatID AS NVARCHAR(20)) AS SubCatID
    FROM dbo.SubCategory s
    WHERE UPPER(RTRIM(LTRIM(s.SubCatName))) = UPPER(RTRIM(LTRIM(a.AttendantSeatCode)))
      AND RTRIM(CAST(s.CatID AS NVARCHAR(10))) = '4'
      AND s.SubCatDelMrk = 'N'
    ORDER BY CAST(s.SubCatID AS INT)
  ) sub
`;

const attendantSeatsController = {
  async getAll(req, res) {
    const pool = await getPool();
    const req2 = pool.request();
    let query  = BASE_SELECT;
    if (req.query.aircraftId) {
      req2.input('aircraftId', sql.Int, parseInt(req.query.aircraftId, 10));
      query += ' WHERE a.AircraftId = @aircraftId';
    }
    query += ' ORDER BY a.AttendantSeatCode';
    const result = await req2.query(query);
    res.json(result.recordset);
  },

  async getById(req, res) {
    const pool   = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(req.params.id, 10))
      .query(BASE_SELECT + ' WHERE a.AttendantSeatId = @id');
    if (!result.recordset.length) {
      return res.status(404).json({ error: { message: 'Attendant seat not found' } });
    }
    res.json(result.recordset[0]);
  },
};

module.exports = attendantSeatsController;
