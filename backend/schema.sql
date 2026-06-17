-- MySQL Database Schema for HealthSync
CREATE DATABASE IF NOT EXISTS healthsync;
USE healthsync;

-- User table (combines auth users and public profiles)
CREATE TABLE IF NOT EXISTS `User` (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL, -- CITIZEN, DOCTOR, HOSPITAL, DIAGNOSTIC
    blood_group VARCHAR(10),
    district VARCHAR(100),
    gender VARCHAR(20),
    specialty VARCHAR(255), -- for DOCTORs
    degree VARCHAR(255), -- for DOCTORs
    experience VARCHAR(50), -- for DOCTORs
    consultation_fee INT, -- for DOCTORs
    about TEXT, -- for DOCTORs
    chamber_address TEXT, -- for DOCTORs
    address VARCHAR(255), -- for hospitals/diagnostics/doctors
    avatar_url VARCHAR(255),
    fcm_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Blood Donors table
CREATE TABLE IF NOT EXISTS blood_donors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    availability BOOLEAN DEFAULT TRUE,
    last_donation_date DATE,
    FOREIGN KEY (user_id) REFERENCES `User`(id) ON DELETE CASCADE
);

-- Blood Requests table
CREATE TABLE IF NOT EXISTS blood_requests (
    id VARCHAR(255) PRIMARY KEY,
    requester_id VARCHAR(255) NOT NULL,
    blood_group VARCHAR(10) NOT NULL,
    hospital_name VARCHAR(255) NOT NULL,
    urgency VARCHAR(20) NOT NULL, -- NORMAL, CRITICAL
    reason TEXT,
    status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, FULFILLED
    accepted_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES `User`(id) ON DELETE CASCADE
);

-- Request Acceptors table
CREATE TABLE IF NOT EXISTS request_acceptors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(255) NOT NULL,
    donor_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (donor_id) REFERENCES `User`(id) ON DELETE CASCADE,
    UNIQUE KEY (request_id, donor_id)
);

-- Medical Events table
CREATE TABLE IF NOT EXISTS medical_events (
    id VARCHAR(255) PRIMARY KEY,
    patient_id VARCHAR(255) NOT NULL,
    uploader_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- REPORT, PRESCRIPTION, VACCINATION, TEST_ORDER, SURGERY, GENERIC
    event_date DATE NOT NULL,
    severity VARCHAR(20) NOT NULL, -- HIGH, MEDIUM, LOW
    summary TEXT,
    extracted_text LONGTEXT,
    key_findings JSON,
    attachment_urls JSON,
    file_hash VARCHAR(255),
    ai_details JSON,
    medicines JSON,
    vitals JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES `User`(id) ON DELETE CASCADE,
    FOREIGN KEY (uploader_id) REFERENCES `User`(id) ON DELETE CASCADE
);

-- Patient Payments table
CREATE TABLE IF NOT EXISTS patient_payments (
    id VARCHAR(255) PRIMARY KEY,
    patient_id VARCHAR(255) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    test_names JSON,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DUE', -- PAID, DUE
    report_status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, COMPLETED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES `User`(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES `User`(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES `User`(id) ON DELETE CASCADE
);

-- Appointment table
CREATE TABLE IF NOT EXISTS Appointment (
    id VARCHAR(255) PRIMARY KEY,
    doctor_id VARCHAR(255) NOT NULL,
    patient_id VARCHAR(255) NOT NULL,
    hospital_id VARCHAR(255),
    appointment_date DATETIME NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, CONFIRMED, CANCELLED, Accepted
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES `User`(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES `User`(id) ON DELETE CASCADE,
    FOREIGN KEY (hospital_id) REFERENCES `User`(id) ON DELETE SET NULL
);

-- MedicalTest table
CREATE TABLE IF NOT EXISTS MedicalTest (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    base_price DECIMAL(10,2) NOT NULL
);

-- Doctor Patients table
CREATE TABLE IF NOT EXISTS doctor_patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id VARCHAR(255) NOT NULL,
    patient_id VARCHAR(255) NOT NULL,
    FOREIGN KEY (doctor_id) REFERENCES `User`(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES `User`(id) ON DELETE CASCADE,
    UNIQUE KEY (doctor_id, patient_id)
);

-- Hospital Patients table
CREATE TABLE IF NOT EXISTS hospital_patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hospital_id VARCHAR(255) NOT NULL,
    patient_id VARCHAR(255) NOT NULL,
    FOREIGN KEY (hospital_id) REFERENCES `User`(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES `User`(id) ON DELETE CASCADE,
    UNIQUE KEY (hospital_id, patient_id)
);

-- HospitalDoctor table
CREATE TABLE IF NOT EXISTS HospitalDoctor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hospital_id VARCHAR(255) NOT NULL,
    doctor_id VARCHAR(255) NOT NULL,
    FOREIGN KEY (hospital_id) REFERENCES `User`(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES `User`(id) ON DELETE CASCADE,
    UNIQUE KEY (hospital_id, doctor_id)
);

-- Blood Inventory table
CREATE TABLE IF NOT EXISTS blood_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hospital_id VARCHAR(255) NOT NULL,
    blood_group VARCHAR(10) NOT NULL,
    units INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES `User`(id) ON DELETE CASCADE,
    UNIQUE KEY (hospital_id, blood_group)
);

-- AI Health Plans table
CREATE TABLE IF NOT EXISTS ai_health_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    summary TEXT,
    diet_plan TEXT,
    exercise_plan TEXT,
    precautions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES `User`(id) ON DELETE CASCADE
);

-- Diagnostic Patients table
CREATE TABLE IF NOT EXISTS diagnostic_patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    diagnostic_id VARCHAR(255) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    patient_id VARCHAR(255) NOT NULL,
    FOREIGN KEY (diagnostic_id) REFERENCES `User`(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES `User`(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES `User`(id) ON DELETE CASCADE,
    UNIQUE KEY (diagnostic_id, patient_id)
);

-- Seed available tests
INSERT IGNORE INTO MedicalTest (id, name, category, base_price) VALUES
('test-1', 'Complete Blood Count (CBC)', 'Hematology', 400.00),
('test-2', 'Lipid Profile', 'Biochemistry', 1000.00),
('test-3', 'Fasting Blood Sugar (FBS)', 'Biochemistry', 150.00),
('test-4', 'ECG / Electrocardiogram', 'Cardiology', 500.00),
('test-5', 'X-Ray Chest PA View', 'Imaging', 600.00),
('test-6', 'Urine Routine Examination', 'Urinalysis', 200.00),
('test-7', 'Serum Creatinine', 'Nephrology', 300.00),
('test-8', 'Liver Function Test (LFT)', 'Biochemistry', 1200.00),
('test-9', 'Ultrasonography (USG) of Whole Abdomen', 'Imaging', 1500.00),
('test-10', 'HbA1c', 'Biochemistry', 800.00);
