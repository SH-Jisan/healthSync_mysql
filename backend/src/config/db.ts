import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'healthsync',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database successfully.');
    
    // Ensure diagnostic_patients table exists in runtime database
    await connection.query(`
      CREATE TABLE IF NOT EXISTS diagnostic_patients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        diagnostic_id VARCHAR(255) NOT NULL,
        provider_id VARCHAR(255) NOT NULL,
        patient_id VARCHAR(255) NOT NULL,
        FOREIGN KEY (diagnostic_id) REFERENCES \`User\`(id) ON DELETE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES \`User\`(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES \`User\`(id) ON DELETE CASCADE,
        UNIQUE KEY (diagnostic_id, patient_id)
      )
    `);
    console.log('✅ Checked/Created diagnostic_patients table successfully.');
    
    connection.release();
  } catch (error: any) {
    console.error('❌ Database connection/initialization failed:', error.message);
  }
})();

// Helper to escape identifiers safely
export function escapeId(name: string) {
  if (name.includes('.')) {
    return name.split('.').map(part => '`' + part + '`').join('.');
  }
  return '`' + name + '`';
}

// Helper to sanitize data for MySQL (stringifies JSON fields and formats ISO date strings)
export const sanitizeDataForMySQL = (data: any) => {
  if (!data) return data;
  const sanitized = { ...data };
  for (const key in sanitized) {
    const val = sanitized[key];
    if (val !== null && typeof val === 'object') {
      sanitized[key] = JSON.stringify(val);
    } else if (typeof val === 'string' && val.endsWith('Z') && val.includes('T')) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        sanitized[key] = d.toISOString().slice(0, 19).replace('T', ' ');
      }
    }
  }
  return sanitized;
};

// Helper to build MySQL where clause from filter array
export function buildWhereClause(filters: any[]) {
  if (!filters || filters.length === 0) {
    return { whereSql: '1=1', whereParams: [] as any[] };
  }
  const parts: string[] = [];
  const params: any[] = [];

  for (const filter of filters) {
    const col = escapeId(filter.field);
    if (filter.type === 'eq') {
      if (filter.value === null) {
        parts.push(`${col} IS NULL`);
      } else {
        parts.push(`${col} = ?`);
        params.push(filter.value);
      }
    } else if (filter.type === 'neq') {
      if (filter.value === null) {
        parts.push(`${col} IS NOT NULL`);
      } else {
        parts.push(`${col} != ?`);
        params.push(filter.value);
      }
    } else if (filter.type === 'ilike') {
      parts.push(`${col} LIKE ?`);
      params.push(filter.value);
    } else if (filter.type === 'in') {
      const list = filter.value;
      if (Array.isArray(list) && list.length > 0) {
        const placeholders = list.map(() => '?').join(', ');
        parts.push(`${col} IN (${placeholders})`);
        params.push(...list);
      } else {
        parts.push('1=0'); // Force empty list behavior
      }
    }
  }
  return { whereSql: parts.join(' AND '), whereParams: params };
}

export { pool };
