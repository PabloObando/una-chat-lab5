const { Client } = require('pg');
const url = process.env.VAULT_DATABASE_URL.replace(/\?.*$/, '');
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
c.connect()
  .then(() => c.query('select length(una_chat_private.get_auth0_client_secret()) as secret_length'))
  .then(r => { console.log('OK', r.rows); return c.end(); })
  .catch(e => console.log('FALLO:', e.code, '-', e.message));