const { getPool, sql } = require('../config/db');

const galleysController = {
  async getAll(req, res) {
    const pool = await getPool();
    const req2 = pool.request();
    let query  = 'SELECT * FROM dbo.Galleys';
    if (req.query.aircraftId) {
      req2.input('aircraftId', sql.Int, parseInt(req.query.aircraftId, 10));
      query += ' WHERE AircraftId = @aircraftId';
    }
    query += ' ORDER BY GalleyCode';
    const result = await req2.query(query);
    res.json(result.recordset);
  },

  async getById(req, res) {
    const pool   = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, parseInt(req.params.id, 10))
      .query('SELECT * FROM dbo.Galleys WHERE GalleyId = @id');

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
