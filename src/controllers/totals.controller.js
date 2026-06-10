const { getPool, sql } = require('../config/db');

// Shared parts-join fragment — scAlias must be a trusted internal alias (never user input)
const partsJoins = (scAlias) => `
  INNER JOIN dbo.PartsSubCatLink l
    ON RTRIM(CAST(l.SubCatID AS NVARCHAR(20))) = RTRIM(CAST(${scAlias}.SubCatID AS NVARCHAR(20)))
    AND (l.PartsSubCatLinkDelMrk = 'N' OR l.PartsSubCatLinkDelMrk IS NULL)
  INNER JOIN dbo.Parts p
    ON CAST(p.PartID AS NVARCHAR(20)) = RTRIM(CAST(l.PartID AS NVARCHAR(20)))
  INNER JOIN dbo.PartsMSNLink m
    ON m.PartID = p.PartID AND m.AircraftId = @aircraftId
    AND (RTRIM(m.PartsMSNLinkStatus) = '1' OR m.PartsMSNLinkStatus IS NULL)
    AND (RTRIM(m.PartsMSNLinkDelMrk) = '0' OR m.PartsMSNLinkDelMrk IS NULL)
`;

/**
 * GET /api/inspections/totals/:aircraftId
 * Returns the total number of distinct (zone_id, part_name) inspection slots
 * for each zone type for the given aircraft.  Used by the mobile app to
 * calculate inspection progress percentages.
 */
async function getTotals(req, res) {
  const aircraftId = parseInt(req.params.aircraftId, 10);
  if (!aircraftId || isNaN(aircraftId)) {
    return res.status(400).json({ error: 'aircraftId must be a positive integer' });
  }

  try {
    const pool    = await getPool();
    const makeReq = () => pool.request().input('aircraftId', sql.Int, aircraftId);

    const [seatsRes, galleyRes, lavRes, attRes] = await Promise.all([
      // Seats: zone_id stored in SQLite = TRY_CAST(SubCatID AS INT), CatID = 1
      makeReq().query(`
        SELECT COUNT(*) AS total FROM (
          SELECT DISTINCT sc.SubCatID AS zid, p.PartName
          FROM dbo.SubCategory sc
          ${partsJoins('sc')}
          WHERE RTRIM(CAST(sc.CatID AS NVARCHAR(10))) = '1'
            AND (sc.SubCatDelMrk = 'N' OR sc.SubCatDelMrk IS NULL)
        ) t
      `),

      // Galley: zone_id = GalleyId, subcategory matched by GalleyCode, CatID = 2
      makeReq().query(`
        SELECT COUNT(*) AS total FROM (
          SELECT DISTINCT g.GalleyId AS zid, p.PartName
          FROM dbo.Galleys g
          INNER JOIN dbo.SubCategory sc
            ON UPPER(RTRIM(LTRIM(sc.SubCatName))) = UPPER(RTRIM(LTRIM(g.GalleyCode)))
            AND RTRIM(CAST(sc.CatID AS NVARCHAR(10))) = '2'
            AND (sc.SubCatDelMrk = 'N' OR sc.SubCatDelMrk IS NULL)
          ${partsJoins('sc')}
          WHERE g.AircraftId = @aircraftId
        ) t
      `),

      // Lavatory: zone_id = LavatoriesId, CatID = 3
      makeReq().query(`
        SELECT COUNT(*) AS total FROM (
          SELECT DISTINCT lv.LavatoriesId AS zid, p.PartName
          FROM dbo.Lavatories lv
          INNER JOIN dbo.SubCategory sc
            ON UPPER(RTRIM(LTRIM(sc.SubCatName))) = UPPER(RTRIM(LTRIM(lv.LavatoriesCode)))
            AND RTRIM(CAST(sc.CatID AS NVARCHAR(10))) = '3'
            AND (sc.SubCatDelMrk = 'N' OR sc.SubCatDelMrk IS NULL)
          ${partsJoins('sc')}
          WHERE lv.AircraftId = @aircraftId
        ) t
      `),

      // Attendant: zone_id = AttendantSeatId, CatID = 4
      makeReq().query(`
        SELECT COUNT(*) AS total FROM (
          SELECT DISTINCT a.AttendantSeatId AS zid, p.PartName
          FROM dbo.AttendantSeat a
          INNER JOIN dbo.SubCategory sc
            ON UPPER(RTRIM(LTRIM(sc.SubCatName))) = UPPER(RTRIM(LTRIM(a.AttendantSeatCode)))
            AND RTRIM(CAST(sc.CatID AS NVARCHAR(10))) = '4'
            AND (sc.SubCatDelMrk = 'N' OR sc.SubCatDelMrk IS NULL)
          ${partsJoins('sc')}
          WHERE a.AircraftId = @aircraftId
        ) t
      `),
    ]);

    res.json({
      seats:     seatsRes.recordset[0]?.total  ?? 0,
      galley:    galleyRes.recordset[0]?.total ?? 0,
      lavatory:  lavRes.recordset[0]?.total    ?? 0,
      attendant: attRes.recordset[0]?.total    ?? 0,
    });
  } catch (err) {
    console.error('[inspections] getTotals error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getTotals };
