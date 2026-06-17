-- Reference SQL Seed File for HealthSync
-- This file contains reference SQL statements used to populate the database with realistic sample records.
-- Note: In production, password hashes are generated using bcrypt in Node.js. The hash used below is for 'password123'.

USE healthsync;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `User`;
TRUNCATE TABLE blood_donors;
TRUNCATE TABLE blood_requests;
TRUNCATE TABLE request_acceptors;
TRUNCATE TABLE medical_events;
TRUNCATE TABLE patient_payments;
TRUNCATE TABLE notifications;
TRUNCATE TABLE Appointment;
TRUNCATE TABLE MedicalTest;
TRUNCATE TABLE doctor_patients;
TRUNCATE TABLE hospital_patients;
TRUNCATE TABLE HospitalDoctor;
TRUNCATE TABLE blood_inventory;
TRUNCATE TABLE ai_health_plans;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Seed User (Citizens, Doctors, Hospitals, Diagnostics)
INSERT INTO `User` (id, email, password_hash, full_name, phone, role, blood_group, district, gender, specialty, degree, experience, consultation_fee, about, chamber_address, address) VALUES
('c1111111-1111-1111-1111-111111111111', 'jisan@healthsync.com', '$2a$10$0p2W.eH5XGZ3G28hB3tSDeqU7Y2H6N.yXy6O8.e8.05v8a8a8a8a8', 'Jisan Al Hasan', '+8801711111111', 'CITIZEN', 'A+', 'Dhaka', 'Male', NULL, NULL, NULL, NULL, NULL, NULL, 'House 12, Road 5, Dhanmondi, Dhaka'),
('c2222222-2222-2222-2222-222222222222', 'anisur@healthsync.com', '$2a$10$0p2W.eH5XGZ3G28hB3tSDeqU7Y2H6N.yXy6O8.e8.05v8a8a8a8a8', 'Anisur Rahman', '+8801722222222', 'CITIZEN', 'B+', 'Chittagong', 'Male', NULL, NULL, NULL, NULL, NULL, NULL, 'GEC Circle, Chittagong'),
('c3333333-3333-3333-3333-333333333333', 'munira@healthsync.com', '$2a$10$0p2W.eH5XGZ3G28hB3tSDeqU7Y2H6N.yXy6O8.e8.05v8a8a8a8a8', 'Munira Khatun', '+8801733333333', 'CITIZEN', 'O+', 'Sylhet', 'Female', NULL, NULL, NULL, NULL, NULL, NULL, 'Zindabazar, Sylhet'),
('c4444444-4444-4444-4444-444444444444', 'rizvi@healthsync.com', '$2a$10$0p2W.eH5XGZ3G28hB3tSDeqU7Y2H6N.yXy6O8.e8.05v8a8a8a8a8', 'Rizvi Ahmed', '+8801744444444', 'CITIZEN', 'AB-', 'Dhaka', 'Male', NULL, NULL, NULL, NULL, NULL, NULL, 'Mirpur-10, Dhaka'),
('c5555555-5555-5555-5555-555555555555', 'kabir@healthsync.com', '$2a$10$0p2W.eH5XGZ3G28hB3tSDeqU7Y2H6N.yXy6O8.e8.05v8a8a8a8a8', 'Kabir Hossain', '+8801755555555', 'CITIZEN', 'O-', 'Rajshahi', 'Male', NULL, NULL, NULL, NULL, NULL, NULL, 'Kazihata, Rajshahi'),
('c6666666-6666-6666-6666-666666666666', 'sadia@healthsync.com', '$2a$10$0p2W.eH5XGZ3G28hB3tSDeqU7Y2H6N.yXy6O8.e8.05v8a8a8a8a8', 'Sadia Islam', '+8801766666666', 'CITIZEN', 'B-', 'Khulna', 'Female', NULL, NULL, NULL, NULL, NULL, NULL, 'Boyra, Khulna'),
('d1111111-1111-1111-1111-111111111111', 'nahid@healthsync.com', '$2a$10$0p2W.eH5XGZ3G28hB3tSDeqU7Y2H6N.yXy6O8.e8.05v8a8a8a8a8', 'Dr. Nahid Chowdhury', '+8801811111111', 'DOCTOR', NULL, 'Dhaka', 'Male', 'Cardiology', 'MBBS, FCPS (Cardiology)', '12 Years', 800, 'Senior Cardiologist specializing in interventional cardiology.', 'Room 302, Labaid Dhanmondi', 'Dhanmondi, Dhaka'),
('d2222222-2222-2222-2222-222222222222', 'farhana@healthsync.com', '$2a$10$0p2W.eH5XGZ3G28hB3tSDeqU7Y2H6N.yXy6O8.e8.05v8a8a8a8a8', 'Dr. Farhana Yasmin', '+8801822222222', 'DOCTOR', NULL, 'Dhaka', 'Female', 'Pediatrics', 'MBBS, DCH, FCPS (Pediatrics)', '8 Years', 600, 'Pediatric specialist dedicated to child health.', 'Room 105, Popular Mirpur', 'Mirpur, Dhaka'),
('d3333333-3333-3333-3333-333333333333', 'sajjad@healthsync.com', '$2a$10$0p2W.eH5XGZ3G28hB3tSDeqU7Y2H6N.yXy6O8.e8.05v8a8a8a8a8', 'Dr. Sajjad Hossain', '+8801833333333', 'DOCTOR', NULL, 'Chittagong', 'Male', 'Neurology', 'MBBS, MD (Neurology)', '15 Years', 1000, 'Specialist neurologist in stroke and migraine.', 'Room 201, Evercare Ctg', 'Chittagong'),
('d4444444-4444-4444-4444-444444444444', 'tanjina@healthsync.com', '$2a$10$0p2W.eH5XGZ3G28hB3tSDeqU7Y2H6N.yXy6O8.e8.05v8a8a8a8a8', 'Dr. Tanjina Akhtar', '+8801844444444', 'DOCTOR', NULL, 'Sylhet', 'Female', 'Gynecology', 'MBBS, MS (OBGYN)', '10 Years', 700, 'Gynecology and high-risk pregnancy specialist.', 'Room 501, Oasis Sylhet', 'Sylhet'),
('h1111111-1111-1111-1111-111111111111', 'dmch@healthsync.com', '$2a$10$0p2W.eH5XGZ3G28hB3tSDeqU7Y2H6N.yXy6O8.e8.05v8a8a8a8a8', 'Dhaka Medical College Hospital', '+88025555555', 'HOSPITAL', NULL, 'Dhaka', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Ramna, Dhaka-1000'),
('h2222222-2222-2222-2222-222222222222', 'evercare@healthsync.com', '$2a$10$0p2W.eH5XGZ3G28hB3tSDeqU7Y2H6N.yXy6O8.e8.05v8a8a8a8a8', 'Evercare Hospital Dhaka', '+88028401661', 'HOSPITAL', NULL, 'Dhaka', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Plot 81, Block E, Bashundhara R/A, Dhaka'),
('g1111111-1111-1111-1111-111111111111', 'labaid@healthsync.com', '$2a$10$0p2W.eH5XGZ3G28hB3tSDeqU7Y2H6N.yXy6O8.e8.05v8a8a8a8a8', 'Labaid Diagnostic Center', '+88029676356', 'DIAGNOSTIC', NULL, 'Dhaka', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'House 6, Road 4, Dhanmondi, Dhaka'),
('g2222222-2222-2222-2222-222222222222', 'popular@healthsync.com', '$2a$10$0p2W.eH5XGZ3G28hB3tSDeqU7Y2H6N.yXy6O8.e8.05v8a8a8a8a8', 'Popular Diagnostic Center', '+88029669480', 'DIAGNOSTIC', NULL, 'Dhaka', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'House 16, Road 2, Dhanmondi, Dhaka');

-- 2. Seed blood_donors
INSERT INTO blood_donors (user_id, availability, last_donation_date) VALUES
('c1111111-1111-1111-1111-111111111111', 1, '2026-03-10'),
('c2222222-2222-2222-2222-222222222222', 1, '2026-02-15'),
('c3333333-3333-3333-3333-333333333333', 1, '2026-04-01'),
('c4444444-4444-4444-4444-444444444444', 1, NULL),
('c5555555-5555-5555-5555-555555555555', 1, '2025-12-20'),
('c6666666-6666-6666-6666-666666666666', 1, NULL),
('d1111111-1111-1111-1111-111111111111', 0, '2026-01-05'),
('d2222222-2222-2222-2222-222222222222', 1, NULL),
('d3333333-3333-3333-3333-333333333333', 1, '2026-03-25'),
('d4444444-4444-4444-4444-444444444444', 1, NULL);

-- 3. Seed blood_requests
INSERT INTO blood_requests (id, requester_id, blood_group, hospital_name, urgency, reason, status, accepted_count) VALUES
('req-uuid-001', 'c1111111-1111-1111-1111-111111111111', 'B+', 'Dhaka Medical College Hospital', 'CRITICAL', 'Road accident victim needs urgent B+ blood transfusion.', 'OPEN', 2),
('req-uuid-002', 'c2222222-2222-2222-2222-222222222222', 'A+', 'Evercare Hospital Dhaka', 'NORMAL', 'Elective surgery planned. Need 1 unit of A+ blood.', 'OPEN', 1),
('req-uuid-003', 'c3333333-3333-3333-3333-333333333333', 'O+', 'Sylhet MAG Osmani Medical College', 'CRITICAL', 'Thalassemia patient needs blood transfusion today.', 'OPEN', 0),
('req-uuid-004', 'c4444444-4444-4444-4444-444444444444', 'AB-', 'National Heart Foundation', 'CRITICAL', 'Heart bypass surgery scheduled for tomorrow.', 'OPEN', 1),
('req-uuid-005', 'c5555555-5555-5555-5555-555555555555', 'O-', 'Rajshahi Medical College Hospital', 'CRITICAL', 'Emergency pregnancy complication. Rare group needed.', 'OPEN', 1),
('req-uuid-006', 'c6666666-6666-6666-6666-666666666666', 'B-', 'Khulna City Hospital', 'NORMAL', 'Anemia patient, blood count low.', 'FULFILLED', 2),
('req-uuid-007', 'c1111111-1111-1111-1111-111111111111', 'A-', 'Labaid Dhanmondi', 'CRITICAL', 'Cancer patient undergoing chemo.', 'OPEN', 0),
('req-uuid-008', 'c2222222-2222-2222-2222-222222222222', 'AB+', 'Chittagong Medical College Hospital', 'NORMAL', 'Planned bone surgery.', 'FULFILLED', 1),
('req-uuid-009', 'c3333333-3333-3333-3333-333333333333', 'O+', 'Mount Adora Hospital Sylhet', 'CRITICAL', 'Postpartum hemorrhage emergency.', 'OPEN', 1),
('req-uuid-010', 'c4444444-4444-4444-4444-444444444444', 'B+', 'DMCH Burn Unit', 'CRITICAL', 'Burn patient needs plasma/blood.', 'OPEN', 0);

-- 4. Seed request_acceptors
INSERT INTO request_acceptors (request_id, donor_id) VALUES
('req-uuid-001', 'c2222222-2222-2222-2222-222222222222'),
('req-uuid-001', 'c3333333-3333-3333-3333-333333333333'),
('req-uuid-002', 'c1111111-1111-1111-1111-111111111111'),
('req-uuid-004', 'c5555555-5555-5555-5555-555555555555'),
('req-uuid-005', 'c4444444-4444-4444-4444-444444444444'),
('req-uuid-006', 'c2222222-2222-2222-2222-222222222222'),
('req-uuid-006', 'c3333333-3333-3333-3333-333333333333'),
('req-uuid-007', 'c1111111-1111-1111-1111-111111111111'),
('req-uuid-008', 'c5555555-5555-5555-5555-555555555555'),
('req-uuid-002', 'd3333333-3333-3333-3333-333333333333');

-- 5. Seed medical_events
INSERT INTO medical_events (id, patient_id, uploader_id, title, event_type, event_date, severity, summary, extracted_text, key_findings, attachment_urls, file_hash, ai_details, medicines, vitals) VALUES
('evt-uuid-001', 'c1111111-1111-1111-1111-111111111111', 'g1111111-1111-1111-1111-111111111111', 'Complete Blood Count (CBC) Report', 'REPORT', '2026-05-10', 'LOW', 'Normal CBC report, hemoglobin level looks good.', 'CBC REPORT\nHemoglobin: 14.5 g/dL (Normal)', '["Hemoglobin: 14.5 g/dL","WBC: 6,500","Platelet: 250k"]', '["http://localhost:5000/uploads/c1111111-1111-1111-1111-111111111111/cbc_report_2026.pdf"]', 'hash-cbc-report-abc-123', '{"title": "CBC Report", "event_type": "REPORT", "event_date": "2026-05-10", "severity": "LOW", "simple_explanation_en": "Normal blood parameters.", "simple_explanation_bn": "রক্তের সব উপাদান স্বাভাবিক।"}', NULL, NULL),
('evt-uuid-002', 'c1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'Prescription for High Blood Pressure', 'PRESCRIPTION', '2026-05-12', 'MEDIUM', 'Prescription for hypertension. Advised low salt diet.', 'Rx\n1. Tab. Olmetec 20mg (1+0+0)\n2. Tab. Lipiget 10mg (0+0+1)', '["Hypertension","Lipid Management"]', NULL, NULL, '{"title": "Prescription for Hypertension", "event_type": "PRESCRIPTION", "event_date": "2026-05-12", "severity": "MEDIUM"}', '[{"name": "Olmetec 20mg", "dosage": "1+0+0", "duration": "30 Days", "instruction": "After breakfast"}, {"name": "Lipiget 10mg", "dosage": "0+0+1", "duration": "30 Days", "instruction": "At bedtime"}]', '{"bp": "140/90", "hr": "78", "temp": "98.6", "weight": "74"}'),
('evt-uuid-003', 'c1111111-1111-1111-1111-111111111111', 'g1111111-1111-1111-1111-111111111111', 'Lipid Profile Report', 'REPORT', '2026-05-15', 'MEDIUM', 'Cholesterol is slightly elevated. Advised exercise.', 'LIPID PROFILE\nTotal Cholesterol: 220 mg/dL (High)', '["High Cholesterol","High LDL"]', '["http://localhost:5000/uploads/c1111111-1111-1111-1111-111111111111/lipid_profile.png"]', 'hash-lipid-profile-xyz-456', '{"title": "Lipid Profile", "event_type": "REPORT", "event_date": "2026-05-15", "severity": "MEDIUM"}', NULL, NULL),
('evt-uuid-004', 'c2222222-2222-2222-2222-222222222222', 'g2222222-2222-2222-2222-222222222222', 'Fasting Blood Sugar (FBS)', 'REPORT', '2026-04-20', 'HIGH', 'High fasting blood sugar detected.', 'GLUCOSE FASTING\nFasting Blood Sugar: 8.2 mmol/L', '["FBS: 8.2 mmol/L (Diabetic)"]', '["http://localhost:5000/uploads/c2222222-2222-2222-2222-222222222222/blood_sugar_report.pdf"]', 'hash-fbs-sugar-def-789', '{"title": "Fasting Blood Sugar", "event_type": "REPORT", "event_date": "2026-04-20", "severity": "HIGH"}', NULL, NULL),
('evt-uuid-005', 'c2222222-2222-2222-2222-222222222222', 'd2222222-2222-2222-2222-222222222222', 'Pediatric Test Request', 'TEST_ORDER', '2026-04-22', 'LOW', 'Suggested CBC and Urine RE tests for fever.', 'Test Order:\n1. CBC\n2. Urine RE', '["CBC Ordered","Urine RE Ordered"]', NULL, NULL, '{"title": "Pediatric Test Order", "event_type": "TEST_ORDER", "event_date": "2026-04-22", "severity": "LOW"}', NULL, '{"bp": "100/60", "hr": "90", "temp": "101.2", "weight": "22"}'),
('evt-uuid-006', 'c2222222-2222-2222-2222-222222222222', 'g2222222-2222-2222-2222-222222222222', 'Chest X-Ray Imaging', 'REPORT', '2026-04-25', 'MEDIUM', 'Mild chest infection detected. Lungs mostly clear.', 'CHEST X-RAY PA VIEW\nFindings: Mild markings.', '["Mild Bronchovascular Markings"]', '["http://localhost:5000/uploads/c2222222-2222-2222-2222-222222222222/chest_xray.png"]', 'hash-xray-chest-ghi-012', '{"title": "Chest X-Ray", "event_type": "REPORT", "event_date": "2026-04-25", "severity": "MEDIUM"}', NULL, NULL),
('evt-uuid-007', 'c3333333-3333-3333-3333-333333333333', 'g2222222-2222-2222-2222-222222222222', 'Urine Routine Examination', 'REPORT', '2026-03-05', 'MEDIUM', 'Pus cells detected in urine, indicating UTI.', 'URINE RE\nPus Cells: 8-10 /HPF', '["High Pus Cells (UTI)"]', '["http://localhost:5000/uploads/c3333333-3333-3333-3333-333333333333/urine_re_report.pdf"]', 'hash-urine-re-jkl-345', '{"title": "Urine Routine Examination", "event_type": "REPORT", "event_date": "2026-03-05", "severity": "MEDIUM"}', NULL, NULL),
('evt-uuid-008', 'c3333333-3333-3333-3333-333333333333', 'g2222222-2222-2222-2222-222222222222', 'Liver Function Test (LFT)', 'REPORT', '2026-03-08', 'MEDIUM', 'SGPT/ALT slightly high. Liver functions mostly stable.', 'LIVER FUNCTION TEST\nSGPT (ALT): 55 U/L', '["Slightly Elevated SGPT"]', '["http://localhost:5000/uploads/c3333333-3333-3333-3333-333333333333/liver_function.pdf"]', 'hash-lft-liver-mno-678', '{"title": "Liver Function Test", "event_type": "REPORT", "event_date": "2026-03-08", "severity": "MEDIUM"}', NULL, NULL),
('evt-uuid-009', 'c4444444-4444-4444-4444-444444444444', 'g2222222-2222-2222-2222-222222222222', 'Serum Creatinine (Kidney)', 'REPORT', '2026-02-12', 'LOW', 'Kidney function is perfect. Normal creatinine level.', 'KIDNEY PANEL\nSerum Creatinine: 0.85 mg/dL', '["Creatinine: 0.85 (Normal)"]', '["http://localhost:5000/uploads/c4444444-4444-4444-4444-444444444444/kidney_creatinine.pdf"]', 'hash-kidney-crea-pqr-901', '{"title": "Serum Creatinine Test", "event_type": "REPORT", "event_date": "2026-02-12", "severity": "LOW"}', NULL, NULL),
('evt-uuid-010', 'c3333333-3333-3333-3333-333333333333', 'd4444444-4444-4444-4444-444444444444', 'Antenatal Checkup Prescription', 'PRESCRIPTION', '2026-03-10', 'LOW', 'Routine antenatal checkup. Prescribed iron and calcium.', 'Rx\n1. Tab. Fefol (0+1+0)\n2. Tab. Calbo-D (0+0+1)', '["Iron Supplement","Calcium Support"]', NULL, NULL, '{"title": "Pregnancy Routine Prescription", "event_type": "PRESCRIPTION", "event_date": "2026-03-10", "severity": "LOW"}', '[{"name": "Fefol (Iron+Folic)", "dosage": "0+1+0", "duration": "90 Days", "instruction": "After lunch"}, {"name": "Calbo-D", "dosage": "0+0+1", "duration": "90 Days", "instruction": "After dinner"}]', '{"bp": "110/70", "hr": "80", "temp": "98.4", "weight": "65"}');

-- 6. Seed patient_payments
INSERT INTO patient_payments (id, patient_id, provider_id, test_names, total_amount, status, report_status, created_at) VALUES
('pay-uuid-001', 'c1111111-1111-1111-1111-111111111111', 'g1111111-1111-1111-1111-111111111111', '["Complete Blood Count (CBC)"]', 400.00, 'PAID', 'COMPLETED', '2026-05-10 10:30:00'),
('pay-uuid-002', 'c1111111-1111-1111-1111-111111111111', 'g1111111-1111-1111-1111-111111111111', '["Lipid Profile"]', 1000.00, 'PAID', 'COMPLETED', '2026-05-15 11:20:00'),
('pay-uuid-003', 'c2222222-2222-2222-2222-222222222222', 'g2222222-2222-2222-2222-222222222222', '["Fasting Blood Sugar (FBS)"]', 150.00, 'PAID', 'COMPLETED', '2026-04-20 09:00:00'),
('pay-uuid-004', 'c2222222-2222-2222-2222-222222222222', 'g2222222-2222-2222-2222-222222222222', '["X-Ray Chest PA View"]', 600.00, 'PAID', 'COMPLETED', '2026-04-25 14:10:00'),
('pay-uuid-005', 'c3333333-3333-3333-3333-333333333333', 'g2222222-2222-2222-2222-222222222222', '["Urine Routine Examination"]', 200.00, 'PAID', 'COMPLETED', '2026-03-05 08:45:00'),
('pay-uuid-006', 'c3333333-3333-3333-3333-333333333333', 'g2222222-2222-2222-2222-222222222222', '["Liver Function Test (LFT)"]', 1200.00, 'PAID', 'COMPLETED', '2026-03-08 09:15:00'),
('pay-uuid-007', 'c4444444-4444-4444-4444-444444444444', 'g2222222-2222-2222-2222-222222222222', '["Serum Creatinine"]', 300.00, 'PAID', 'COMPLETED', '2026-02-12 10:00:00'),
('pay-uuid-008', 'c4444444-4444-4444-4444-444444444444', 'g2222222-2222-2222-2222-222222222222', '["Ultrasonography (USG) of Whole Abdomen"]', 1500.00, 'DUE', 'PENDING', '2026-06-14 15:30:00'),
('pay-uuid-009', 'c1111111-1111-1111-1111-111111111111', 'g1111111-1111-1111-1111-111111111111', '["ECG / Electrocardiogram"]', 500.00, 'DUE', 'PENDING', '2026-06-15 11:00:00'),
('pay-uuid-010', 'c5555555-5555-5555-5555-555555555555', 'g1111111-1111-1111-1111-111111111111', '["HbA1c", "Complete Blood Count (CBC)"]', 1200.00, 'DUE', 'PENDING', '2026-06-15 12:00:00');
-- 7. Seed notifications
INSERT INTO notifications (id, user_id, title, content, is_read, created_at) VALUES
('notif-uuid-001', 'c1111111-1111-1111-1111-111111111111', '🩸 Urgent Blood Request Match!', 'A patient at Dhaka Medical College Hospital needs B+ blood. Tap to accept and help.', 0, '2026-06-15 21:00:00'),
('notif-uuid-002', 'c2222222-2222-2222-2222-222222222222', '🩸 Blood Request Accepted', 'Your blood request for A+ has been accepted by Kabir Hossain.', 0, '2026-06-15 21:10:00'),
('notif-uuid-003', 'c3333333-3333-3333-3333-333333333333', '📑 Diagnostic Report Ready', 'Your Liver Function Test (LFT) report is ready. You can now view it in your timeline.', 1, '2026-03-08 17:00:00'),
('notif-uuid-004', 'c4444444-4444-4444-4444-444444444444', '📅 Appointment Confirmed', 'Your appointment with Dr. Nahid Chowdhury on 2026-06-20 has been confirmed.', 0, '2026-06-15 15:00:00'),
('notif-uuid-005', 'd1111111-1111-1111-1111-111111111111', '📅 New Appointment Request', 'You have a new appointment booking request from Jisan Al Hasan for 2026-06-18.', 0, '2026-06-15 16:30:00'),
('notif-uuid-006', 'c1111111-1111-1111-1111-111111111111', '💊 Medicine Safety Alert', 'AI detected possible high dose warning for Lipiget. Review with doctor.', 1, '2026-05-12 10:10:00'),
('notif-uuid-007', 'c2222222-2222-2222-2222-222222222222', '🩺 Test Order Issued', 'Dr. Farhana Yasmin has issued a new test order for CBC and Urine RE.', 1, '2026-04-22 12:35:00'),
('notif-uuid-008', 'd2222222-2222-2222-2222-222222222222', '📅 Appointment Cancelled', 'Appointment with Kabir Hossain for 2026-06-17 was cancelled by the patient.', 0, '2026-06-15 19:45:00'),
('notif-uuid-009', 'c3333333-3333-3333-3333-333333333333', '🧬 Health Routine Available', 'A new daily nutrition and exercise plan has been generated based on your UTI diagnosis.', 0, '2026-06-15 20:30:00'),
('notif-uuid-010', 'c5555555-5555-5555-5555-555555555555', '🩸 Critical Need Near You', 'Emergency O- blood request matching your group at Rajshahi RMCH.', 0, '2026-06-15 22:00:00');

-- 8. Seed appointments
INSERT INTO Appointment (id, doctor_id, patient_id, hospital_id, appointment_date, status, reason) VALUES
('app-uuid-001', 'd1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'h1111111-1111-1111-1111-111111111111', '2026-06-18 10:00:00', 'Accepted', 'Routine cardiac review checkup.'),
('app-uuid-002', 'd1111111-1111-1111-1111-111111111111', 'c4444444-4444-4444-4444-444444444444', 'h1111111-1111-1111-1111-111111111111', '2026-06-20 11:30:00', 'CONFIRMED', 'Chest pain consultation.'),
('app-uuid-003', 'd2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'h2222222-2222-2222-2222-222222222222', '2026-06-19 15:30:00', 'PENDING', 'Fever checkup for baby.'),
('app-uuid-004', 'd3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'h2222222-2222-2222-2222-222222222222', '2026-06-22 17:00:00', 'Accepted', 'Migraine follow-up.'),
('app-uuid-005', 'd4444444-4444-4444-4444-444444444444', 'c3333333-3333-3333-3333-333333333333', 'h1111111-1111-1111-1111-111111111111', '2026-06-25 09:30:00', 'CONFIRMED', 'Antenatal care 2nd trimester check.'),
('app-uuid-006', 'd2222222-2222-2222-2222-222222222222', 'c5555555-5555-5555-5555-555555555555', 'h2222222-2222-2222-2222-222222222222', '2026-06-21 16:00:00', 'CANCELLED', 'Routine weight review.'),
('app-uuid-007', 'd3333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111', 'h2222222-2222-2222-2222-222222222222', '2026-06-24 18:00:00', 'PENDING', 'Sleep disorder consultation.'),
('app-uuid-008', 'd4444444-4444-4444-4444-444444444444', 'c6666666-6666-6666-6666-666666666666', 'h1111111-1111-1111-1111-111111111111', '2026-06-27 10:30:00', 'PENDING', 'PCOS consultancy.'),
('app-uuid-009', 'd1111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555', 'h1111111-1111-1111-1111-111111111111', '2026-06-29 11:00:00', 'CONFIRMED', 'Heart health checkup.'),
('app-uuid-010', 'd3333333-3333-3333-3333-333333333333', 'c2222222-2222-2222-2222-222222222222', 'h2222222-2222-2222-2222-222222222222', '2026-06-30 14:00:00', 'Accepted', 'Post-stroke follow-up review.');

-- 9. Seed available_tests
-- (Seeded in schema.sql already)

-- 10. Seed doctor_patients
INSERT INTO doctor_patients (doctor_id, patient_id) VALUES
('d1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111'),
('d1111111-1111-1111-1111-111111111111', 'c4444444-4444-4444-4444-444444444444'),
('d1111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555'),
('d2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222'),
('d2222222-2222-2222-2222-222222222222', 'c5555555-5555-5555-5555-555555555555'),
('d3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333'),
('d3333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111'),
('d3333333-3333-3333-3333-333333333333', 'c2222222-2222-2222-2222-222222222222'),
('d4444444-4444-4444-4444-444444444444', 'c3333333-3333-3333-3333-333333333333'),
('d4444444-4444-4444-4444-444444444444', 'c6666666-6666-6666-6666-666666666666');

-- 11. Seed hospital_patients
INSERT INTO hospital_patients (hospital_id, patient_id) VALUES
('h1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111'),
('h1111111-1111-1111-1111-111111111111', 'c4444444-4444-4444-4444-444444444444'),
('h1111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333'),
('h1111111-1111-1111-1111-111111111111', 'c6666666-6666-6666-6666-666666666666'),
('h1111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555'),
('h2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222'),
('h2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333'),
('h2222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111'),
('h2222222-2222-2222-2222-222222222222', 'c5555555-5555-5555-5555-555555555555'),
('h2222222-2222-2222-2222-222222222222', 'c6666666-6666-6666-6666-666666666666');

-- 12. Seed HospitalDoctor
INSERT INTO HospitalDoctor (hospital_id, doctor_id) VALUES
('h1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111'),
('h1111111-1111-1111-1111-111111111111', 'd2222222-2222-2222-2222-222222222222'),
('h1111111-1111-1111-1111-111111111111', 'd4444444-4444-4444-4444-444444444444'),
('h2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111'),
('h2222222-2222-2222-2222-222222222222', 'd2222222-2222-2222-2222-222222222222'),
('h2222222-2222-2222-2222-222222222222', 'd3333333-3333-3333-3333-333333333333'),
('h2222222-2222-2222-2222-222222222222', 'd4444444-4444-4444-4444-444444444444'),
('h1111111-1111-1111-1111-111111111111', 'd3333333-3333-3333-3333-333333333333');

-- 13. Seed blood_inventory
INSERT INTO blood_inventory (hospital_id, blood_group, units) VALUES
('h1111111-1111-1111-1111-111111111111', 'A+', 15),
('h1111111-1111-1111-1111-111111111111', 'B+', 12),
('h1111111-1111-1111-1111-111111111111', 'O+', 20),
('h1111111-1111-1111-1111-111111111111', 'AB-', 2),
('h1111111-1111-1111-1111-111111111111', 'O-', 5),
('h2222222-2222-2222-2222-222222222222', 'A+', 8),
('h2222222-2222-2222-2222-222222222222', 'B+', 6),
('h2222222-2222-2222-2222-222222222222', 'O+', 15),
('h2222222-2222-2222-2222-222222222222', 'AB+', 4),
('h2222222-2222-2222-2222-222222222222', 'A-', 3);

-- 14. Seed ai_health_plans
INSERT INTO ai_health_plans (user_id, summary, diet_plan, exercise_plan, precautions) VALUES
('c1111111-1111-1111-1111-111111111111', 'Hypertension and high cholesterol management checkup routine.', 'Diet Plan:\n- Low-sodium diet\n- Increase potassium rich foods\n- Avoid deep fried foods', 'Exercise Plan:\n- Safe brisk walking for 30-40 minutes daily', 'Precautions:\n- Measure blood pressure daily\n- Consult cardiologist if BP rises above 150/95 mmHg'),
('c2222222-2222-2222-2222-222222222222', 'Diabetes and mild bronchitis health routine.', 'Diet Plan:\n- Low glycemic index diet\n- Strictly avoid sugar', 'Exercise Plan:\n- Moderate aerobic exercise 5 days a week', 'Precautions:\n- Check blood sugar levels before meals'),
('c3333333-3333-3333-3333-333333333333', 'Urinary tract infection (UTI) recovery plan.', 'Diet Plan:\n- High fluid intake\n- Avoid spicy foods', 'Exercise Plan:\n- Light yoga and stretching are safe.', 'Precautions:\n- Complete the full course of prescribed antibiotics'),
('c4444444-4444-4444-4444-444444444444', 'General kidney protection routine.', 'Diet: Drink plenty of water, avoid excessive high protein diet.', 'Exercise: Moderate exercises are safe.', 'Precautions: Avoid self-medicating with painkillers (NSAIDs).'),
('c5555555-5555-5555-5555-555555555555', 'General healthy living plan.', 'Diet: Balanced nutrition with high fiber, low oil.', 'Exercise: 150 minutes of weekly moderate exercise.', 'Precautions: Maintain standard sleep routine of 7-8 hours.'),
('c6666666-6666-6666-6666-666666666666', 'Anemia management plan.', 'Diet: Iron-rich foods. Take Vitamin C to increase iron absorption.', 'Exercise: Light walks. Do not overexert.', 'Precautions: Track hemoglobin counts monthly.'),
('d1111111-1111-1111-1111-111111111111', 'Cardiac prevention routine for doctors.', 'Diet: DASH diet rich in grains and low fats.', 'Exercise: Daily running or cardio.', 'Precautions: Maintain blood pressure tracking.'),
('d2222222-2222-2222-2222-222222222222', 'Active lifestyle routine.', 'Diet: Balanced nutrition.', 'Exercise: Daily yoga.', 'Precautions: Take timely rest.'),
('d3333333-3333-3333-3333-333333333333', 'Neurological fatigue routine.', 'Diet: Low carb, healthy fats (walnuts, olive oil).', 'Exercise: Yoga and meditation.', 'Precautions: Avoid blue light screens before sleep.'),
('d4444444-4444-4444-4444-444444444444', 'Healthy living guidelines.', 'Diet: Rich in calcium and iron.', 'Exercise: Basic stretching.', 'Precautions: Avoid prolonged sitting.');
