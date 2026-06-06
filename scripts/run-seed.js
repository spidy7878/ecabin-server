/**
 * run-seed.js  — Execute seed.sql against the configured SQL Server database.
 * Usage: node scripts/run-seed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sql  = require('mssql');
const fs   = require('fs');
const path = require('path');

const config = {
  server:   process.env.DB_SERVER,
  port:     parseInt(process.env.DB_PORT || '1433', 10),
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options:  { encrypt: false, trustServerCertificate: true },
};

async function main() {
  console.log(`Connecting to ${config.server}/${config.database}…`);
  const pool = await sql.connect(config);
  console.log('Connected.\n');

  const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');

  // mssql executes the entire script as one batch
  try {
    const result = await pool.request().query(seedSql);
    if (result.recordsets && result.recordsets.length > 0) {
      result.recordsets.forEach((rs) => {
        if (rs.length > 0) console.log(rs);
      });
    }
    console.log('\n✓ Seed completed successfully.');
  } catch (err) {
    console.error('\n✗ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
