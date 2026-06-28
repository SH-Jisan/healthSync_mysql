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
        // Helper to safely add column if not exists
        const addColumnSafely = async (table, column, definition) => {
            const [rows] = await connection.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [table, column]);
            if (rows.length === 0) {
                await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
                console.log(`✅ Column '${column}' added to table '${table}'.`);
            }
        };
        // 1. Add new columns to User table
        await addColumnSafely('User', 'national_id', 'VARCHAR(50) UNIQUE NULL');
        await addColumnSafely('User', 'birth_reg_number', 'VARCHAR(50) UNIQUE NULL');
        await addColumnSafely('User', 'passport_number', 'VARCHAR(50) UNIQUE NULL');
        await addColumnSafely('User', 'health_id', 'VARCHAR(50) UNIQUE NULL');
        await addColumnSafely('User', 'allergies', 'TEXT NULL');
        await addColumnSafely('User', 'chronic_diseases', 'TEXT NULL');
        await addColumnSafely('User', 'vaccination_history', 'TEXT NULL');
        await addColumnSafely('User', 'insurance_info', 'TEXT NULL');
        await addColumnSafely('User', 'organ_donor_status', 'VARCHAR(50) NULL');
        await addColumnSafely('User', 'emergency_contact_name', 'VARCHAR(100) NULL');
        await addColumnSafely('User', 'emergency_contact_phone', 'VARCHAR(50) NULL');
        await addColumnSafely('User', 'license_number', 'VARCHAR(100) NULL');
        await addColumnSafely('User', 'license_status', "VARCHAR(50) DEFAULT 'PENDING'");
        await addColumnSafely('Appointment', 'token_number', 'INT NULL');
        // 2. Ensure diagnostic_patients table exists
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
        // 3. Ensure hospital_beds table exists (referencing User)
        await connection.query(`
      CREATE TABLE IF NOT EXISTS hospital_beds (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hospital_id VARCHAR(255) NOT NULL,
        bed_number VARCHAR(50) NOT NULL,
        bed_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
        patient_id VARCHAR(255) NULL,
        assigned_doctor_id VARCHAR(255) NULL,
        admitted_at TIMESTAMP NULL,
        FOREIGN KEY (hospital_id) REFERENCES \`User\`(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES \`User\`(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_doctor_id) REFERENCES \`User\`(id) ON DELETE SET NULL,
        UNIQUE KEY (hospital_id, bed_number)
      )
    `);
        console.log('✅ Checked/Created hospital_beds table successfully.');
        // 4. Ensure hospital_departments table exists
        await connection.query(`
      CREATE TABLE IF NOT EXISTS hospital_departments (
        id VARCHAR(255) PRIMARY KEY,
        hospital_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (hospital_id) REFERENCES \`User\`(id) ON DELETE CASCADE,
        UNIQUE KEY (hospital_id, name)
      )
    `);
        console.log('✅ Checked/Created hospital_departments table successfully.');
        // 5. Ensure hospital_doctor_invitations table exists
        await connection.query(`
      CREATE TABLE IF NOT EXISTS hospital_doctor_invitations (
        id VARCHAR(255) PRIMARY KEY,
        hospital_id VARCHAR(255) NOT NULL,
        doctor_id VARCHAR(255) NOT NULL,
        department_name VARCHAR(255) NOT NULL,
        employment_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (hospital_id) REFERENCES \`User\`(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES \`User\`(id) ON DELETE CASCADE,
        UNIQUE KEY (hospital_id, doctor_id)
      )
    `);
        console.log('✅ Checked/Created hospital_doctor_invitations table successfully.');
        // 6. Ensure doctor_leaves table exists
        await connection.query(`
      CREATE TABLE IF NOT EXISTS doctor_leaves (
        id VARCHAR(255) PRIMARY KEY,
        doctor_id VARCHAR(255) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        leave_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (doctor_id) REFERENCES \`User\`(id) ON DELETE CASCADE
      )
    `);
        console.log('✅ Checked/Created doctor_leaves table successfully.');
        // 7. Ensure patient_admissions table exists
        await connection.query(`
      CREATE TABLE IF NOT EXISTS patient_admissions (
        id VARCHAR(255) PRIMARY KEY,
        hospital_id VARCHAR(255) NOT NULL,
        patient_id VARCHAR(255) NOT NULL,
        department_name VARCHAR(255) NOT NULL,
        admission_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        notes TEXT,
        admitted_at TIMESTAMP NULL,
        discharged_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (hospital_id) REFERENCES \`User\`(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES \`User\`(id) ON DELETE CASCADE
      )
    `);
        console.log('✅ Checked/Created patient_admissions table successfully.');
        // 8. Ensure bed_transfer_logs table exists
        await connection.query(`
      CREATE TABLE IF NOT EXISTS bed_transfer_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hospital_id VARCHAR(255) NOT NULL,
        patient_id VARCHAR(255) NOT NULL,
        previous_bed_number VARCHAR(50) NULL,
        new_bed_number VARCHAR(50) NOT NULL,
        action_by VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (hospital_id) REFERENCES \`User\`(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES \`User\`(id) ON DELETE CASCADE
      )
    `);
        console.log('✅ Checked/Created bed_transfer_logs table successfully.');
        // 9. Ensure diagnostic_orders table exists
        await connection.query(`
      CREATE TABLE IF NOT EXISTS diagnostic_orders (
        id VARCHAR(255) PRIMARY KEY,
        payment_id VARCHAR(255) NOT NULL,
        patient_id VARCHAR(255) NOT NULL,
        diagnostic_id VARCHAR(255) NOT NULL,
        test_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'BOOKED',
        technician_name VARCHAR(255) NULL,
        doctor_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES \`User\`(id) ON DELETE CASCADE,
        FOREIGN KEY (diagnostic_id) REFERENCES \`User\`(id) ON DELETE CASCADE,
        FOREIGN KEY (test_id) REFERENCES MedicalTest(id) ON DELETE CASCADE
      )
    `);
        console.log('✅ Checked/Created diagnostic_orders table successfully.');
        // 10. Ensure audit_logs table exists
        await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NULL,
        action VARCHAR(50) NOT NULL,
        table_name VARCHAR(100) NOT NULL,
        record_id VARCHAR(255) NULL,
        ip_address VARCHAR(45) NULL,
        device_info VARCHAR(255) NULL,
        previous_value LONGTEXT NULL,
        new_value LONGTEXT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Checked/Created audit_logs table successfully.');
        // 11. Ensure doctor_employment_history table exists
        await connection.query(`
      CREATE TABLE IF NOT EXISTS doctor_employment_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        doctor_id VARCHAR(255) NOT NULL,
        hospital_id VARCHAR(255) NOT NULL,
        department_name VARCHAR(255) NOT NULL,
        employment_type VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        notes TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (doctor_id) REFERENCES \`User\`(id) ON DELETE CASCADE,
        FOREIGN KEY (hospital_id) REFERENCES \`User\`(id) ON DELETE CASCADE
      )
    `);
        console.log('✅ Checked/Created doctor_employment_history table successfully.');
        // 12. Ensure patient_referrals table exists
        await connection.query(`
      CREATE TABLE IF NOT EXISTS patient_referrals (
        id VARCHAR(255) PRIMARY KEY,
        referrer_id VARCHAR(255) NOT NULL,
        patient_id VARCHAR(255) NOT NULL,
        target_doctor_id VARCHAR(255) NULL,
        target_hospital_id VARCHAR(255) NULL,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (referrer_id) REFERENCES \`User\`(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES \`User\`(id) ON DELETE CASCADE,
        FOREIGN KEY (target_doctor_id) REFERENCES \`User\`(id) ON DELETE SET NULL,
        FOREIGN KEY (target_hospital_id) REFERENCES \`User\`(id) ON DELETE SET NULL
      )
    `);
        console.log('✅ Checked/Created patient_referrals table successfully.');
        // 13. Ensure ai_chat_sessions table exists
        await connection.query(`
      CREATE TABLE IF NOT EXISTS ai_chat_sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL DEFAULT 'Health Conversation',
        is_pinned BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES \`User\`(id) ON DELETE CASCADE
      )
    `);
        await addColumnSafely('ai_chat_sessions', 'is_pinned', 'BOOLEAN DEFAULT FALSE');
        console.log('✅ Checked/Created ai_chat_sessions table successfully.');
        // 14. Ensure ai_chat_messages table exists
        await connection.query(`
      CREATE TABLE IF NOT EXISTS ai_chat_messages (
        id VARCHAR(255) PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        sender VARCHAR(50) NOT NULL,
        message LONGTEXT NOT NULL,
        referenced_event_id VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (referenced_event_id) REFERENCES medical_events(id) ON DELETE SET NULL
      )
    `);
        console.log('✅ Checked/Created ai_chat_messages table successfully.');
        connection.release();
    }
    catch (error) {
        console.error('❌ Database connection/initialization failed:', error.message);
    }
})();
// Helper to escape identifiers safely
export function escapeId(name) {
    if (name.includes('.')) {
        return name.split('.').map(part => '`' + part + '`').join('.');
    }
    return '`' + name + '`';
}
// Helper to sanitize data for MySQL (stringifies JSON fields and formats ISO date strings)
export const sanitizeDataForMySQL = (data) => {
    if (!data)
        return data;
    const sanitized = { ...data };
    for (const key in sanitized) {
        const val = sanitized[key];
        if (val !== null && typeof val === 'object') {
            sanitized[key] = JSON.stringify(val);
        }
        else if (typeof val === 'string' && val.endsWith('Z') && val.includes('T')) {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
                sanitized[key] = d.toISOString().slice(0, 19).replace('T', ' ');
            }
        }
    }
    return sanitized;
};
// Helper to build MySQL where clause from filter array
export function buildWhereClause(filters) {
    if (!filters || filters.length === 0) {
        return { whereSql: '1=1', whereParams: [] };
    }
    const parts = [];
    const params = [];
    for (const filter of filters) {
        const col = escapeId(filter.field);
        if (filter.type === 'eq') {
            if (filter.value === null) {
                parts.push(`${col} IS NULL`);
            }
            else {
                parts.push(`${col} = ?`);
                params.push(filter.value);
            }
        }
        else if (filter.type === 'neq') {
            if (filter.value === null) {
                parts.push(`${col} IS NOT NULL`);
            }
            else {
                parts.push(`${col} != ?`);
                params.push(filter.value);
            }
        }
        else if (filter.type === 'ilike') {
            parts.push(`${col} LIKE ?`);
            params.push(filter.value);
        }
        else if (filter.type === 'in') {
            const list = filter.value;
            if (Array.isArray(list) && list.length > 0) {
                const placeholders = list.map(() => '?').join(', ');
                parts.push(`${col} IN (${placeholders})`);
                params.push(...list);
            }
            else {
                parts.push('1=0'); // Force empty list behavior
            }
        }
    }
    return { whereSql: parts.join(' AND '), whereParams: params };
}
export { pool };
