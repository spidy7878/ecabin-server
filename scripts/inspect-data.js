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
  };

  await q('SubCategory ALL', 'SELECT SubCatID,SubCatName,CatID,SubCatType,SubCatStatus,SubCatDelMrk FROM dbo.SubCategory ORDER BY CatID,SubCatID');
  await q('Parts sample', 'SELECT TOP 10 PartID,PartName,PartCode,Category,IsActive,SubCatID,OperatorID FROM dbo.Parts ORDER BY PartID');
  await q('PartsSubCatLink sample', 'SELECT TOP 10 * FROM dbo.PartsSubCatLink');
  await q('PartsMSNLink sample', 'SELECT TOP 10 * FROM dbo.PartsMSNLink');
  await q('Issues ALL', 'SELECT IssueID,IssueName,IssueCode,IsActive,IssuePriority FROM dbo.Issues');
  await q('Galleys sample', 'SELECT TOP 5 GalleyId,AircraftId,GalleyCode,GalleyName,Location,GalleyType,Status FROM dbo.Galleys');
  await q('Lavatories sample', 'SELECT TOP 5 LavatoriesId,AircraftId,LavatoriesCode,LavatoriesName,Location,LavatoriesType,Status FROM dbo.Lavatories');
  await q('AttendantSeat sample', 'SELECT TOP 5 AttendantSeatId,AircraftId,AttendantSeatCode,AttendantSeatName,Location,AttendantSeatType,Status FROM dbo.AttendantSeat');
  await q('AircraftAudits sample', 'SELECT TOP 5 AuditId,AircraftId,LastAuditDate,LastAuditPerson,NextAuditDate,Delmark FROM dbo.AircraftAudits');
  await q('UsersDetail ALL usernames', 'SELECT UserId,Username,FirstName,LastName,Role,Organisation,Delmark FROM dbo.UsersDetail ORDER BY UserId');

  await pool.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
