-- SQL Migration: Rename tables to match database.txt
RENAME TABLE profiles TO `User`;
RENAME TABLE appointments TO Appointment;
RENAME TABLE hospital_doctors TO HospitalDoctor;
RENAME TABLE available_tests TO MedicalTest;
