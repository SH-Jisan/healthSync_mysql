import { pool } from './config/db.js';
async function runMigration() {
    console.log('🔄 Running Database Migrations...');
    try {
        // 1. Create hospital_beds table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS hospital_beds (
          id INT AUTO_INCREMENT PRIMARY KEY,
          hospital_id VARCHAR(255) NOT NULL,
          bed_number VARCHAR(50) NOT NULL,
          bed_type VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
          patient_id VARCHAR(255) NULL,
          assigned_doctor_id VARCHAR(255) NULL,
          admitted_at TIMESTAMP NULL,
          FOREIGN KEY (hospital_id) REFERENCES profiles(id) ON DELETE CASCADE,
          FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE SET NULL,
          FOREIGN KEY (assigned_doctor_id) REFERENCES profiles(id) ON DELETE SET NULL,
          UNIQUE KEY (hospital_id, bed_number)
      );
    `);
        console.log('✅ Created hospital_beds table.');
        // 2. Create citizen_vitals table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS citizen_vitals (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          blood_pressure_systolic INT NOT NULL,
          blood_pressure_diastolic INT NOT NULL,
          heart_rate INT NOT NULL,
          blood_sugar DECIMAL(5,2) NOT NULL,
          temperature DECIMAL(4,1) NOT NULL,
          weight DECIMAL(5,2) NOT NULL,
          recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
      );
    `);
        console.log('✅ Created citizen_vitals table.');
        // 3. Seed some dummy data for beds if empty
        const [existingBeds] = await pool.query('SELECT count(*) as count FROM hospital_beds');
        if (existingBeds[0].count === 0) {
            // Find a hospital ID from profiles
            const [hospitals] = await pool.query("SELECT id FROM profiles WHERE role = 'HOSPITAL' LIMIT 1");
            if (hospitals.length > 0) {
                const hospitalId = hospitals[0].id;
                const beds = [
                    ['ICU-101', 'ICU', 'AVAILABLE'],
                    ['ICU-102', 'ICU', 'AVAILABLE'],
                    ['ICU-103', 'ICU', 'AVAILABLE'],
                    ['Cabin-201', 'CABIN', 'AVAILABLE'],
                    ['Cabin-202', 'CABIN', 'AVAILABLE'],
                    ['Cabin-203', 'CABIN', 'AVAILABLE'],
                    ['Gen-301', 'GENERAL', 'AVAILABLE'],
                    ['Gen-302', 'GENERAL', 'AVAILABLE'],
                    ['Gen-303', 'GENERAL', 'AVAILABLE'],
                    ['Gen-304', 'GENERAL', 'AVAILABLE']
                ];
                for (const bed of beds) {
                    await pool.query('INSERT INTO hospital_beds (hospital_id, bed_number, bed_type, status) VALUES (?, ?, ?, ?)', [hospitalId, bed[0], bed[1], bed[2]]);
                }
                console.log('✅ Seeded initial beds for hospital:', hospitalId);
            }
        }
        // 4. Seed some dummy vitals for citizen if empty
        const [existingVitals] = await pool.query('SELECT count(*) as count FROM citizen_vitals');
        if (existingVitals[0].count === 0) {
            const [citizens] = await pool.query("SELECT id FROM profiles WHERE role = 'CITIZEN' LIMIT 2");
            for (const citizen of citizens) {
                const citizenId = citizen.id;
                // Insert historical data (last 5 days)
                for (let i = 5; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const bpSystolic = Math.floor(Math.random() * (135 - 115) + 115);
                    const bpDiastolic = Math.floor(Math.random() * (85 - 75) + 75);
                    const heartRate = Math.floor(Math.random() * (85 - 68) + 68);
                    const bloodSugar = (Math.random() * (7.2 - 5.1) + 5.1).toFixed(2);
                    const temp = (Math.random() * (99.2 - 97.8) + 97.8).toFixed(1);
                    const weight = (Math.random() * (76 - 74) + 74).toFixed(1);
                    await pool.query('INSERT INTO citizen_vitals (user_id, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, blood_sugar, temperature, weight, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [citizenId, bpSystolic, bpDiastolic, heartRate, bloodSugar, temp, weight, date]);
                }
            }
            console.log('✅ Seeded initial vitals for testing.');
        }
        console.log('🎉 Migrations successfully completed.');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}
runMigration();
