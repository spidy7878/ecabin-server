require('dotenv').config();

const app    = require('./app');
const config = require('./config/env');

const { port, nodeEnv } = config.server;

app.listen(port, () => {
  console.log(`[server] eCabin Ledger API running on http://localhost:${port} (${nodeEnv})`);
});
