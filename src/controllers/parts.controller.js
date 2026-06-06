const { getPool } = require('../config/db');
const sql = require('mssql');

/**
 * GET /api/parts?subCatId=5&aircraftId=2
 * Returns distinct part names for a given subcategory and aircraft.
 * Uses PartsSubCatLink + PartsMSNLink to filter.
 */
async function getBySubCatAndAircraft(req, res) {
  try {
    const { subCatId, aircraftId } = req.query;
    if (!subCatId || !aircraftId) {
      return res.status(400).json({ error: 'subCatId and aircraftId are required' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('subCatId',   sql.NVarChar, String(subCatId))
      .input('aircraftId', sql.Int,      parseInt(aircraftId, 10))
      .query(`
        SELECT MIN(p.PartID) AS PartID, p.PartName
        FROM dbo.Parts p
        INNER JOIN dbo.PartsSubCatLink l
          ON CAST(p.PartID AS NVARCHAR(20)) = RTRIM(CAST(l.PartID AS NVARCHAR(20)))
         AND RTRIM(CAST(l.SubCatID AS NVARCHAR(20))) = @subCatId
         AND (l.PartsSubCatLinkDelMrk = 'N' OR l.PartsSubCatLinkDelMrk IS NULL)
        INNER JOIN dbo.PartsMSNLink m
          ON m.PartID = p.PartID
         AND m.AircraftId = @aircraftId
         AND (RTRIM(m.PartsMSNLinkStatus) = '1' OR m.PartsMSNLinkStatus IS NULL)
         AND (RTRIM(m.PartsMSNLinkDelMrk) = '0' OR m.PartsMSNLinkDelMrk IS NULL)
        GROUP BY p.PartName
        ORDER BY p.PartName
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('parts.getBySubCatAndAircraft error:', err.message);
    res.status(500).json({ error: 'Failed to fetch parts' });
  }
}

module.exports = { getBySubCatAndAircraft };
