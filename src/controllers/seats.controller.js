const { getPool, sql } = require('../config/db');

const seatsController = {
  async getAll(req, res) {
    const pool   = await getPool();
    const result = await pool.request().query('SELECT * FROM dbo.Seats');
    res.json(result.recordset);
  },

  async getById(req, res) {
    const pool   = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(req.params.id, 10))
      .query('SELECT * FROM dbo.Seats WHERE SeatId = @id');

    if (!result.recordset.length) {
      return res.status(404).json({ error: { message: 'Seat not found' } });
    }
    res.json(result.recordset[0]);
  },

  async getDefects(req, res) {
    const pool   = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(req.params.id, 10))
      .query('SELECT * FROM dbo.SeatDefects WHERE SeatId = @id');
    res.json(result.recordset);
  },
};

module.exports = seatsController;
