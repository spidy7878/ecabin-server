const { getPool, sql } = require('../config/db');

const flightsController = {
  async getAll(req, res) {
    const pool   = await getPool();
    const result = await pool.request().query('SELECT * FROM dbo.Flights');
    res.json(result.recordset);
  },

  async getById(req, res) {
    const pool   = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(req.params.id, 10))
      .query('SELECT * FROM dbo.Flights WHERE FlightId = @id');

    if (!result.recordset.length) {
      return res.status(404).json({ error: { message: 'Flight not found' } });
    }
    res.json(result.recordset[0]);
  },

  async getAssignments(req, res) {
    const pool   = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(req.params.id, 10))
      .query('SELECT * FROM dbo.FlightAssignments WHERE FlightId = @id');
    res.json(result.recordset);
  },
};

module.exports = flightsController;
