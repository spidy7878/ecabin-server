const sql    = require('mssql');
const config = require('./env');

const poolConfig = {
  server:   config.db.server,
  port:     config.db.port,
  user:     config.db.user,
  password: config.db.password,
  database: config.db.name,
  options: {
    encrypt:               false,
    trustServerCertificate: true,
  },
  pool: {
    max:                10,
    min:                 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(poolConfig);
    pool.on('error', (err) => {
      console.error('[DB] Pool error:', err.message);
      pool = null; // allow reconnect on next request
    });
  }
  return pool;
}

module.exports = { getPool, sql };
