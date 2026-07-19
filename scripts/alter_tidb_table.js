const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Manually parse env file
const envPath = path.join(__dirname, '../.env.local');
const envConfig = {};

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '');
      envConfig[key] = val;
    }
  });
}

async function run() {
  const host = envConfig.TIDB_HOST;
  const user = envConfig.TIDB_USER;
  const password = envConfig.TIDB_PASSWORD;
  const database = envConfig.TIDB_DATABASE || 'test';
  const port = parseInt(envConfig.TIDB_PORT || '4000', 10);

  if (password === '<PASSWORD>') {
    console.log('Skipping TiDB alter: local password placeholder is still active.');
    return;
  }

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true
    }
  });

  try {
    console.log('Altering medicines table to add tablets_per_patch...');
    await connection.query(`
      ALTER TABLE medicines 
      ADD COLUMN tablets_per_patch INT NOT NULL DEFAULT 1
    `);
    console.log('Schema alter succeeded!');
  } catch (err) {
    // If column already exists, ignore error
    if (err.message.includes('Duplicate column')) {
      console.log('Column tablets_per_patch already exists.');
    } else {
      console.error('Error altering schema:', err);
    }
  } finally {
    await connection.end();
  }
}

run();
