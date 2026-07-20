require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function run() {
  const host = process.env.TIDB_HOST;
  const port = parseInt(process.env.TIDB_PORT || '4000', 10);
  const user = process.env.TIDB_USER;
  const password = process.env.TIDB_PASSWORD;
  const database = process.env.TIDB_DATABASE;

  console.log('Connecting to TiDB host:', host);
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Adding branch_slug column to medicine_batches...');
    await connection.execute(`
      ALTER TABLE medicine_batches 
      ADD COLUMN branch_slug VARCHAR(50) NOT NULL DEFAULT 'hazara'
    `);
    console.log('Column added successfully!');
  } catch (err) {
    console.log('Alter execution note:', err.message);
  } finally {
    await connection.end();
  }
}

run().catch(console.error);
