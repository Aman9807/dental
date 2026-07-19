const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function initDB() {
  const host = process.env.TIDB_HOST;
  const port = parseInt(process.env.TIDB_PORT || '4000', 10);
  const user = process.env.TIDB_USER;
  const password = process.env.TIDB_PASSWORD;
  const database = process.env.TIDB_DATABASE || 'sys';

  if (!host || !user || !password || password === '<PASSWORD>') {
    console.error('Error: Please update TIDB_PASSWORD in .env.local before running this script.');
    process.exit(1);
  }

  console.log(`Connecting to TiDB Cloud cluster at ${host}:${port}...`);

  try {
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

    console.log('Connected successfully! Creating tables if they do not exist...');

    // 1. Create medicines table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS medicines (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        generic_name VARCHAR(255) NULL,
        barcode VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('- Created "medicines" table.');

    // 2. Create medicine_batches table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS medicine_batches (
        id VARCHAR(36) PRIMARY KEY,
        medicine_id VARCHAR(36) NOT NULL,
        batch_number VARCHAR(100) NOT NULL,
        expiry_date DATE NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        stock INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
      )
    `);
    console.log('- Created "medicine_batches" table.');

    // 3. Optional: Seed some initial mock data for testing if tables are empty
    const [existingMeds] = await connection.execute('SELECT COUNT(*) as count FROM medicines');
    if (existingMeds[0].count === 0) {
      console.log('Seeding demo medicines into database...');
      
      const seedMeds = [
        ['med-id-1', 'Amoxicillin 500mg', 'Amoxicillin', '8901117210103'],
        ['med-id-2', 'Paracetamol 650mg', 'Paracetamol', '8901234567890'],
        ['med-id-3', 'Ibuprofen 400mg', 'Ibuprofen', '8901122334455'],
        ['med-id-4', 'Sensodyne Rapid Relief', 'Potassium Nitrate', '8901030704944']
      ];

      for (const m of seedMeds) {
        await connection.execute(
          'INSERT INTO medicines (id, name, generic_name, barcode) VALUES (?, ?, ?, ?)',
          m
        );
      }

      const seedBatches = [
        ['batch-id-1', 'med-id-1', 'AMX2026', '2026-12-31', 120.00, 150],
        ['batch-id-2', 'med-id-2', 'PCT2026', '2026-10-15', 30.00, 200],
        ['batch-id-3', 'med-id-3', 'IBP2026', '2026-11-20', 45.00, 100],
        ['batch-id-4', 'med-id-4', 'SEN2026', '2026-09-05', 180.00, 75]
      ];

      for (const b of seedBatches) {
        await connection.execute(
          'INSERT INTO medicine_batches (id, medicine_id, batch_number, expiry_date, price, stock) VALUES (?, ?, ?, ?, ?, ?)',
          b
        );
      }
      console.log('- Seeded demo inventory batches successfully.');
    }

    await connection.end();
    console.log('All set! TiDB Cloud database initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize database tables:', err.message || err);
  }
}

initDB();
