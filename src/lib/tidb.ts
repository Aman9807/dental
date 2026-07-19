import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

export function getTiDBPool() {
  if (pool) return pool

  const host = process.env.TIDB_HOST
  const port = parseInt(process.env.TIDB_PORT || '4000', 10)
  const user = process.env.TIDB_USER
  const password = process.env.TIDB_PASSWORD
  const database = process.env.TIDB_DATABASE

  if (!host || !user || !password || !database) {
    console.warn('Warning: Missing TiDB environment variables. Queries will fall back.')
  }

  pool = mysql.createPool({
    host: host || 'localhost',
    port: port,
    user: user || 'root',
    password: password || '',
    database: database || 'dental_inventory',
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: false
    },
    connectionLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  })

  return pool
}

export async function queryTiDB(sql: string, params: any[] = []): Promise<any> {
  // If credentials are placeholder and host is localhost, let's gracefully return fallback mock results to keep development error-free if TiDB credentials are not added yet
  const host = process.env.TIDB_HOST
  const password = process.env.TIDB_PASSWORD
  if (!host || !password || password === '<PASSWORD>') {
    return simulateMockQueries(sql, params)
  }

  try {
    const dbPool = getTiDBPool()
    const [rows] = await dbPool.execute(sql, params)
    return rows
  } catch (err: any) {
    console.error('Error executing TiDB query:', err.message || err)
    throw err
  }
}

// Seamless mock query handler to prevent app crashes when TiDB variables are pending in developer setup
async function simulateMockQueries(sql: string, params: any[]): Promise<any> {
  const lowercaseSql = sql.toLowerCase()
  
  if (lowercaseSql.includes('select') && lowercaseSql.includes('medicines')) {
    // Mock medicines search
    const mockMedicines = [
      { id: '1', name: 'Amoxicillin 500mg', generic_name: 'Amoxicillin', barcode: '8901117210103', stock: 150 },
      { id: '2', name: 'Paracetamol 650mg', generic_name: 'Paracetamol', barcode: '8901234567890', stock: 300 },
      { id: '3', name: 'Ibuprofen 400mg', generic_name: 'Ibuprofen', barcode: '8901122334455', stock: 0 }, // Out of Stock
      { id: '4', name: 'Sensodyne Rapid Relief', generic_name: 'Potassium Nitrate', barcode: '8901030704944', stock: 50 }
    ]

    if (lowercaseSql.includes('where barcode =') || lowercaseSql.includes('barcode = ?')) {
      const barcode = params[0]
      return mockMedicines.filter(m => m.barcode === barcode)
    }

    if (lowercaseSql.includes('where name like') || lowercaseSql.includes('generic_name like')) {
      const search = (params[0] || '').replace(/%/g, '').toLowerCase()
      return mockMedicines.filter(m => m.name.toLowerCase().includes(search) || m.generic_name.toLowerCase().includes(search))
    }

    return mockMedicines
  }

  if (lowercaseSql.includes('select') && lowercaseSql.includes('medicine_batches')) {
    // Mock batches
    const mockBatches = [
      { id: 'b1', medicine_id: '1', batch_number: 'AMX2026', expiry_date: '2028-06-30', price: 120, stock: 100 },
      { id: 'b2', medicine_id: '1', batch_number: 'AMX2027', expiry_date: '2029-01-31', price: 125, stock: 50 },
      { id: 'b3', medicine_id: '2', batch_number: 'PCM998', expiry_date: '2027-12-31', price: 30, stock: 300 },
      { id: 'b4', medicine_id: '4', batch_number: 'SEN881', expiry_date: '2027-09-30', price: 180, stock: 50 }
    ]

    const medId = params[0]
    return mockBatches.filter(b => b.medicine_id === medId).sort((x, y) => new Date(x.expiry_date).getTime() - new Date(y.expiry_date).getTime())
  }

  if (lowercaseSql.includes('update') || lowercaseSql.includes('insert')) {
    return { affectedRows: 1, insertId: 'mock-id' }
  }

  return []
}
