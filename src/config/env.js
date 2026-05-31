/**
 * Validates required environment variables on startup.
 * Throws immediately if any required var is missing so the app fails fast.
 */
const REQUIRED_VARS = ['DB_SERVER', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

for (const varName of REQUIRED_VARS) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}

module.exports = {
  db: {
    server:   process.env.DB_SERVER,
    port:     parseInt(process.env.DB_PORT || '1433', 10),
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name:     process.env.DB_NAME,
  },
  server: {
    // iisnode passes a named pipe as PORT (not a number) — do not parseInt it.
    port:     process.env.PORT || 4000,
    nodeEnv:  process.env.NODE_ENV || 'development',
    // Support single origin string or comma-separated list.
    // Use '*' only in development.  Set CORS_ORIGIN in production .env.
    corsOrigin: (() => {
      const raw = process.env.CORS_ORIGIN || '*';
      if (raw === '*') return '*';
      const origins = raw.split(',').map(s => s.trim()).filter(Boolean);
      return origins.length === 1 ? origins[0] : origins;
    })(),
  },
};
