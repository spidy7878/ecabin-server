const { getPool } = require('../config/db');
const sql = require('mssql');

/**
 * GET /api/subcategories?catId=1
 * Returns subcategories for a given category (catId).
 * CatID=1 = Cabin/Seat areas (Carpet, Dado Panel, Passenger Seat, etc.)
 */
async function getByCategory(req, res) {
  try {
    const { catId = '1' } = req.query;
    const pool = await getPool();
    const result = await pool.request()
      .input('catId', sql.NVarChar, String(catId))
      .query(`
        SELECT SubCatID, SubCatName, CatID
        FROM dbo.SubCategory
        WHERE CatID = @catId
          AND SubCatDelMrk = 'N'
        ORDER BY CAST(SubCatID AS INT)
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('subcategories.getByCategory error:', err.message);
    res.status(500).json({ error: 'Failed to fetch subcategories' });
  }
}

module.exports = { getByCategory };
