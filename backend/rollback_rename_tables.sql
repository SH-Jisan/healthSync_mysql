-- SQL Rollback Migration: Revert table renames
RENAME TABLE `User` TO profiles;
RENAME TABLE Appointment TO appointments;
RENAME TABLE HospitalDoctor TO hospital_doctors;
RENAME TABLE MedicalTest TO available_tests;
