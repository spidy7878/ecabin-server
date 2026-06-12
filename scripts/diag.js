require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sql = require('mssql');
const config = {
  server: process.env.DB_SERVER, port: parseInt(process.env.DB_PORT || '1433', 10),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  options: { encrypt: false, trustServerCertificate: true },
};

async function main() {
  const pool = await sql.connect(config);
  const q = async (label, sql_) => {
    const r = await pool.request().query(sql_);
    console.log(`\n── ${label} (${r.recordset.length} rows) ──`);
    r.recordset.forEach(row => console.log(JSON.stringify(row)));
    return r.recordset;
  };

  // How many PartsSubCatLink per SubCatID
  await q('Link count per SubCatID', `
    SELECT RTRIM(CAST(SubCatID AS NVARCHAR(20))) AS SubCatID, COUNT(*) AS cnt
    FROM dbo.PartsSubCatLink
    WHERE (PartsSubCatLinkDelMrk='N' OR PartsSubCatLinkDelMrk IS NULL)
    GROUP BY RTRIM(CAST(SubCatID AS NVARCHAR(20)))`);

  // Aircraft table
  await q('Aircraft', `SELECT TOP 20 * FROM dbo.Aircraft`);

  // InspectionDet for testinspector (UserId 31)
  await q('InspectionDet user 31', `SELECT * FROM dbo.InspectionDet WHERE UserID = 31`);

  // Run EXACT parts query for seat subcat 5 (Passenger Seat), aircraft 2
  for (const sc of ['1','5','3','19','21']) {
    const r = await pool.request()
      .input('subCatId', sql.NVarChar, sc)
      .input('aircraftId', sql.Int, 2)
      .query(`
        SELECT MIN(p.PartID) AS PartID, p.PartName
        FROM dbo.Parts p
        INNER JOIN dbo.PartsSubCatLink l
          ON CAST(p.PartID AS NVARCHAR(20)) = RTRIM(CAST(l.PartID AS NVARCHAR(20)))
         AND RTRIM(CAST(l.SubCatID AS NVARCHAR(20))) = @subCatId
         AND (l.PartsSubCatLinkDelMrk = 'N' OR l.PartsSubCatLinkDelMrk IS NULL)
        LEFT JOIN dbo.PartsMSNLink m
          ON m.PartID = p.PartID
         AND m.AircraftId = @aircraftId
         AND (RTRIM(m.PartsMSNLinkStatus) IN ('1', 'N') OR m.PartsMSNLinkStatus IS NULL)
         AND (RTRIM(m.PartsMSNLinkDelMrk) IN ('0', 'N') OR m.PartsMSNLinkDelMrk IS NULL)
        GROUP BY p.PartName
        ORDER BY p.PartName`);
    console.log(`\n── parts subcat=${sc} aircraft=2 (${r.recordset.length} rows) ──`);
    r.recordset.forEach(row => console.log(JSON.stringify(row)));
  }

  await pool.close();
}
main().catch(e => { console.error(e); process.exit(1); });
