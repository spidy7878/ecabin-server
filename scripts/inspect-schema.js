require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sql = require('mssql');

const config = {
  server:   process.env.DB_SERVER,
  port:     parseInt(process.env.DB_PORT || '1433', 10),
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options:  { encrypt: false, trustServerCertificate: true },
};

async function main() {
  const pool = await sql.connect(config);

  // Column types for key tables
  const tables = ['Aircraft','UsersDetail','AircraftAudits','Galleys','Lavatories',
                  'AttendantSeat','SubCategory','Parts','PartsSubCatLink','PartsMSNLink','Issues'];
  for (const t of tables) {
    const r = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${t}'
      ORDER BY ORDINAL_POSITION`);
    if (r.recordset.length) {
      console.log(`\n── ${t} ──`);
      r.recordset.forEach(c =>
        console.log(`  ${c.COLUMN_NAME.padEnd(30)} ${c.DATA_TYPE}${c.CHARACTER_MAXIMUM_LENGTH?`(${c.CHARACTER_MAXIMUM_LENGTH})`:''} ${c.IS_NULLABLE==='YES'?'NULL':'NOT NULL'}`));
    }
  }

  // Existing aircraft sample
  const ac = await pool.request().query(`SELECT TOP 5 * FROM dbo.Aircraft ORDER BY AircraftId`);
  console.log('\n── Aircraft sample ──');
  console.log(ac.recordset);

  // Existing users sample
  const u = await pool.request().query(`SELECT TOP 5 UserId,Username,Role,Organisation,Delmark FROM dbo.UsersDetail ORDER BY UserId`);
  console.log('\n── UsersDetail sample ──');
  console.log(u.recordset);

  await pool.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
