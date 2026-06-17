import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper for paths
const uploadsDir = path.join(__dirname, 'public/uploads');

// Tiny valid 1x1 PNG image
const pngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Minimal valid PDF text content
const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 50 >>
stream
BT /F1 12 Tf 70 700 Td (Medical Report Details - HealthSync) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000056 00000 n 
0000000111 00000 n 
0000000202 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
302
%%EOF`;

async function main() {
  console.log('🌱 Starting database seeding script...');

  // Database Connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'healthsync',
  });

  try {
    // ----------------------------------------------------
    // 1. Clean up existing tables
    // ----------------------------------------------------
    console.log('🧹 Cleaning existing tables...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = [
      'User', 'blood_donors', 'blood_requests', 'request_acceptors',
      'medical_events', 'patient_payments', 'notifications', 'Appointment',
      'MedicalTest', 'doctor_patients', 'hospital_patients', 'HospitalDoctor',
      'blood_inventory', 'ai_health_plans'
    ];
    for (const table of tables) {
      await connection.query(`TRUNCATE TABLE \`${table}\``);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // ----------------------------------------------------
    // 2. Generate Hashed Password
    // ----------------------------------------------------
    const passwordHash = await bcrypt.hash('password123', 10);
    console.log('🔑 Password hash generated (password: "password123")');

    // ----------------------------------------------------
    // 3. Populate `profiles` (14 records)
    // ----------------------------------------------------
    console.log('👤 Seeding profiles table...');
    
    // UUIDs for relationships
    const uIds = {
      // Citizens (6)
      c1: 'c1111111-1111-1111-1111-111111111111',
      c2: 'c2222222-2222-2222-2222-222222222222',
      c3: 'c3333333-3333-3333-3333-333333333333',
      c4: 'c4444444-4444-4444-4444-444444444444',
      c5: 'c5555555-5555-5555-5555-555555555555',
      c6: 'c6666666-6666-6666-6666-666666666666',
      // Doctors (4)
      d1: 'd1111111-1111-1111-1111-111111111111',
      d2: 'd2222222-2222-2222-2222-222222222222',
      d3: 'd3333333-3333-3333-3333-333333333333',
      d4: 'd4444444-4444-4444-4444-444444444444',
      // Hospitals (2)
      h1: 'h1111111-1111-1111-1111-111111111111',
      h2: 'h2222222-2222-2222-2222-222222222222',
      // Diagnostics (2)
      g1: 'g1111111-1111-1111-1111-111111111111',
      g2: 'g2222222-2222-2222-2222-222222222222',
    };

    const profiles = [
      // Citizens
      [uIds.c1, 'jisan@healthsync.com', passwordHash, 'Jisan Al Hasan', '+8801711111111', 'CITIZEN', 'A+', 'Dhaka', 'Male', null, null, null, null, null, null, 'House 12, Road 5, Dhanmondi, Dhaka', null, null],
      [uIds.c2, 'anisur@healthsync.com', passwordHash, 'Anisur Rahman', '+8801722222222', 'CITIZEN', 'B+', 'Chittagong', 'Male', null, null, null, null, null, null, 'GEC Circle, Chittagong', null, null],
      [uIds.c3, 'munira@healthsync.com', passwordHash, 'Munira Khatun', '+8801733333333', 'CITIZEN', 'O+', 'Sylhet', 'Female', null, null, null, null, null, null, 'Zindabazar, Sylhet', null, null],
      [uIds.c4, 'rizvi@healthsync.com', passwordHash, 'Rizvi Ahmed', '+8801744444444', 'CITIZEN', 'AB-', 'Dhaka', 'Male', null, null, null, null, null, null, 'Mirpur-10, Dhaka', null, null],
      [uIds.c5, 'kabir@healthsync.com', passwordHash, 'Kabir Hossain', '+8801755555555', 'CITIZEN', 'O-', 'Rajshahi', 'Male', null, null, null, null, null, null, 'Kazihata, Rajshahi', null, null],
      [uIds.c6, 'sadia@healthsync.com', passwordHash, 'Sadia Islam', '+8801766666666', 'CITIZEN', 'B-', 'Khulna', 'Female', null, null, null, null, null, null, 'Boyra, Khulna', null, null],
      
      // Doctors
      [uIds.d1, 'nahid@healthsync.com', passwordHash, 'Dr. Nahid Chowdhury', '+8801811111111', 'DOCTOR', null, 'Dhaka', 'Male', 'Cardiology', 'MBBS, FCPS (Cardiology)', '12 Years', 800, 'Senior Cardiologist specializing in interventional cardiology and heart disease prevention.', 'Room 302, Labaid Dhanmondi', 'Dhanmondi, Dhaka', null, null],
      [uIds.d2, 'farhana@healthsync.com', passwordHash, 'Dr. Farhana Yasmin', '+8801822222222', 'DOCTOR', null, 'Dhaka', 'Female', 'Pediatrics', 'MBBS, DCH, FCPS (Pediatrics)', '8 Years', 600, 'Experienced pediatrician dedicated to child development and childhood illness treatment.', 'Room 105, Popular Mirpur', 'Mirpur, Dhaka', null, null],
      [uIds.d3, 'sajjad@healthsync.com', passwordHash, 'Dr. Sajjad Hossain', '+8801833333333', 'DOCTOR', null, 'Chittagong', 'Male', 'Neurology', 'MBBS, MD (Neurology)', '15 Years', 1000, 'Professor of Neurology with extensive expertise in stroke treatment and migraine management.', 'Neuro Chamber, Evercare Ctg', 'Chittagong', null, null],
      [uIds.d4, 'tanjina@healthsync.com', passwordHash, 'Dr. Tanjina Akhtar', '+8801844444444', 'DOCTOR', null, 'Sylhet', 'Female', 'Gynecology', 'MBBS, MS (OBGYN)', '10 Years', 700, 'Specialist gynecologist with expertise in high-risk pregnancies and laproscopic surgery.', 'Room 501, Oasis Sylhet', 'Sylhet', null, null],

      // Hospitals
      [uIds.h1, 'dmch@healthsync.com', passwordHash, 'Dhaka Medical College Hospital', '+88025555555', 'HOSPITAL', null, 'Dhaka', null, null, null, null, null, null, null, 'Ramna, Dhaka-1000', null, null],
      [uIds.h2, 'evercare@healthsync.com', passwordHash, 'Evercare Hospital Dhaka', '+88028401661', 'HOSPITAL', null, 'Dhaka', null, null, null, null, null, null, null, 'Plot 81, Block E, Bashundhara R/A, Dhaka', null, null],

      // Diagnostics
      [uIds.g1, 'labaid@healthsync.com', passwordHash, 'Labaid Diagnostic Center', '+88029676356', 'DIAGNOSTIC', null, 'Dhaka', null, null, null, null, null, null, null, 'House 6, Road 4, Dhanmondi, Dhaka', null, null],
      [uIds.g2, 'popular@healthsync.com', passwordHash, 'Popular Diagnostic Center', '+88029669480', 'DIAGNOSTIC', null, 'Dhaka', null, null, null, null, null, null, null, 'House 16, Road 2, Dhanmondi, Dhaka', null, null],
    ];

    for (const p of profiles) {
      await connection.query(
        `INSERT INTO \`User\` 
         (id, email, password_hash, full_name, phone, role, blood_group, district, gender, specialty, degree, experience, consultation_fee, about, chamber_address, address, avatar_url, fcm_token) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        p
      );
    }

    // ----------------------------------------------------
    // 4. Populate `blood_donors` (10 records)
    // ----------------------------------------------------
    console.log('🩸 Seeding blood_donors table...');
    const donors = [
      [uIds.c1, true, '2026-03-10'],
      [uIds.c2, true, '2026-02-15'],
      [uIds.c3, true, '2026-04-01'],
      [uIds.c4, true, null],
      [uIds.c5, true, '2025-12-20'],
      [uIds.c6, true, null],
      [uIds.d1, false, '2026-01-05'],
      [uIds.d2, true, null],
      [uIds.d3, true, '2026-03-25'],
      [uIds.d4, true, null]
    ];
    for (const d of donors) {
      await connection.query(
        `INSERT INTO blood_donors (user_id, availability, last_donation_date) VALUES (?, ?, ?)`,
        d
      );
    }

    // ----------------------------------------------------
    // 5. Populate `blood_requests` (10 records)
    // ----------------------------------------------------
    console.log('🩸 Seeding blood_requests table...');
    const requestIds = Array.from({ length: 10 }, (_, i) => `req-uuid-00${i + 1}`);
    const bloodRequests = [
      [requestIds[0], uIds.c1, 'B+', 'Dhaka Medical College Hospital', 'CRITICAL', 'Road accident victim needs urgent B+ blood transfusion.', 'OPEN', 2],
      [requestIds[1], uIds.c2, 'A+', 'Evercare Hospital Dhaka', 'NORMAL', 'Elective surgery planned. Need 1 unit of A+ blood.', 'OPEN', 1],
      [requestIds[2], uIds.c3, 'O+', 'Sylhet MAG Osmani Medical College', 'CRITICAL', 'Thalassemia patient needs blood transfusion today.', 'OPEN', 0],
      [requestIds[3], uIds.c4, 'AB-', 'National Heart Foundation', 'CRITICAL', 'Heart bypass surgery scheduled for tomorrow.', 'OPEN', 1],
      [requestIds[4], uIds.c5, 'O-', 'Rajshahi Medical College Hospital', 'CRITICAL', 'Emergency pregnancy complication. Rare group needed.', 'OPEN', 1],
      [requestIds[5], uIds.c6, 'B-', 'Khulna City Hospital', 'NORMAL', 'Anemia patient, blood count low.', 'FULFILLED', 2],
      [requestIds[6], uIds.c1, 'A-', 'Labaid Dhanmondi', 'CRITICAL', 'Cancer patient undergoing chemo.', 'OPEN', 0],
      [requestIds[7], uIds.c2, 'AB+', 'Chittagong Medical College Hospital', 'NORMAL', 'Planned bone surgery.', 'FULFILLED', 1],
      [requestIds[8], uIds.c3, 'O+', 'Mount Adora Hospital Sylhet', 'CRITICAL', 'Postpartum hemorrhage emergency.', 'OPEN', 1],
      [requestIds[9], uIds.c4, 'B+', 'DMCH Burn Unit', 'CRITICAL', 'Burn patient needs plasma/blood.', 'OPEN', 0],
    ];
    for (const r of bloodRequests) {
      await connection.query(
        `INSERT INTO blood_requests (id, requester_id, blood_group, hospital_name, urgency, reason, status, accepted_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        r
      );
    }

    // ----------------------------------------------------
    // 6. Populate `request_acceptors` (10 records)
    // ----------------------------------------------------
    console.log('🤝 Seeding request_acceptors table...');
    const acceptors = [
      [requestIds[0], uIds.c2],
      [requestIds[0], uIds.c3],
      [requestIds[1], uIds.c1],
      [requestIds[3], uIds.c5],
      [requestIds[4], uIds.c4],
      [requestIds[5], uIds.c2],
      [requestIds[5], uIds.c3],
      [requestIds[7], uIds.c1],
      [requestIds[8], uIds.c5],
      [requestIds[1], uIds.d3]
    ];
    for (const a of acceptors) {
      await connection.query(
        `INSERT INTO request_acceptors (request_id, donor_id) VALUES (?, ?)`,
        a
      );
    }

    // ----------------------------------------------------
    // 7. Generate Mock Files on Disk
    // ----------------------------------------------------
    console.log('📁 Creating mock files inside uploads folder...');
    fs.mkdirSync(uploadsDir, { recursive: true });

    // Individual directories for mock uploads
    const userDirs = [uIds.c1, uIds.c2, uIds.c3, uIds.c4, uIds.g1, uIds.g2];
    for (const ud of userDirs) {
      fs.mkdirSync(path.join(uploadsDir, ud), { recursive: true });
    }

    // 10 mock files
    const mockFiles = [
      { relativePath: `${uIds.c1}/cbc_report_2026.pdf`, content: pdfContent, isPdf: true },
      { relativePath: `${uIds.c1}/lipid_profile.png`, content: pngBuffer, isPdf: false },
      { relativePath: `${uIds.c2}/chest_xray.png`, content: pngBuffer, isPdf: false },
      { relativePath: `${uIds.c2}/blood_sugar_report.pdf`, content: pdfContent, isPdf: true },
      { relativePath: `${uIds.c3}/urine_re_report.pdf`, content: pdfContent, isPdf: true },
      { relativePath: `${uIds.c3}/liver_function.pdf`, content: pdfContent, isPdf: true },
      { relativePath: `${uIds.c4}/thyroid_t3_t4.png`, content: pngBuffer, isPdf: false },
      { relativePath: `${uIds.c4}/kidney_creatinine.pdf`, content: pdfContent, isPdf: true },
      { relativePath: `${uIds.g1}/ecg_reading.png`, content: pngBuffer, isPdf: false },
      { relativePath: `${uIds.g2}/usg_abdomen.pdf`, content: pdfContent, isPdf: true },
    ];

    for (const mf of mockFiles) {
      const fullPath = path.join(uploadsDir, mf.relativePath);
      fs.writeFileSync(fullPath, mf.content);
    }
    console.log('📁 Successfully created 10 mock files (5 PDFs, 5 PNGs).');

    // ----------------------------------------------------
    // 8. Populate `medical_events` (10 records)
    // ----------------------------------------------------
    console.log('📑 Seeding medical_events table...');
    const eventIds = Array.from({ length: 10 }, (_, i) => `evt-uuid-00${i + 1}`);

    const baseEventUrl = (relPath) => `${process.env.VITE_SUPABASE_URL || 'http://localhost:5000'}/uploads/${relPath}`;

    const medicalEvents = [
      // 1. CBC Report
      [
        eventIds[0], uIds.c1, uIds.g1, 'Complete Blood Count (CBC) Report', 'REPORT', '2026-05-10', 'LOW',
        'Normal CBC report, hemoglobin level looks good.',
        'CBC REPORT\nHemoglobin: 14.5 g/dL (Normal)\nWBC Count: 6,500 /uL (Normal)\nPlatelets: 250,000 /uL (Normal)',
        JSON.stringify(['Hemoglobin: 14.5 g/dL', 'WBC: 6,500', 'Platelet: 250k']),
        JSON.stringify([baseEventUrl(`${uIds.c1}/cbc_report_2026.pdf`)]),
        'hash-cbc-report-abc-123',
        JSON.stringify({
          title: 'CBC Report',
          event_type: 'REPORT',
          event_date: '2026-05-10',
          severity: 'LOW',
          simple_explanation_en: 'All blood components including white cells, red cells, and platelets are in perfect normal range.',
          simple_explanation_bn: 'রক্তের সব উপাদান যেমন লোহিত রক্তকণিকা, শ্বেত রক্তকণিকা এবং অণুচক্রিকা স্বাভাবিক সীমার মধ্যে আছে।',
          detailed_analysis_en: 'Hemoglobin: 14.5 g/dL (Ref: 13.8 - 17.2). WBC: 6.5 k/uL (Ref: 4.5 - 11.0). Platelets: 250 k/uL (Ref: 150 - 450).',
          detailed_analysis_bn: 'হিমোগ্লোবিন: ১৪.৫ (স্বাভাবিক)। শ্বেতকণিকা: ৬,৫০০ (স্বাভাবিক)। অণুচক্রিকা: ২.৫ লাখ (স্বাভাবিক)।',
          disease_insight_en: 'No specific disease can be confidently identified from this document alone.',
          disease_insight_bn: 'এই রিপোর্ট থেকে নির্দিষ্ট কোনো রোগের লক্ষণ পাওয়া যায়নি।',
          extracted_text: 'CBC REPORT\nHemoglobin: 14.5 g/dL\nWBC: 6,500 /uL\nPlatelets: 250,000 /uL',
          key_findings: ['Hemoglobin: 14.5', 'WBC: 6,500', 'Platelets: 250k'],
          medicine_safety_check: 'N/A'
        }),
        null, null
      ],
      // 2. Cardiology Prescription
      [
        eventIds[1], uIds.c1, uIds.d1, 'Prescription for High Blood Pressure', 'PRESCRIPTION', '2026-05-12', 'MEDIUM',
        'Prescription for hypertension. Advised low salt diet.',
        'Rx\n1. Tab. Olmetec 20mg (1+0+0) - After meal - 1 Month\n2. Tab. Lipiget 10mg (0+0+1) - Night - 1 Month',
        JSON.stringify(['Hypertension', 'Lipid Management']),
        null, null,
        JSON.stringify({
          title: 'Prescription for Hypertension',
          event_type: 'PRESCRIPTION',
          event_date: '2026-05-12',
          severity: 'MEDIUM',
          simple_explanation_en: 'Blood pressure medicine prescribed. Please take Olmetec in the morning and Lipiget at night.',
          simple_explanation_bn: 'রক্তচাপের ওষুধ দেওয়া হয়েছে। সকালে ওলমেটেক এবং রাতে লিপিগেট সেবন করুন।',
          detailed_analysis_en: 'Olmesartan 20mg daily for blood pressure control. Atorvastatin 10mg nightly for cholesterol regulation.',
          detailed_analysis_bn: 'উচ্চ রক্তচাপ নিয়ন্ত্রণের জন্য ওলমেসারটান ২০ মিগ্রা। কোলেস্টেরল কমানোর জন্য অ্যাটোরভাস্টাটিন ১০ মিগ্রা।',
          disease_insight_en: 'Hypertension (High Blood Pressure). Serious if untreated. Avoid high salt foods.',
          disease_insight_bn: 'উচ্চ রক্তচাপ। চিকিৎসা না করলে মারাত্মক হতে পারে। কাঁচা লবণ এড়িয়ে চলুন।',
          extracted_text: 'Rx\nOlmetec 20mg (1+0+0)\nLipiget 10mg (0+0+1)',
          key_findings: ['Hypertension', 'Lipid Control'],
          medicine_safety_check: 'Safe'
        }),
        JSON.stringify([
          { name: 'Olmetec 20mg', dosage: '1+0+0', duration: '30 Days', instruction: 'After breakfast' },
          { name: 'Lipiget 10mg', dosage: '0+0+1', duration: '30 Days', instruction: 'At bedtime' }
        ]),
        JSON.stringify({ bp: '140/90', hr: '78', temp: '98.6', weight: '74' })
      ],
      // 3. Lipid Profile
      [
        eventIds[2], uIds.c1, uIds.g1, 'Lipid Profile Report', 'REPORT', '2026-05-15', 'MEDIUM',
        'Cholesterol is slightly elevated. Advised exercise.',
        'LIPID PROFILE\nTotal Cholesterol: 220 mg/dL (High)\nTriglycerides: 180 mg/dL (High)\nLDL: 145 mg/dL (High)\nHDL: 42 mg/dL (Normal)',
        JSON.stringify(['Cholesterol: 220', 'Triglycerides: 180', 'LDL: 145']),
        JSON.stringify([baseEventUrl(`${uIds.c1}/lipid_profile.png`)]),
        'hash-lipid-profile-xyz-456',
        JSON.stringify({
          title: 'Lipid Profile',
          event_type: 'REPORT',
          event_date: '2026-05-15',
          severity: 'MEDIUM',
          simple_explanation_en: 'Cholesterol levels are slightly high. Need to reduce oily food and walk daily.',
          simple_explanation_bn: 'রক্তে চর্বি বা কোলেস্টেরলের মাত্রা কিছুটা বেশি। তৈলাক্ত খাবার কমান ও নিয়মিত হাঁটুন।',
          detailed_analysis_en: 'Total Cholesterol is 220 mg/dL (normal < 200). LDL (bad cholesterol) is 145 mg/dL (normal < 100).',
          detailed_analysis_bn: 'মোট কোলেস্টেরল ২২০ মিগ্রা/ডেসি (স্বাভাবিক < ২০০)। এলডিএল ১৪৫ মিগ্রা/ডেসি (স্বাভাবিক < ১০০)।',
          disease_insight_en: 'Hypercholesterolemia. Elevated cholesterol. Seriousness: Moderate. Main cause: Diet & lack of exercise.',
          disease_insight_bn: 'হাইপারকোলেস্টেরলেমিয়া (রক্তে উচ্চ কোলেস্টেরল)। গুরুত্ব: মাঝারি। কারণ: চর্বিযুক্ত খাবার ও শরীরচর্চার অভাব।',
          extracted_text: 'LIPID PROFILE\nCholesterol: 220\nTriglycerides: 180\nLDL: 145\nHDL: 42',
          key_findings: ['High Cholesterol', 'High LDL', 'High Triglycerides'],
          medicine_safety_check: 'N/A'
        }),
        null, null
      ],
      // 4. Diabetes Check
      [
        eventIds[3], uIds.c2, uIds.g2, 'Fasting Blood Sugar (FBS)', 'REPORT', '2026-04-20', 'HIGH',
        'High fasting blood sugar detected. Needs diabetes specialist referral.',
        'GLUCOSE FASTING\nFasting Blood Sugar: 8.2 mmol/L (Diabetic)',
        JSON.stringify(['Blood Sugar: 8.2 mmol/L']),
        JSON.stringify([baseEventUrl(`${uIds.c2}/blood_sugar_report.pdf`)]),
        'hash-fbs-sugar-def-789',
        JSON.stringify({
          title: 'Fasting Blood Sugar',
          event_type: 'REPORT',
          event_date: '2026-04-20',
          severity: 'HIGH',
          simple_explanation_en: 'Fasting blood sugar is high. This is in diabetic range. Please consult a doctor.',
          simple_explanation_bn: 'খালি পেটে রক্তের শর্করা বেশি। এটি ডায়াবেটিসের লক্ষণ। ডাক্তারের পরামর্শ নিন।',
          detailed_analysis_en: 'Fasting Glucose is 8.2 mmol/L (Ref: 4.0 - 6.1 mmol/L). Indicates impaired fasting glucose / Type 2 Diabetes.',
          detailed_analysis_bn: 'খালি পেটে গ্লুকোজ ৮.২ মিলিমোল/লিটার (স্বাভাবিক ৪.০ - ৬.১)। এটি টাইপ ২ ডায়াবেটিস নির্দেশ করে।',
          disease_insight_en: 'Diabetes Mellitus. High blood glucose. Seriousness: High. Primary cause: Insulin resistance.',
          disease_insight_bn: 'ডায়াবেটিস মেলাইটাস। রক্তে উচ্চ শর্করার পরিমাণ। গুরুত্ব: উচ্চ। কারণ: ইনসুলিন রেজিস্ট্যান্স।',
          extracted_text: 'FASTING GLUCOSE\nResult: 8.2 mmol/L',
          key_findings: ['FBS: 8.2 mmol/L (Diabetic)'],
          medicine_safety_check: 'N/A'
        }),
        null, null
      ],
      // 5. Pediatric Test Order
      [
        eventIds[4], uIds.c2, uIds.d2, 'Pediatric Test Request', 'TEST_ORDER', '2026-04-22', 'LOW',
        'Suggested CBC and Urine RE tests for fever.',
        'Test Order:\n1. Complete Blood Count (CBC)\n2. Urine Routine Examination',
        JSON.stringify(['CBC', 'Urine RE']),
        null, null,
        JSON.stringify({
          title: 'Pediatric Test Order',
          event_type: 'TEST_ORDER',
          event_date: '2026-04-22',
          severity: 'LOW',
          simple_explanation_en: 'Doctor ordered CBC and Urine test to check for any underlying infection causing fever.',
          simple_explanation_bn: 'জ্বরের কারণ হিসেবে কোনো ইনফেকশন আছে কিনা তা দেখতে ডাক্তার সিবিসি ও প্রস্রাবের টেস্ট দিয়েছেন।',
          detailed_analysis_en: 'Ordering complete blood count to rule out leukocytosis. Urine routine examination to check for UTI.',
          detailed_analysis_bn: 'শ্বেতকণিকার আধিক্য দেখতে সিবিসি। ইউরিনারি ইনফেকশন চেক করতে প্রস্রাব পরীক্ষা।',
          disease_insight_en: 'No specific disease can be confidently identified from this document alone.',
          disease_insight_bn: 'নির্দিষ্ট কোনো রোগ নির্ধারণ সম্ভব নয়।',
          extracted_text: 'TEST ORDER\nCBC, Urine RE',
          key_findings: ['CBC Ordered', 'Urine RE Ordered'],
          medicine_safety_check: 'N/A'
        }),
        null,
        JSON.stringify({ bp: '100/60', hr: '90', temp: '101.2', weight: '22' })
      ],
      // 6. Chest X-Ray
      [
        eventIds[5], uIds.c2, uIds.g2, 'Chest X-Ray Imaging', 'REPORT', '2026-04-25', 'MEDIUM',
        'Mild chest infection detected. Lungs mostly clear.',
        'CHEST X-RAY PA VIEW\nFindings: Mild bronchovascular markings. No active consolidation or pleural effusion.',
        JSON.stringify(['Mild chest infection', 'No active consolidation']),
        JSON.stringify([baseEventUrl(`${uIds.c2}/chest_xray.png`)]),
        'hash-xray-chest-ghi-012',
        JSON.stringify({
          title: 'Chest X-Ray PA View',
          event_type: 'REPORT',
          event_date: '2026-04-25',
          severity: 'MEDIUM',
          simple_explanation_en: 'Lungs look mostly fine, but there is a mild chest infection. Warm fluids advised.',
          simple_explanation_bn: 'ফুসফুস সাধারণত ভালো আছে, তবে হালকা বুক ও শ্বাসনালীর ইনফেকশন রয়েছে। কুসুম গরম তরল খাওয়ার পরামর্শ দেওয়া হলো।',
          detailed_analysis_en: 'Chest X-ray shows minor increase in bronchovascular markings. Normal cardiac size. Lungs are clear of active consolidation.',
          detailed_analysis_bn: 'বুকের এক্স-রেতে সামান্য ব্রঙ্কোভাস্কুলার মার্কিং বেড়েছে। হার্টের সাইজ স্বাভাবিক। ফুসফুসে কোনো পানি জমেনি।',
          disease_insight_en: 'Mild Bronchitis. Airway inflammation. Seriousness: Low to Moderate. Avoid cold environment.',
          disease_insight_bn: 'হালকা ব্রঙ্কাইটিস (শ্বাসনালীর প্রদাহ)। গুরুত্ব: কম থেকে মাঝারি। ঠান্ডা পরিবেশ এড়িয়ে চলুন।',
          extracted_text: 'CHEST X-RAY PA\nLungs clear. Mild markings.',
          key_findings: ['Mild Bronchovascular Markings'],
          medicine_safety_check: 'N/A'
        }),
        null, null
      ],
      // 7. Urine Infection Test
      [
        eventIds[6], uIds.c3, uIds.g2, 'Urine Routine Examination', 'REPORT', '2026-03-05', 'MEDIUM',
        'Pus cells detected in urine, indicating UTI.',
        'URINE RE\nAppearance: Turbid\nPus Cells: 8-10 /HPF (High)\nEpithelial Cells: 3-4 /HPF',
        JSON.stringify(['Pus Cells: 8-10', 'Turbid']),
        JSON.stringify([baseEventUrl(`${uIds.c3}/urine_re_report.pdf`)]),
        'hash-urine-re-jkl-345',
        JSON.stringify({
          title: 'Urine Routine Examination',
          event_type: 'REPORT',
          event_date: '2026-03-05',
          severity: 'MEDIUM',
          simple_explanation_en: 'Urine report shows pus cells. This indicates a urinary tract infection. Drink plenty of water.',
          simple_explanation_bn: 'প্রস্রাবের রিপোর্টে পুঁজ বা পাস সেল পাওয়া গেছে। এটি ইউরিন ইনফেকশন নির্দেশ করে। প্রচুর পানি পান করুন।',
          detailed_analysis_en: 'Pus cells: 8-10 /HPF (Ref: 0-5). Suggests acute cystitis / Urinary Tract Infection.',
          detailed_analysis_bn: 'পাস সেল: ৮-১০ (স্বাভাবিক ০-৫)। এটি তীব্র ইউরিন ইনফেকশন (UTI) নির্দেশ করে।',
          disease_insight_en: 'Urinary Tract Infection (UTI). Bacterial infection. Seriousness: Moderate. Main cause: Poor hydration / hygiene.',
          disease_insight_bn: 'ইউরিনারি ট্র্যাক্ট ইনফেকশন (প্রসাবের ইনফেকশন)। ব্যাকটেরিয়াজনিত রোগ। গুরুত্ব: মাঝারি। কারণ: পানি কম খাওয়া।',
          extracted_text: 'URINE RE\nPus cells: 8-10',
          key_findings: ['High Pus Cells (UTI)'],
          medicine_safety_check: 'N/A'
        }),
        null, null
      ],
      // 8. Liver Function
      [
        eventIds[7], uIds.c3, uIds.g2, 'Liver Function Test (LFT)', 'REPORT', '2026-03-08', 'MEDIUM',
        'SGPT/ALT slightly high. Liver functions mostly stable.',
        'LIVER FUNCTION TEST\nSGPT (ALT): 55 U/L (High)\nSGOT (AST): 40 U/L (Normal)\nBilirubin: 0.9 mg/dL (Normal)',
        JSON.stringify(['SGPT (ALT): 55', 'Normal Bilirubin']),
        JSON.stringify([baseEventUrl(`${uIds.c3}/liver_function.pdf`)]),
        'hash-lft-liver-mno-678',
        JSON.stringify({
          title: 'Liver Function Test',
          event_type: 'REPORT',
          event_date: '2026-03-08',
          severity: 'MEDIUM',
          simple_explanation_en: 'One of the liver enzymes (SGPT) is slightly high. Avoid junk and heavy foods.',
          simple_explanation_bn: 'লিভারের এনজাইম (SGPT) কিছুটা বেশি। বাইরের অস্বাস্থ্যকর ও রিচ ফুড পরিহার করুন।',
          detailed_analysis_en: 'SGPT (ALT) is 55 U/L (Ref: < 41 U/L). Mild liver irritation. Bilirubin is normal at 0.9 mg/dL.',
          detailed_analysis_bn: 'এসজিপিটি (ALT) ৫৫ ইউ/লি (স্বাভাবিক < ৪১)। লিভারের উপর সামান্য ধকল গেছে। বিলিরুবিন স্বাভাবিক।',
          disease_insight_en: 'Fatty Liver / Mild Hepatotoxicity. Seriousness: Low. Main cause: Sedentary lifestyle / rich food.',
          disease_insight_bn: 'ফ্যাটি লিভার / লিভারের উপর সামান্য ধকল। গুরুত্ব: কম। কারণ: অনিয়ন্ত্রিত খাদ্যাভ্যাস ও অলস জীবনযাপন।',
          extracted_text: 'LFT\nSGPT: 55, SGOT: 40, Bilirubin: 0.9',
          key_findings: ['Slightly Elevated SGPT'],
          medicine_safety_check: 'N/A'
        }),
        null, null
      ],
      // 9. Kidney Function Check
      [
        eventIds[8], uIds.c4, uIds.g2, 'Serum Creatinine (Kidney)', 'REPORT', '2026-02-12', 'LOW',
        'Kidney function is perfect. Normal creatinine level.',
        'KIDNEY PANEL\nSerum Creatinine: 0.85 mg/dL (Normal)\nUrea: 28 mg/dL (Normal)',
        JSON.stringify(['Creatinine: 0.85 (Normal)', 'Urea: 28']),
        JSON.stringify([baseEventUrl(`${uIds.c4}/kidney_creatinine.pdf`)]),
        'hash-kidney-crea-pqr-901',
        JSON.stringify({
          title: 'Serum Creatinine Test',
          event_type: 'REPORT',
          event_date: '2026-02-12',
          severity: 'LOW',
          simple_explanation_en: 'Your kidney function is in perfect health. Creatinine levels are excellent.',
          simple_explanation_bn: 'আপনার কিডনির কার্যকারিতা একদম স্বাভাবিক এবং চমৎকার অবস্থায় আছে।',
          detailed_analysis_en: 'Creatinine is 0.85 mg/dL (Ref: 0.60 - 1.20 mg/dL). Urea is 28 mg/dL (Ref: 15 - 45). Normal GFR.',
          detailed_analysis_bn: 'ক্রিয়েটিনিন ০.৮৫ মিগ্রা/ডেসি (স্বাভাবিক ০.৬ - ১.২)। ইউরিয়া ২৮ (স্বাভাবিক ১৫-৪৫)। কিডনি সুস্থ।',
          disease_insight_en: 'No specific disease can be confidently identified from this document alone.',
          disease_insight_bn: 'কিডনি সুস্থ আছে, কোনো রোগ নেই।',
          extracted_text: 'CREATININE: 0.85\nUREA: 28',
          key_findings: ['Creatinine: 0.85 (Normal)'],
          medicine_safety_check: 'N/A'
        }),
        null, null
      ],
      // 10. Gynecology Prescription
      [
        eventIds[9], uIds.c3, uIds.d4, 'Antenatal Checkup Prescription', 'PRESCRIPTION', '2026-03-10', 'LOW',
        'Routine antenatal checkup. Prescribed iron and calcium.',
        'Rx\n1. Tab. Fefol (Iron + Folic Acid) (0+1+0) - After lunch - 3 Months\n2. Tab. Calbo-D (0+0+1) - Night - 3 Months',
        JSON.stringify(['Pregnancy Care', 'Supplements']),
        null, null,
        JSON.stringify({
          title: 'Pregnancy Routine Prescription',
          event_type: 'PRESCRIPTION',
          event_date: '2026-03-10',
          severity: 'LOW',
          simple_explanation_en: 'Routine pregnancy supplements prescribed. Please take Iron after lunch and Calcium at night.',
          simple_explanation_bn: 'গর্ভাবস্থার জন্য সাধারণ ভিটামিন ও ক্যালসিয়াম দেওয়া হয়েছে। দুপুরে আয়রন ও রাতে ক্যালসিয়াম সেবন করুন।',
          detailed_analysis_en: 'Iron and Folic Acid supplement to support maternal hemoglobin. Calcium carbonate with Vitamin D3 for fetal bone support.',
          detailed_analysis_bn: 'হিমোগ্লোবিন বাড়াতে আয়রন ও ফলিক এসিড। গর্ভের শিশুর হাড় গঠনে ভিটামিন ডি৩ সহ ক্যালসিয়াম।',
          disease_insight_en: 'Pregnancy / Antenatal Care. Healthy prenatal condition. Seriousness: Low/Routine.',
          disease_insight_bn: 'গর্ভাবস্থা / প্রসবপূর্ব সাধারণ যত্ন। এটি স্বাভাবিক অবস্থা। গুরুত্ব: কম/রুটিন চেকআপ।',
          extracted_text: 'Rx\nFefol (0+1+0)\nCalbo-D (0+0+1)',
          key_findings: ['Iron Supplement', 'Calcium Support'],
          medicine_safety_check: 'Safe'
        }),
        JSON.stringify([
          { name: 'Fefol (Iron+Folic)', dosage: '0+1+0', duration: '90 Days', instruction: 'After lunch' },
          { name: 'Calbo-D', dosage: '0+0+1', duration: '90 Days', instruction: 'After dinner' }
        ]),
        JSON.stringify({ bp: '110/70', hr: '80', temp: '98.4', weight: '65' })
      ]
    ];

    for (const me of medicalEvents) {
      await connection.query(
        `INSERT INTO medical_events 
         (id, patient_id, uploader_id, title, event_type, event_date, severity, summary, extracted_text, key_findings, attachment_urls, file_hash, ai_details, medicines, vitals) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        me
      );
    }

    // ----------------------------------------------------
    // 9. Populate `patient_payments` (10 records)
    // ----------------------------------------------------
    console.log('💳 Seeding patient_payments table...');
    const payIds = Array.from({ length: 10 }, (_, i) => `pay-uuid-00${i + 1}`);
    const payments = [
      [payIds[0], uIds.c1, uIds.g1, JSON.stringify(['Complete Blood Count (CBC)']), 400.00, 'PAID', 'COMPLETED', '2026-05-10 10:30:00'],
      [payIds[1], uIds.c1, uIds.g1, JSON.stringify(['Lipid Profile']), 1000.00, 'PAID', 'COMPLETED', '2026-05-15 11:20:00'],
      [payIds[2], uIds.c2, uIds.g2, JSON.stringify(['Fasting Blood Sugar (FBS)']), 150.00, 'PAID', 'COMPLETED', '2026-04-20 09:00:00'],
      [payIds[3], uIds.c2, uIds.g2, JSON.stringify(['X-Ray Chest PA View']), 600.00, 'PAID', 'COMPLETED', '2026-04-25 14:10:00'],
      [payIds[4], uIds.c3, uIds.g2, JSON.stringify(['Urine Routine Examination']), 200.00, 'PAID', 'COMPLETED', '2026-03-05 08:45:00'],
      [payIds[5], uIds.c3, uIds.g2, JSON.stringify(['Liver Function Test (LFT)']), 1200.00, 'PAID', 'COMPLETED', '2026-03-08 09:15:00'],
      [payIds[6], uIds.c4, uIds.g2, JSON.stringify(['Serum Creatinine']), 300.00, 'PAID', 'COMPLETED', '2026-02-12 10:00:00'],
      [payIds[7], uIds.c4, uIds.g2, JSON.stringify(['Ultrasonography (USG) of Whole Abdomen']), 1500.00, 'DUE', 'PENDING', '2026-06-14 15:30:00'],
      [payIds[8], uIds.c1, uIds.g1, JSON.stringify(['ECG / Electrocardiogram']), 500.00, 'DUE', 'PENDING', '2026-06-15 11:00:00'],
      [payIds[9], uIds.c5, uIds.g1, JSON.stringify(['HbA1c', 'Complete Blood Count (CBC)']), 1200.00, 'DUE', 'PENDING', '2026-06-15 12:00:00'],
    ];

    for (const py of payments) {
      await connection.query(
        `INSERT INTO patient_payments (id, patient_id, provider_id, test_names, total_amount, status, report_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        py
      );
    }

    // ----------------------------------------------------
    // 10. Populate `notifications` (10 records)
    // ----------------------------------------------------
    console.log('🔔 Seeding notifications table...');
    const notifIds = Array.from({ length: 10 }, (_, i) => `notif-uuid-00${i + 1}`);
    const notifications = [
      [notifIds[0], uIds.c1, '🩸 Urgent Blood Request Match!', 'A patient at Dhaka Medical College Hospital needs B+ blood. Tap to accept and help.', false, '2026-06-15 21:00:00'],
      [notifIds[1], uIds.c2, '🩸 Blood Request Accepted', 'Your blood request for A+ has been accepted by Kabir Hossain.', false, '2026-06-15 21:10:00'],
      [notifIds[2], uIds.c3, '📑 Diagnostic Report Ready', 'Your Liver Function Test (LFT) report is ready. You can now view it in your timeline.', true, '2026-03-08 17:00:00'],
      [notifIds[3], uIds.c4, '📅 Appointment Confirmed', 'Your appointment with Dr. Nahid Chowdhury on 2026-06-20 has been confirmed.', false, '2026-06-15 15:00:00'],
      [notifIds[4], uIds.d1, '📅 New Appointment Request', 'You have a new appointment booking request from Jisan Al Hasan for 2026-06-18.', false, '2026-06-15 16:30:00'],
      [notifIds[5], uIds.c1, '💊 Medicine Safety Alert', 'AI detected possible high dose warning for Lipiget. Review with doctor.', true, '2026-05-12 10:10:00'],
      [notifIds[6], uIds.c2, '🩺 Test Order Issued', 'Dr. Farhana Yasmin has issued a new test order for CBC and Urine RE.', true, '2026-04-22 12:35:00'],
      [notifIds[7], uIds.d2, '📅 Appointment Cancelled', 'Appointment with Kabir Hossain for 2026-06-17 was cancelled by the patient.', false, '2026-06-15 19:45:00'],
      [notifIds[8], uIds.c3, '🧬 Health Routine Available', 'A new daily nutrition and exercise plan has been generated based on your UTI diagnosis.', false, '2026-06-15 20:30:00'],
      [notifIds[9], uIds.c5, '🩸 Critical Need Near You', 'Emergency O- blood request matching your group at Rajshahi RMCH.', false, '2026-06-15 22:00:00'],
    ];

    for (const nt of notifications) {
      await connection.query(
        `INSERT INTO notifications (id, user_id, title, content, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        nt
      );
    }

    // ----------------------------------------------------
    // 11. Populate `appointments` (10 records)
    // ----------------------------------------------------
    console.log('📅 Seeding appointments table...');
    const appIds = Array.from({ length: 10 }, (_, i) => `app-uuid-00${i + 1}`);
    const appointments = [
      [appIds[0], uIds.d1, uIds.c1, uIds.h1, '2026-06-18 10:00:00', 'Accepted', 'Routine cardiac review checkup.'],
      [appIds[1], uIds.d1, uIds.c4, uIds.h1, '2026-06-20 11:30:00', 'CONFIRMED', 'Chest pain consultation.'],
      [appIds[2], uIds.d2, uIds.c2, uIds.h2, '2026-06-19 15:30:00', 'PENDING', 'Fever checkup for baby.'],
      [appIds[3], uIds.d3, uIds.c3, uIds.h2, '2026-06-22 17:00:00', 'Accepted', 'Migraine follow-up.'],
      [appIds[4], uIds.d4, uIds.c3, uIds.h1, '2026-06-25 09:30:00', 'CONFIRMED', 'Antenatal care 2nd trimester check.'],
      [appIds[5], uIds.d2, uIds.c5, uIds.h2, '2026-06-21 16:00:00', 'CANCELLED', 'Routine weight review.'],
      [appIds[6], uIds.d3, uIds.c1, uIds.h2, '2026-06-24 18:00:00', 'PENDING', 'Sleep disorder consultation.'],
      [appIds[7], uIds.d4, uIds.c6, uIds.h1, '2026-06-27 10:30:00', 'PENDING', 'PCOS consultancy.'],
      [appIds[8], uIds.d1, uIds.c5, uIds.h1, '2026-06-29 11:00:00', 'CONFIRMED', 'Heart health checkup.'],
      [appIds[9], uIds.d3, uIds.c2, uIds.h2, '2026-06-30 14:00:00', 'Accepted', 'Post-stroke follow-up review.']
    ];

    for (const ap of appointments) {
      await connection.query(
        `INSERT INTO Appointment (id, doctor_id, patient_id, hospital_id, appointment_date, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ap
      );
    }

    // ----------------------------------------------------
    // 12. Populate `available_tests` (10 records)
    // ----------------------------------------------------
    console.log('🩺 Seeding available_tests table...');
    // Seeding is already done in schema, but ensuring matching lookup IDs
    const tests = [
      ['test-1', 'Complete Blood Count (CBC)', 'Hematology', 400.00],
      ['test-2', 'Lipid Profile', 'Biochemistry', 1000.00],
      ['test-3', 'Fasting Blood Sugar (FBS)', 'Biochemistry', 150.00],
      ['test-4', 'ECG / Electrocardiogram', 'Cardiology', 500.00],
      ['test-5', 'X-Ray Chest PA View', 'Imaging', 600.00],
      ['test-6', 'Urine Routine Examination', 'Urinalysis', 200.00],
      ['test-7', 'Serum Creatinine', 'Nephrology', 300.00],
      ['test-8', 'Liver Function Test (LFT)', 'Biochemistry', 1200.00],
      ['test-9', 'Ultrasonography (USG) of Whole Abdomen', 'Imaging', 1500.00],
      ['test-10', 'HbA1c', 'Biochemistry', 800.00]
    ];
    for (const t of tests) {
      await connection.query(
        `INSERT INTO MedicalTest (id, name, category, base_price) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        t
      );
    }

    // ----------------------------------------------------
    // 13. Populate Relational Link Tables (10 records each)
    // ----------------------------------------------------
    console.log('🔗 Seeding relational join tables...');

    // doctor_patients (10 records)
    const docPatients = [
      [uIds.d1, uIds.c1], [uIds.d1, uIds.c4], [uIds.d1, uIds.c5],
      [uIds.d2, uIds.c2], [uIds.d2, uIds.c5],
      [uIds.d3, uIds.c3], [uIds.d3, uIds.c1], [uIds.d3, uIds.c2],
      [uIds.d4, uIds.c3], [uIds.d4, uIds.c6]
    ];
    for (const dp of docPatients) {
      await connection.query(`INSERT INTO doctor_patients (doctor_id, patient_id) VALUES (?, ?)`, dp);
    }

    // hospital_patients (10 records)
    const hospPatients = [
      [uIds.h1, uIds.c1], [uIds.h1, uIds.c4], [uIds.h1, uIds.c3], [uIds.h1, uIds.c6], [uIds.h1, uIds.c5],
      [uIds.h2, uIds.c2], [uIds.h2, uIds.c3], [uIds.h2, uIds.c1], [uIds.h2, uIds.c5], [uIds.h2, uIds.c6]
    ];
    for (const hp of hospPatients) {
      await connection.query(`INSERT INTO hospital_patients (hospital_id, patient_id) VALUES (?, ?)`, hp);
    }

    // hospital_doctors (10 records)
    const hospDoctors = [
      [uIds.h1, uIds.d1], [uIds.h1, uIds.d2], [uIds.h1, uIds.d4],
      [uIds.h2, uIds.d1], [uIds.h2, uIds.d2], [uIds.h2, uIds.d3], [uIds.h2, uIds.d4],
      [uIds.h1, uIds.d3]
    ];
    // We only have 8 combinations here, let's add 2 extra dummy doctors or duplicate link to reach 10?
    // Wait, let's link all 4 doctors to both hospitals, giving 4 x 2 = 8. Let's add 2 other dummy records.
    const extraDoc1 = crypto.randomUUID();
    const extraDoc2 = crypto.randomUUID();
    await connection.query(`INSERT INTO \`User\` (id, email, password_hash, full_name, role) VALUES ('${extraDoc1}', 'dummy1@hs.com', '${passwordHash}', 'Dummy Doctor 1', 'DOCTOR')`);
    await connection.query(`INSERT INTO \`User\` (id, email, password_hash, full_name, role) VALUES ('${extraDoc2}', 'dummy2@hs.com', '${passwordHash}', 'Dummy Doctor 2', 'DOCTOR')`);
    
    const hospDoctorsFull = [
      ...hospDoctors,
      [uIds.h1, extraDoc1],
      [uIds.h2, extraDoc2]
    ];
    for (const hd of hospDoctorsFull) {
      await connection.query(`INSERT INTO HospitalDoctor (hospital_id, doctor_id) VALUES (?, ?)`, hd);
    }

    // ----------------------------------------------------
    // 14. Populate `blood_inventory` (10 records)
    // ----------------------------------------------------
    console.log('🩸 Seeding blood_inventory table...');
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    const inventory = [
      [uIds.h1, 'A+', 15],
      [uIds.h1, 'B+', 12],
      [uIds.h1, 'O+', 20],
      [uIds.h1, 'AB-', 2],
      [uIds.h1, 'O-', 5],
      
      [uIds.h2, 'A+', 8],
      [uIds.h2, 'B+', 6],
      [uIds.h2, 'O+', 15],
      [uIds.h2, 'AB+', 4],
      [uIds.h2, 'A-', 3]
    ];
    for (const inv of inventory) {
      await connection.query(`INSERT INTO blood_inventory (hospital_id, blood_group, units) VALUES (?, ?, ?)`, inv);
    }

    // ----------------------------------------------------
    // 15. Populate `ai_health_plans` (10 records)
    // ----------------------------------------------------
    console.log('🧬 Seeding ai_health_plans table...');
    const healthPlans = [
      [
        uIds.c1, 
        'Hypertension and high cholesterol management checkup routine.',
        'Diet Plan:\n- Low-sodium diet (avoid table salt, salted pickles, canned soup)\n- Increase potassium rich foods (bananas, sweet potatoes, spinach)\n- Avoid deep fried foods, red meat, butter, ghee',
        'Exercise Plan:\n- Safe brisk walking for 30-40 minutes daily\n- Avoid heavy weightlifting or isometric exercises during BP spikes',
        'Precautions:\n- Measure blood pressure daily at morning\n- Consult cardiologist if BP rises above 150/95 mmHg\n- Drink at least 3 liters of water daily'
      ],
      [
        uIds.c2, 
        'Diabetes and mild bronchitis health routine.',
        'Diet Plan:\n- Low glycemic index diet (brown rice, oats, whole wheat)\n- Strictly avoid sugar, soft drinks, white flour, honey\n- Include fiber-rich green vegetables and cucumbers',
        'Exercise Plan:\n- Moderate aerobic exercise (walking, swimming) 5 days a week\n- Avoid heavy exercise outdoors in cold weather',
        'Precautions:\n- Check blood sugar levels before meals\n- Keep inhaler handy if chest congestion worsens\n- Keep glucose tablets or sweets nearby in case of hypoglycemia'
      ],
      [
        uIds.c3,
        'Urinary tract infection (UTI) recovery plan.',
        'Diet Plan:\n- High fluid intake (fresh water, coconut water, unsweetened cranberry juice)\n- Avoid spicy and acidic foods to reduce urinary irritation',
        'Exercise Plan:\n- Light yoga and stretching are safe. Avoid strenuous abdominal exercises.',
        'Precautions:\n- Complete the full course of prescribed antibiotics even if symptoms fade\n- Do not hold urine; urinate frequently'
      ],
      // Adding 7 additional health plans for other profiles to make 10+ records
      [
        uIds.c4, 'General kidney protection routine.', 
        'Diet: Drink plenty of water, avoid excessive high protein diet.', 
        'Exercise: Moderate exercises are safe.', 
        'Precautions: Avoid self-medicating with painkillers (NSAIDs).'
      ],
      [
        uIds.c5, 'General healthy living plan.', 
        'Diet: Balanced nutrition with high fiber, low oil.', 
        'Exercise: 150 minutes of weekly moderate exercise.', 
        'Precautions: Maintain standard sleep routine of 7-8 hours.'
      ],
      [
        uIds.c6, 'Anemia management plan.', 
        'Diet: Iron-rich foods (red meat, leafy greens, apples, pomegranate). Take Vitamin C (lemon, guava) to increase iron absorption.', 
        'Exercise: Light walks. Do not overexert.', 
        'Precautions: Track hemoglobin counts monthly.'
      ],
      [
        uIds.d1, 'Cardiac prevention routine for doctors.', 
        'Diet: DASH diet rich in grains and low fats.', 
        'Exercise: Daily running or cardio.', 
        'Precautions: Maintain blood pressure tracking.'
      ],
      [
        uIds.d2, 'Active lifestyle routine.', 
        'Diet: Balanced nutrition with minerals.', 
        'Exercise: Daily yoga.', 
        'Precautions: Take timely rest.'
      ],
      [
        uIds.d3, 'Neurological fatigue routine.', 
        'Diet: Low carb, healthy fats (walnuts, olive oil).', 
        'Exercise: Yoga and meditation.', 
        'Precautions: Avoid blue light screens before sleep.'
      ],
      [
        uIds.d4, 'Healthy living guidelines.', 
        'Diet: Rich in calcium and iron.', 
        'Exercise: Basic stretching.', 
        'Precautions: Avoid prolonged sitting.'
      ]
    ];

    for (const hp of healthPlans) {
      await connection.query(
        `INSERT INTO ai_health_plans (user_id, summary, diet_plan, exercise_plan, precautions) VALUES (?, ?, ?, ?, ?)`,
        hp
      );
    }

    console.log('✅ Seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error during seeding database:', error);
  } finally {
    await connection.end();
    console.log('🔌 Database connection closed.');
  }
}

main();
