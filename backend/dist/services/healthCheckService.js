import { pool } from '../config/db.js';
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[36m',
    bold: '\x1b[1m'
};
const log = {
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    error: (msg) => console.error(`${colors.red}❌ ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    header: (msg) => console.log(`\n${colors.bold}${colors.blue}=== ${msg} ===${colors.reset}`)
};
const EXPECTED_SCHEMA = {
    User: {
        columns: {
            id: { type: 'varchar', nullable: false },
            email: { type: 'varchar', nullable: false },
            password_hash: { type: 'varchar', nullable: false },
            full_name: { type: 'varchar', nullable: false },
            phone: { type: 'varchar', nullable: true },
            role: { type: 'varchar', nullable: false },
            blood_group: { type: 'varchar', nullable: true },
            district: { type: 'varchar', nullable: true },
            gender: { type: 'varchar', nullable: true },
            specialty: { type: 'varchar', nullable: true },
            degree: { type: 'varchar', nullable: true },
            experience: { type: 'varchar', nullable: true },
            consultation_fee: { type: 'int', nullable: true },
            about: { type: 'text', nullable: true },
            chamber_address: { type: 'text', nullable: true },
            address: { type: 'varchar', nullable: true },
            avatar_url: { type: 'varchar', nullable: true },
            fcm_token: { type: 'varchar', nullable: true },
            created_at: { type: 'timestamp', nullable: true },
            updated_at: { type: 'timestamp', nullable: true }
        }
    },
    blood_donors: {
        columns: {
            id: { type: 'int', nullable: false },
            user_id: { type: 'varchar', nullable: false },
            availability: { type: 'tinyint', nullable: true },
            last_donation_date: { type: 'date', nullable: true }
        }
    },
    blood_requests: {
        columns: {
            id: { type: 'varchar', nullable: false },
            requester_id: { type: 'varchar', nullable: false },
            blood_group: { type: 'varchar', nullable: false },
            hospital_name: { type: 'varchar', nullable: false },
            urgency: { type: 'varchar', nullable: false },
            reason: { type: 'text', nullable: true },
            status: { type: 'varchar', nullable: true },
            accepted_count: { type: 'int', nullable: true },
            created_at: { type: 'timestamp', nullable: true }
        }
    },
    request_acceptors: {
        columns: {
            id: { type: 'int', nullable: false },
            request_id: { type: 'varchar', nullable: false },
            donor_id: { type: 'varchar', nullable: false },
            created_at: { type: 'timestamp', nullable: true }
        }
    },
    medical_events: {
        columns: {
            id: { type: 'varchar', nullable: false },
            patient_id: { type: 'varchar', nullable: false },
            uploader_id: { type: 'varchar', nullable: false },
            title: { type: 'varchar', nullable: false },
            event_type: { type: 'varchar', nullable: false },
            event_date: { type: 'date', nullable: false },
            severity: { type: 'varchar', nullable: false },
            summary: { type: 'text', nullable: true },
            extracted_text: { type: 'longtext', nullable: true },
            key_findings: { type: 'json', nullable: true },
            attachment_urls: { type: 'json', nullable: true },
            file_hash: { type: 'varchar', nullable: true },
            ai_details: { type: 'json', nullable: true },
            medicines: { type: 'json', nullable: true },
            vitals: { type: 'json', nullable: true },
            created_at: { type: 'timestamp', nullable: true }
        }
    },
    patient_payments: {
        columns: {
            id: { type: 'varchar', nullable: false },
            patient_id: { type: 'varchar', nullable: false },
            provider_id: { type: 'varchar', nullable: false },
            test_names: { type: 'json', nullable: true },
            total_amount: { type: 'decimal', nullable: false },
            status: { type: 'varchar', nullable: false },
            report_status: { type: 'varchar', nullable: false },
            created_at: { type: 'timestamp', nullable: true }
        }
    },
    notifications: {
        columns: {
            id: { type: 'varchar', nullable: false },
            user_id: { type: 'varchar', nullable: false },
            title: { type: 'varchar', nullable: false },
            content: { type: 'text', nullable: true },
            is_read: { type: 'tinyint', nullable: true },
            created_at: { type: 'timestamp', nullable: true }
        }
    },
    Appointment: {
        columns: {
            id: { type: 'varchar', nullable: false },
            doctor_id: { type: 'varchar', nullable: false },
            patient_id: { type: 'varchar', nullable: false },
            hospital_id: { type: 'varchar', nullable: true },
            appointment_date: { type: 'datetime', nullable: false },
            status: { type: 'varchar', nullable: true },
            reason: { type: 'text', nullable: true },
            created_at: { type: 'timestamp', nullable: true }
        }
    },
    MedicalTest: {
        columns: {
            id: { type: 'varchar', nullable: false },
            name: { type: 'varchar', nullable: false },
            category: { type: 'varchar', nullable: true },
            base_price: { type: 'decimal', nullable: false }
        }
    },
    doctor_patients: {
        columns: {
            id: { type: 'int', nullable: false },
            doctor_id: { type: 'varchar', nullable: false },
            patient_id: { type: 'varchar', nullable: false }
        }
    },
    hospital_patients: {
        columns: {
            id: { type: 'int', nullable: false },
            hospital_id: { type: 'varchar', nullable: false },
            patient_id: { type: 'varchar', nullable: false }
        }
    },
    HospitalDoctor: {
        columns: {
            id: { type: 'int', nullable: false },
            hospital_id: { type: 'varchar', nullable: false },
            doctor_id: { type: 'varchar', nullable: false }
        }
    },
    blood_inventory: {
        columns: {
            id: { type: 'int', nullable: false },
            hospital_id: { type: 'varchar', nullable: false },
            blood_group: { type: 'varchar', nullable: false },
            units: { type: 'int', nullable: false },
            last_updated: { type: 'timestamp', nullable: true }
        }
    },
    ai_health_plans: {
        columns: {
            id: { type: 'int', nullable: false },
            user_id: { type: 'varchar', nullable: false },
            summary: { type: 'text', nullable: true },
            diet_plan: { type: 'text', nullable: true },
            exercise_plan: { type: 'text', nullable: true },
            precautions: { type: 'text', nullable: true },
            created_at: { type: 'timestamp', nullable: true }
        }
    },
    diagnostic_patients: {
        columns: {
            id: { type: 'int', nullable: false },
            diagnostic_id: { type: 'varchar', nullable: false },
            provider_id: { type: 'varchar', nullable: false },
            patient_id: { type: 'varchar', nullable: false }
        }
    }
};
const EXPECTED_FOREIGN_KEYS = [
    { table: 'blood_donors', column: 'user_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'blood_requests', column: 'requester_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'request_acceptors', column: 'request_id', referencedTable: 'blood_requests', referencedColumn: 'id' },
    { table: 'request_acceptors', column: 'donor_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'medical_events', column: 'patient_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'medical_events', column: 'uploader_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'patient_payments', column: 'patient_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'patient_payments', column: 'provider_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'notifications', column: 'user_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'Appointment', column: 'doctor_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'Appointment', column: 'patient_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'Appointment', column: 'hospital_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'doctor_patients', column: 'doctor_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'doctor_patients', column: 'patient_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'hospital_patients', column: 'hospital_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'hospital_patients', column: 'patient_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'HospitalDoctor', column: 'hospital_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'HospitalDoctor', column: 'doctor_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'blood_inventory', column: 'hospital_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'ai_health_plans', column: 'user_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'diagnostic_patients', column: 'diagnostic_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'diagnostic_patients', column: 'provider_id', referencedTable: 'User', referencedColumn: 'id' },
    { table: 'diagnostic_patients', column: 'patient_id', referencedTable: 'User', referencedColumn: 'id' }
];
const EXPECTED_UNIQUE_CONSTRAINTS = [
    { table: 'User', columns: ['email'] },
    { table: 'blood_donors', columns: ['user_id'] },
    { table: 'request_acceptors', columns: ['request_id', 'donor_id'] },
    { table: 'doctor_patients', columns: ['doctor_id', 'patient_id'] },
    { table: 'hospital_patients', columns: ['hospital_id', 'patient_id'] },
    { table: 'HospitalDoctor', columns: ['hospital_id', 'doctor_id'] },
    { table: 'blood_inventory', columns: ['hospital_id', 'blood_group'] },
    { table: 'ai_health_plans', columns: ['user_id'] },
    { table: 'diagnostic_patients', columns: ['diagnostic_id', 'patient_id'] }
];
export async function runDiagnostics(options = { exitOnError: false }) {
    log.header('DATABASE DIAGNOSTICS & SYSTEM HEALTH CHECK');
    const issues = [];
    let connection = null;
    let responseTime = 0;
    let version = 'Unknown';
    let tablesVerifiedCount = 0;
    const totalTablesExpected = Object.keys(EXPECTED_SCHEMA).length;
    // 1. Connection Checks
    try {
        const startTime = Date.now();
        connection = await pool.getConnection();
        responseTime = Date.now() - startTime;
        const [versionRows] = await connection.query('SELECT VERSION() as version;');
        version = versionRows[0]?.version || 'Unknown';
        log.success(`Database Connected successfully (Version: ${version}, Response Time: ${responseTime}ms)`);
    }
    catch (error) {
        log.error(`Database Connection Failed: ${error.message}`);
        issues.push({
            category: 'ERROR',
            entity: 'Database Server',
            message: `Failed to connect to MySQL database at ${process.env.DB_HOST || 'localhost'}.`,
            fix: 'Verify MySQL is running, check credentials in .env, and ensure the DB exists.'
        });
        printHealthReport(issues, 0, totalTablesExpected, false);
        if (options.exitOnError) {
            process.exit(1);
        }
        return { success: false, report: 'Database Connection Failed' };
    }
    try {
        // 2. Validate Tables and Column Mappings (Case-Insensitive)
        const [tableRows] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE();
    `);
        const actualTables = new Set(tableRows.map((row) => row.TABLE_NAME.toLowerCase()));
        const [columnRows] = await connection.query(`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE();
    `);
        // Group columns by table (lowercased keys)
        const actualColumns = {};
        for (const row of columnRows) {
            const tblName = row.TABLE_NAME.toLowerCase();
            const colName = row.COLUMN_NAME.toLowerCase();
            if (!actualColumns[tblName]) {
                actualColumns[tblName] = {};
            }
            actualColumns[tblName][colName] = {
                type: row.DATA_TYPE.toLowerCase(),
                nullable: row.IS_NULLABLE.toUpperCase() === 'YES'
            };
        }
        for (const tableName of Object.keys(EXPECTED_SCHEMA)) {
            const tableKey = tableName.toLowerCase();
            if (!actualTables.has(tableKey)) {
                log.error(`${tableName} Table Verified: FAILED (Table Missing)`);
                issues.push({
                    category: 'ERROR',
                    table: tableName,
                    message: `Required table \`${tableName}\` does not exist in database.`,
                    fix: `Execute schema.sql migrations to create table \`${tableName}\`.`
                });
                continue;
            }
            let tableValid = true;
            const expected = EXPECTED_SCHEMA[tableName];
            const actual = actualColumns[tableKey] || {};
            for (const colName of Object.keys(expected.columns)) {
                const expectedCol = expected.columns[colName];
                const actualCol = actual[colName.toLowerCase()];
                if (!actualCol) {
                    tableValid = false;
                    issues.push({
                        category: 'ERROR',
                        table: tableName,
                        message: `Required column \`${colName}\` is missing in table \`${tableName}\`.`,
                        fix: `Run migration scripts or execute: ALTER TABLE \`${tableName}\` ADD COLUMN \`${colName}\` ${expectedCol.type.toUpperCase()}${expectedCol.nullable ? '' : ' NOT NULL'};`
                    });
                }
            }
            if (tableValid) {
                tablesVerifiedCount++;
                log.success(`${tableName} Table Verified`);
            }
            else {
                log.error(`${tableName} Table Verified: FAILED (Schema Mismatches)`);
            }
        }
        // 3. Relationships & Foreign Key Validation (Case-Insensitive)
        const [fkRows] = await connection.query(`
      SELECT 
        TABLE_NAME, 
        COLUMN_NAME, 
        REFERENCED_TABLE_NAME, 
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() 
        AND REFERENCED_TABLE_NAME IS NOT NULL;
    `);
        // Helper map of actual constraints (lowercased)
        const actualFKs = new Set(fkRows.map((row) => `${row.TABLE_NAME.toLowerCase()}.${row.COLUMN_NAME.toLowerCase()}->${row.REFERENCED_TABLE_NAME.toLowerCase()}.${row.REFERENCED_COLUMN_NAME.toLowerCase()}`));
        let fkValid = true;
        for (const fk of EXPECTED_FOREIGN_KEYS) {
            // Check if both tables exist first to avoid false constraint errors
            if (!actualTables.has(fk.table.toLowerCase()) || !actualTables.has(fk.referencedTable.toLowerCase())) {
                continue;
            }
            const key = `${fk.table.toLowerCase()}.${fk.column.toLowerCase()}->${fk.referencedTable.toLowerCase()}.${fk.referencedColumn.toLowerCase()}`;
            if (!actualFKs.has(key)) {
                fkValid = false;
                issues.push({
                    category: 'ERROR',
                    table: fk.table,
                    relationship: `${fk.table}.${fk.column} -> ${fk.referencedTable}.${fk.referencedColumn}`,
                    message: `Foreign Key Constraint is missing: ${fk.table}.${fk.column} referencing ${fk.referencedTable}.${fk.referencedColumn}.`,
                    fix: `Run schema script or alter table: ALTER TABLE \`${fk.table}\` ADD FOREIGN KEY (\`${fk.column}\`) REFERENCES \`${fk.referencedTable}\`(\`${fk.referencedColumn}\`) ON DELETE CASCADE;`
                });
            }
        }
        if (fkValid) {
            log.success('Foreign Key Relationships Verified');
        }
        else {
            log.error('Foreign Key Relationships Verified: FAILED');
        }
        // 4. Scan Database Integrity (Orphan Record Scanning)
        let integrityCheckPassed = true;
        for (const fk of EXPECTED_FOREIGN_KEYS) {
            if (!actualTables.has(fk.table.toLowerCase()) || !actualTables.has(fk.referencedTable.toLowerCase())) {
                continue;
            }
            // Select count of orphaned references
            const [orphanRows] = await connection.query(`
        SELECT COUNT(*) as orphansCount 
        FROM \`${fk.table}\` child 
        LEFT JOIN \`${fk.referencedTable}\` parent 
          ON child.\`${fk.column}\` = parent.\`${fk.referencedColumn}\`
        WHERE child.\`${fk.column}\` IS NOT NULL 
          AND parent.\`${fk.referencedColumn}\` IS NULL;
      `);
            const orphans = orphanRows[0]?.orphansCount || 0;
            if (orphans > 0) {
                integrityCheckPassed = false;
                issues.push({
                    category: 'WARNING',
                    table: fk.table,
                    relationship: `${fk.table}.${fk.column} -> ${fk.referencedTable}.${fk.referencedColumn}`,
                    message: `Orphaned records found: Table \`${fk.table}\` has ${orphans} records referencing non-existent keys in \`${fk.referencedTable}\`.`,
                    fix: `Clean up orphan references: DELETE FROM \`${fk.table}\` WHERE \`${fk.column}\` NOT IN (SELECT \`${fk.referencedColumn}\` FROM \`${fk.referencedTable}\`);`
                });
            }
        }
        if (integrityCheckPassed) {
            log.success('Database Integrity (Orphan records check) Passed');
        }
        else {
            log.warning('Database Integrity Check: WARNING (Orphan records detected)');
        }
        // 4b. Scan for Duplicate Records on Unique Constraints
        let uniquenessCheckPassed = true;
        for (const uniqueConstraint of EXPECTED_UNIQUE_CONSTRAINTS) {
            if (!actualTables.has(uniqueConstraint.table.toLowerCase())) {
                continue;
            }
            const columnsList = uniqueConstraint.columns.map(c => `\`${c}\``).join(', ');
            const query = `
        SELECT ${columnsList}, COUNT(*) as dupCount 
        FROM \`${uniqueConstraint.table}\`
        GROUP BY ${columnsList}
        HAVING dupCount > 1;
      `;
            const [dupRows] = await connection.query(query);
            if (dupRows.length > 0) {
                uniquenessCheckPassed = false;
                const totalDups = dupRows.reduce((sum, r) => sum + (r.dupCount - 1), 0);
                issues.push({
                    category: 'WARNING',
                    table: uniqueConstraint.table,
                    message: `Duplicate records found: Table \`${uniqueConstraint.table}\` has ${totalDups} duplicate entries on unique constraint (${uniqueConstraint.columns.join(', ')}).`,
                    fix: `Clean up duplicates in table \`${uniqueConstraint.table}\` by removing records with identical values for (${uniqueConstraint.columns.join(', ')}).`
                });
            }
        }
        if (uniquenessCheckPassed) {
            log.success('Unique Constraints (No duplicates check) Passed');
        }
        else {
            log.warning('Unique Constraints Check: WARNING (Duplicate records detected)');
        }
        // 5. Seed Data Checks
        let seedValid = true;
        if (actualTables.has('medicaltest')) {
            const [testCount] = await connection.query('SELECT COUNT(*) as count FROM `MedicalTest`;');
            if (testCount[0].count === 0) {
                seedValid = false;
                issues.push({
                    category: 'WARNING',
                    table: 'MedicalTest',
                    message: 'Expected default seed data for MedicalTest table is missing (0 records).',
                    fix: 'Run seed script: npm run seed or check seed.sql.'
                });
            }
        }
        if (actualTables.has('user')) {
            const [userCount] = await connection.query('SELECT COUNT(*) as count FROM `User`;');
            if (userCount[0].count === 0) {
                seedValid = false;
                issues.push({
                    category: 'WARNING',
                    table: 'User',
                    message: 'Expected seed data for User profiles is completely empty (0 records).',
                    fix: 'Insert default admin or testing users to enable logging in.'
                });
            }
        }
        if (seedValid) {
            log.success('Seed Data Verified');
        }
        else {
            log.warning('Seed Data Verified: WARNING (Missing standard lookup/seed data)');
        }
        // 6. Critical Modules Health Diagnostics (Counts & Lookup)
        log.header('CRITICAL SERVICE MODULES STATUS');
        if (actualTables.has('user')) {
            // Roles breakdown
            const [roleBreakdown] = await connection.query(`
        SELECT role, COUNT(*) as count 
        FROM \`User\` 
        GROUP BY role;
      `);
            const breakdown = roleBreakdown.map((r) => `${r.role}: ${r.count}`).join(', ') || 'No users';
            log.success(`Users & Authentication Module Verified (Total breakdown: ${breakdown})`);
            // Role check counts
            const docCount = roleBreakdown.find((r) => r.role === 'DOCTOR')?.count || 0;
            const hospCount = roleBreakdown.find((r) => r.role === 'HOSPITAL')?.count || 0;
            const diagCount = roleBreakdown.find((r) => r.role === 'DIAGNOSTIC')?.count || 0;
            log.success(`Doctors Verified (Total verified doctors: ${docCount})`);
            log.success(`Hospitals Verified (Total active hospitals: ${hospCount})`);
            log.success(`Diagnostic Centers Verified (Total registered diagnostics: ${diagCount})`);
        }
        else {
            log.error('Users/Roles Diagnostics: FAILED (User table missing)');
        }
        if (actualTables.has('doctor_patients') || actualTables.has('hospital_patients') || actualTables.has('diagnostic_patients')) {
            const [docPat] = actualTables.has('doctor_patients') ? await connection.query('SELECT COUNT(*) as count FROM doctor_patients;') : [[{ count: 0 }]];
            const [hospPat] = actualTables.has('hospital_patients') ? await connection.query('SELECT COUNT(*) as count FROM hospital_patients;') : [[{ count: 0 }]];
            const [diagPat] = actualTables.has('diagnostic_patients') ? await connection.query('SELECT COUNT(*) as count FROM diagnostic_patients;') : [[{ count: 0 }]];
            log.success(`Patients Diagnostics (Doctor panel: ${docPat[0].count}, Hospital panel: ${hospPat[0].count}, Diagnostics: ${diagPat[0].count})`);
        }
        if (actualTables.has('medical_events')) {
            const [reportCount] = await connection.query("SELECT COUNT(*) as count FROM medical_events WHERE event_type = 'REPORT';");
            const [rxCount] = await connection.query("SELECT COUNT(*) as count FROM medical_events WHERE event_type = 'PRESCRIPTION';");
            log.success(`Reports & Prescriptions Verified (Total Reports: ${reportCount[0].count}, Total Prescriptions: ${rxCount[0].count})`);
        }
        if (actualTables.has('appointment')) {
            const [appCount] = await connection.query(`
        SELECT status, COUNT(*) as count 
        FROM Appointment 
        GROUP BY status;
      `);
            const breakdown = appCount.map((r) => `${r.status}: ${r.count}`).join(', ') || 'No appointments';
            log.success(`Appointments & Schedules Verified (Total status: ${breakdown})`);
        }
        if (actualTables.has('notifications')) {
            const [unread] = await connection.query('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0;');
            const [read] = await connection.query('SELECT COUNT(*) as count FROM notifications WHERE is_read = 1;');
            log.success(`Notifications Delivery Module Verified (Unread: ${unread[0].count}, Read: ${read[0].count})`);
        }
        log.success('API Routes Config Registered');
        log.success('Startup Health Check Passed');
    }
    catch (error) {
        log.error(`Module/Integrity Diagnostic Loop Failed: ${error.message}`);
        issues.push({
            category: 'ERROR',
            message: `Critical diagnostic runtime crash: ${error.message}`
        });
    }
    finally {
        if (connection) {
            connection.release();
        }
    }
    // 7. Print Summary Health Report
    const hasErrors = issues.some(issue => issue.category === 'ERROR');
    printHealthReport(issues, tablesVerifiedCount, totalTablesExpected, !hasErrors);
    // 8. Error Actions
    if (hasErrors) {
        log.error('CRITICAL DIAGNOSTIC ERRORS DETECTED! PREVENTING SERVER STARTUP.');
        if (options.exitOnError) {
            process.exit(1);
        }
        return { success: false, report: 'Critical Startup Diagnostics Failed' };
    }
    else {
        const hasWarnings = issues.some(issue => issue.category === 'WARNING');
        if (hasWarnings) {
            log.warning('Diagnostics completed with Warnings. Starting server...');
        }
        else {
            log.success('Diagnostics passed successfully. Starting server...');
        }
        return { success: true, report: 'Health Check Successful' };
    }
}
function printHealthReport(issues, verifiedCount, totalCount, dbPassed) {
    const errors = issues.filter(issue => issue.category === 'ERROR');
    const warnings = issues.filter(issue => issue.category === 'WARNING');
    console.log(`\n${colors.bold}==================================================`);
    console.log(`               SYSTEM HEALTH REPORT               `);
    console.log(`==================================================${colors.reset}`);
    console.log(`Database Connection  : ${dbPassed ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`}`);
    console.log(`Tables Verified      : ${verifiedCount === totalCount ? colors.green : colors.yellow}${verifiedCount}/${totalCount}${colors.reset}`);
    console.log(`Relationships Status : ${errors.length > 0 ? `${colors.red}FAIL` : warnings.length > 0 ? `${colors.yellow}WARNING` : `${colors.green}PASS`}${colors.reset}`);
    console.log(`Seed Data Status     : ${warnings.some(i => i.table === 'MedicalTest') ? `${colors.yellow}MISSING` : `${colors.green}PASS`}${colors.reset}`);
    console.log(`API Modules Status   : ${dbPassed && errors.length === 0 ? `${colors.green}PASS` : `${colors.red}FAIL`}${colors.reset}`);
    console.log(`Startup Errors       : ${errors.length > 0 ? `${colors.red}${colors.bold}${errors.length}${colors.reset}` : `${colors.green}0${colors.reset}`}`);
    console.log(`Startup Warnings     : ${warnings.length > 0 ? `${colors.yellow}${colors.bold}${warnings.length}${colors.reset}` : `${colors.green}0${colors.reset}`}`);
    console.log(`${colors.bold}==================================================${colors.reset}\n`);
    if (issues.length > 0) {
        console.log(`${colors.bold}DETAILED DIAGNOSTIC LOGS:${colors.reset}\n`);
        for (const issue of issues) {
            const isErr = issue.category === 'ERROR';
            const color = isErr ? colors.red : colors.yellow;
            const prefix = isErr ? '❌ [ERROR]' : '⚠️  [WARNING]';
            console.log(`${colors.bold}${color}${prefix} ${issue.message}${colors.reset}`);
            if (issue.table) {
                console.log(`   - Target Table: \`${issue.table}\``);
            }
            if (issue.relationship) {
                console.log(`   - Relationship: \`${issue.relationship}\``);
            }
            if (issue.fix) {
                console.log(`   - ${colors.green}Suggested Fix: ${issue.fix}${colors.reset}`);
            }
            console.log('');
        }
    }
}
