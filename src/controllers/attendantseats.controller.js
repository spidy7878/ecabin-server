const { getPool, sql } = require('../config/db');

const SAFE_COLS = 'AttendantSeatId, AircraftId, AttendantSeatCode, AttendantSeatName, Location, AttendantSeatType, Status, LastInspectionDate, NextInspectionDate, Notes, MSN';

const attendantSeatsController = {
  async getAll(req, res) {
    const pool = await getPool();
    const req2 = pool.request();
    let query  = `SELECT ${SAFE_COLS} FROM dbo.AttendantSeat`;
    if (req.query.aircraftId) {
      req2.input('aircraftId', sql.Int, parseInt(req.query.aircraftId, 10));
      query += ' WHERE AircraftId = @aircraftId';
    }
    query += ' ORDER BY AttendantSeatCode';
    const result = await req2.query(query);
    res.json(result.recordset);
  },

  async getById(req, res) {
    const pool   = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(req.params.id, 10))
      .query(`SELECT ${SAFE_COLS} FROM dbo.AttendantSeat WHERE AttendantSeatId = @id`);
    if (!result.recordset.length) {
      return res.status(404).json({ error: { message: 'Attendant seat not found' } });
    }
    res.json(result.recordset[0]);
  },
};

module.exports = attendantSeatsController;
