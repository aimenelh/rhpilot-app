const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.TEST_DB_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000,
});
client.connect()
  .then(() => client.query('SELECT current_database(), current_user'))
  .then(res => { console.log('CONNEXION OK:', res.rows); return client.end(); })
  .catch(err => { console.error('ECHEC complet:', JSON.stringify(err, Object.getOwnPropertyNames(err))); process.exit(1); });
