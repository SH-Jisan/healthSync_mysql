import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { pool, escapeId, sanitizeDataForMySQL, buildWhereClause } from '../config/db.js';

import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

router.post('/query', authenticateJWT, async (req: Request, res: Response) => {
  const { table, action, selectFields, filters, orderFields, limitCount, isSingle, data } = req.body;

  const user = (req as any).user;
  const userId = user?.id;
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  const deviceInfo = req.headers['user-agent'] || 'Unknown';

  let previousValueStr: string | null = null;

  try {
    // 1. Fetch previous value if mutating to store in audit logs
    if (['update', 'delete', 'upsert'].includes(action)) {
      try {
        const { whereSql, whereParams } = buildWhereClause(filters || []);
        if (whereSql && whereSql !== '1=1') {
          const [existingRows]: any = await pool.query(`SELECT * FROM ${escapeId(table)} WHERE ${whereSql}`, whereParams);
          if (existingRows && existingRows.length > 0) {
            previousValueStr = JSON.stringify(existingRows);
          }
        }
      } catch (err: any) {
        console.error('Audit pre-fetch error:', err.message);
      }
    }

    // 2. Intercept and Validate Workflows/Rules
    if (action === 'insert' || action === 'update' || action === 'upsert') {
      const rowData = data || {};

      // A. Prevent Duplicate Citizen Profile Registration
      if (table === 'User') {
        const checkFields = ['national_id', 'birth_reg_number', 'passport_number'];
        for (const field of checkFields) {
          if (rowData[field]) {
            const checkId = rowData.id || (filters && filters.find((f: any) => f.field === 'id')?.value);
            let queryStr = `SELECT id FROM \`User\` WHERE \`${field}\` = ?`;
            let queryParams: any[] = [rowData[field]];
            if (checkId) {
              queryStr += ' AND id != ?';
              queryParams.push(checkId);
            }
            const [dups]: any = await pool.query(queryStr, queryParams);
            if (dups.length > 0) {
              return res.status(400).json({ error: `Validation error: A user with this ${field.replace(/_/g, ' ').toUpperCase()} already exists.` });
            }
          }
        }
      }

      // B. Appointment Leave & Double-Booking Conflicts
      if ((table === 'appointments' || table === 'Appointment') && action === 'insert') {
        if (rowData.appointment_date && rowData.doctor_id) {
          const apptDate = new Date(rowData.appointment_date);

          // 1. Leave Check
          const [leaves]: any = await pool.query(
            `SELECT * FROM doctor_leaves WHERE doctor_id = ? AND status = 'APPROVED' AND ? BETWEEN start_date AND end_date`,
            [rowData.doctor_id, apptDate]
          );
          if (leaves && leaves.length > 0) {
            return res.status(400).json({ error: 'Validation error: The doctor is on approved leave on this date.' });
          }

          // 2. Double-Booking Conflict Check (within 60 minutes)
          const [slots]: any = await pool.query(
            `SELECT * FROM Appointment WHERE doctor_id = ? AND status IN ('PENDING', 'CONFIRMED') AND ABS(TIMESTAMPDIFF(MINUTE, appointment_date, ?)) < 60`,
            [rowData.doctor_id, rowData.appointment_date]
          );
          if (slots && slots.length > 0) {
            return res.status(400).json({ error: 'Conflict: Doctor already has an active appointment within this time slot.' });
          }
        }
      }

      // C. Bed Assignment Rules & Admitted Check
      if (table === 'hospital_beds' && action === 'update') {
        if (rowData.status === 'OCCUPIED' && rowData.patient_id) {
          // Check if patient is admitted
          const hospitalId = rowData.hospital_id || userId;
          const [admissions]: any = await pool.query(
            `SELECT * FROM patient_admissions WHERE patient_id = ? AND hospital_id = ? AND status = 'ADMITTED'`,
            [rowData.patient_id, hospitalId]
          );
          if (admissions.length === 0) {
            return res.status(400).json({ error: 'Validation error: Patient must be actively admitted to this hospital before bed assignment.' });
          }

          // Check if bed is AVAILABLE
          const bedId = filters && filters.find((f: any) => f.field === 'id')?.value;
          if (bedId) {
            const [currentBeds]: any = await pool.query(`SELECT status, bed_number FROM hospital_beds WHERE id = ?`, [bedId]);
            if (currentBeds.length > 0) {
              const currentBed = currentBeds[0];
              if (currentBed.status !== 'AVAILABLE') {
                return res.status(400).json({ error: 'Selected bed is currently unavailable (occupied, cleaning, or maintenance).' });
              }

              // Handle bed transfer automatically
              const [otherBeds]: any = await pool.query(
                `SELECT id, bed_number FROM hospital_beds WHERE hospital_id = ? AND patient_id = ? AND id != ?`,
                [hospitalId, rowData.patient_id, bedId]
              );
              if (otherBeds.length > 0) {
                const oldBed = otherBeds[0];
                // Release old bed and mark as CLEANING
                await pool.query(
                  `UPDATE hospital_beds SET status = 'CLEANING', patient_id = NULL, assigned_doctor_id = NULL WHERE id = ?`,
                  [oldBed.id]
                );
                // Log transfer
                await pool.query(
                  `INSERT INTO bed_transfer_logs (hospital_id, patient_id, previous_bed_number, new_bed_number, action_by) VALUES (?, ?, ?, ?, ?)`,
                  [hospitalId, rowData.patient_id, oldBed.bed_number, currentBed.bed_number, userId]
                );
              }
            }
          }
        }
      }

      // D. Diagnostic State Transitions Enforcement
      if (table === 'diagnostic_orders' && action === 'update' && rowData.status) {
        const orderId = filters && filters.find((f: any) => f.field === 'id')?.value;
        if (orderId) {
          const [orders]: any = await pool.query(`SELECT status FROM diagnostic_orders WHERE id = ?`, [orderId]);
          if (orders.length > 0) {
            const currentStatus = orders[0].status;
            const validTransitions: Record<string, string[]> = {
              BOOKED: ['SAMPLE_COLLECTED'],
              SAMPLE_COLLECTED: ['PROCESSING'],
              PROCESSING: ['QUALITY_CHECK'],
              QUALITY_CHECK: ['DOCTOR_REVIEW'],
              DOCTOR_REVIEW: ['APPROVED', 'REJECTED'],
              APPROVED: [],
              REJECTED: ['BOOKED', 'SAMPLE_COLLECTED']
            };
            const allowed = validTransitions[currentStatus] || [];
            if (currentStatus !== rowData.status && !allowed.includes(rowData.status)) {
              return res.status(400).json({ error: `Validation error: Invalid diagnostic status transition from ${currentStatus} to ${rowData.status}.` });
            }
          }
        }
      }

      // E. Doctor Leaves Date Boundary Check
      if (table === 'doctor_leaves' && action === 'insert') {
        const startDate = new Date(rowData.start_date);
        const endDate = new Date(rowData.end_date);
        const today = new Date();
        today.setHours(0,0,0,0);
        if (startDate < today) {
          return res.status(400).json({ error: 'Leave start date cannot be in the past.' });
        }
        if (endDate < startDate) {
          return res.status(400).json({ error: 'Leave end date cannot be before the start date.' });
        }
      }
    }

    // Helper function to write audits & trigger workflow notifications/logs after success
    const afterQuerySuccess = async (mutatedAction: string, mutatedTable: string, mutatedData: any, queryFilters: any, prevVal: string | null) => {
      try {
        let recordId = queryFilters?.find((f: any) => f.field === 'id')?.value || (mutatedData && (mutatedData.id || mutatedData.user_id));

        // Fetch new value for auditing
        let newValueStr: string | null = null;
        if (['insert', 'update', 'upsert'].includes(mutatedAction)) {
          if (recordId) {
            const lookupField = (mutatedTable === 'blood_donors' || mutatedTable === 'ai_health_plans') ? 'user_id' : 'id';
            const [newRows]: any = await pool.query(`SELECT * FROM ${escapeId(mutatedTable)} WHERE ${escapeId(lookupField)} = ?`, [recordId]);
            if (newRows && newRows.length > 0) {
              newValueStr = JSON.stringify(newRows);
            }
          } else if (mutatedData) {
            newValueStr = JSON.stringify(mutatedData);
          }
        }

        // 1. Insert into audit_logs table
        await pool.query(
          `INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address, device_info, previous_value, new_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, mutatedAction.toUpperCase(), mutatedTable, recordId ? String(recordId) : null, ipAddress, deviceInfo, prevVal, newValueStr]
        );

        // 2. Automated Notifications & Workflows Logic
        // A. Appointments
        if (mutatedTable === 'appointments' || mutatedTable === 'Appointment') {
          if (mutatedAction === 'insert') {
            await pool.query(
              `INSERT INTO notifications (id, user_id, title, content) VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
              [
                crypto.randomUUID(), mutatedData.patient_id, 'Appointment Booked', `Your appointment with doctor has been booked for ${new Date(mutatedData.appointment_date).toLocaleDateString()}.`,
                crypto.randomUUID(), mutatedData.doctor_id, 'New Appointment Scheduled', `You have a new patient appointment on ${new Date(mutatedData.appointment_date).toLocaleDateString()}.`
              ]
            );
          } else if (mutatedAction === 'update' && mutatedData.status) {
            const parsedPrev = prevVal ? JSON.parse(prevVal)[0] : null;
            if (parsedPrev) {
              await pool.query(
                `INSERT INTO notifications (id, user_id, title, content) VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
                [
                  crypto.randomUUID(), parsedPrev.patient_id, 'Appointment Status Updated', `Your appointment status has been updated to: ${mutatedData.status}.`,
                  crypto.randomUUID(), parsedPrev.doctor_id, 'Appointment Status Updated', `Appointment status for patient changed to: ${mutatedData.status}.`
                ]
              );
            }
          }
        }

        // B. Patient Admissions
        if (mutatedTable === 'patient_admissions') {
          if (mutatedAction === 'insert') {
            await pool.query(
              `INSERT INTO notifications (id, user_id, title, content) VALUES (?, ?, ?, ?)`,
              [crypto.randomUUID(), mutatedData.patient_id, 'Admission Request Submitted', `Your hospital admission request has been received.`]
            );
          } else if (mutatedAction === 'update' && mutatedData.status) {
            const parsedPrev = prevVal ? JSON.parse(prevVal)[0] : null;
            if (parsedPrev) {
              const msg = mutatedData.status === 'ADMITTED' 
                ? 'You have been admitted successfully to the department.' 
                : `Your admission status updated to: ${mutatedData.status}.`;
              await pool.query(
                `INSERT INTO notifications (id, user_id, title, content) VALUES (?, ?, ?, ?)`,
                [crypto.randomUUID(), parsedPrev.patient_id, 'Admission Status Updated', msg]
              );
            }
          }
        }

        // C. Bed Assignment
        if (mutatedTable === 'hospital_beds' && mutatedAction === 'update' && mutatedData.patient_id && mutatedData.status === 'OCCUPIED') {
          await pool.query(
            `INSERT INTO notifications (id, user_id, title, content) VALUES (?, ?, ?, ?)`,
            [crypto.randomUUID(), mutatedData.patient_id, 'Bed Assigned', `You have been allocated Bed ${mutatedData.bed_number}.`]
          );
        }

        // D. Diagnostic Orders
        if (mutatedTable === 'diagnostic_orders' && mutatedAction === 'update' && mutatedData.status) {
          const parsedPrev = prevVal ? JSON.parse(prevVal)[0] : null;
          if (parsedPrev) {
            await pool.query(
              `INSERT INTO notifications (id, user_id, title, content) VALUES (?, ?, ?, ?)`,
              [crypto.randomUUID(), parsedPrev.patient_id, 'Diagnostic Test Status Updated', `Your diagnostic test order status is now: ${mutatedData.status}.`]
            );

            // Auto-complete parent payment status if all orders are APPROVED
            if (mutatedData.status === 'APPROVED') {
              const [pending]: any = await pool.query(
                `SELECT COUNT(*) AS count FROM diagnostic_orders WHERE payment_id = ? AND status != 'APPROVED'`,
                [parsedPrev.payment_id]
              );
              if (pending[0].count === 0) {
                await pool.query(
                  `UPDATE patient_payments SET report_status = 'COMPLETED' WHERE id = ?`,
                  [parsedPrev.payment_id]
                );
              }
            }
          }
        }

        // D2. Patient Payments Test Conversion
        if (mutatedTable === 'patient_payments' && mutatedAction === 'insert') {
          try {
            const testNames = mutatedData.test_names || [];
            for (const testName of testNames) {
              const [testRows]: any = await pool.query(`SELECT id FROM MedicalTest WHERE name = ?`, [testName]);
              const testId = testRows.length > 0 ? testRows[0].id : 'test-1';
              await pool.query(
                `INSERT INTO diagnostic_orders (id, payment_id, patient_id, diagnostic_id, test_id, status) VALUES (?, ?, ?, ?, ?, ?)`,
                [crypto.randomUUID(), mutatedData.id, mutatedData.patient_id, mutatedData.provider_id, testId, 'BOOKED']
              );
            }
          } catch (err: any) {
            console.error('Error generating diagnostic orders from payment:', err.message);
          }
        }

        // E. Leaves Approved
        if (mutatedTable === 'doctor_leaves' && mutatedAction === 'update' && mutatedData.status === 'APPROVED') {
          const parsedPrev = prevVal ? JSON.parse(prevVal)[0] : null;
          if (parsedPrev) {
            await pool.query(
              `INSERT INTO notifications (id, user_id, title, content) VALUES (?, ?, ?, ?)`,
              [crypto.randomUUID(), parsedPrev.doctor_id, 'Leave Approved', `Your leave requests from ${parsedPrev.start_date} to ${parsedPrev.end_date} has been approved.`]
            );
          }
        }

        // F. Doctor Affiliation Invitations & History
        if (mutatedTable === 'hospital_doctor_invitations') {
          const parsedPrev = prevVal ? JSON.parse(prevVal)[0] : null;
          if (parsedPrev) {
            if (mutatedData.status === 'APPROVED') {
              await pool.query(
                `INSERT IGNORE INTO HospitalDoctor (hospital_id, doctor_id) VALUES (?, ?)`,
                [parsedPrev.hospital_id, parsedPrev.doctor_id]
              );
              await pool.query(
                `INSERT INTO doctor_employment_history (doctor_id, hospital_id, department_name, employment_type, action, notes) VALUES (?, ?, ?, ?, ?, ?)`,
                [parsedPrev.doctor_id, parsedPrev.hospital_id, parsedPrev.department_name, parsedPrev.employment_type, 'APPROVED', 'Joined department roster.']
              );
              await pool.query(
                `INSERT INTO notifications (id, user_id, title, content) VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
                [
                  crypto.randomUUID(), parsedPrev.doctor_id, 'Affiliation Invitation Approved', `You are now linked as a doctor at hospital.`,
                  crypto.randomUUID(), parsedPrev.hospital_id, 'Doctor Joined Roster', `Doctor has joined your department staff.`
                ]
              );
            } else if (mutatedData.status === 'SUSPENDED' || mutatedData.status === 'TERMINATED') {
              await pool.query(
                `DELETE FROM HospitalDoctor WHERE hospital_id = ? AND doctor_id = ?`,
                [parsedPrev.hospital_id, parsedPrev.doctor_id]
              );
              await pool.query(
                `INSERT INTO doctor_employment_history (doctor_id, hospital_id, department_name, employment_type, action, notes) VALUES (?, ?, ?, ?, ?, ?)`,
                [parsedPrev.doctor_id, parsedPrev.hospital_id, parsedPrev.department_name, parsedPrev.employment_type, mutatedData.status, `Roster status changed to ${mutatedData.status}.`]
              );
              await pool.query(
                `INSERT INTO notifications (id, user_id, title, content) VALUES (?, ?, ?, ?)`,
                [crypto.randomUUID(), parsedPrev.doctor_id, 'Hospital Affiliation Update', `Your medical staff roster status changed to: ${mutatedData.status}.`]
              );
            }
          }
        }
      } catch (err: any) {
        console.error('Workflow engine post-query execution failed:', err.message);
      }
    };

    if (action === 'select') {
      let baseSql = '';
      const sel = Array.isArray(selectFields) ? selectFields.join(',') : (selectFields || '');

      // Handle specific relations joins
      if (table === 'blood_donors' && (sel.includes('profiles') || sel.includes('User'))) {
        baseSql = `SELECT blood_donors.*, u_prof.full_name AS profiles_full_name, u_prof.phone AS profiles_phone, u_prof.blood_group AS profiles_blood_group, u_prof.district AS profiles_district, u_prof.gender AS profiles_gender, u_prof.email AS profiles_email FROM blood_donors INNER JOIN \`User\` AS u_prof ON blood_donors.user_id = u_prof.id`;
      } else if (table === 'blood_requests' && (sel.includes('profiles') || sel.includes('User'))) {
        baseSql = `SELECT blood_requests.*, u_prof.full_name AS profiles_full_name, u_prof.phone AS profiles_phone FROM blood_requests LEFT JOIN \`User\` AS u_prof ON blood_requests.requester_id = u_prof.id`;
      } else if (table === 'medical_events' && (sel.includes('uploader') || sel.includes('profiles') || sel.includes('User'))) {
        baseSql = `SELECT medical_events.*, u_prof.full_name AS uploader_full_name, u_prof.specialty AS uploader_specialty, p_prof.full_name AS profiles_full_name, p_prof.phone AS profiles_phone FROM medical_events LEFT JOIN \`User\` AS u_prof ON medical_events.uploader_id = u_prof.id LEFT JOIN \`User\` AS p_prof ON medical_events.patient_id = p_prof.id`;
      } else if (table === 'patient_payments' && (sel.includes('provider') || sel.includes('profiles') || sel.includes('patient') || sel.includes('User'))) {
        baseSql = `SELECT patient_payments.*, provider_prof.full_name AS provider_full_name, p_prof.full_name AS profiles_full_name, p_prof.email AS profiles_email, p_prof.phone AS profiles_phone FROM patient_payments LEFT JOIN \`User\` AS provider_prof ON patient_payments.provider_id = provider_prof.id LEFT JOIN \`User\` AS p_prof ON patient_payments.patient_id = p_prof.id`;
      } else if (table === 'appointments' || table === 'Appointment') {
        baseSql = `SELECT ${escapeId(table)}.*, doc_prof.full_name AS doctor_full_name, doc_prof.specialty AS doctor_specialty, hosp_prof.full_name AS hospital_full_name, hosp_prof.address AS hospital_address, pat_prof.full_name AS profiles_full_name, pat_prof.phone AS profiles_phone, pat_prof.blood_group AS profiles_blood_group, pat_prof.email AS profiles_email FROM ${escapeId(table)} LEFT JOIN \`User\` AS doc_prof ON ${escapeId(table)}.doctor_id = doc_prof.id LEFT JOIN \`User\` AS hosp_prof ON ${escapeId(table)}.hospital_id = hosp_prof.id LEFT JOIN \`User\` AS pat_prof ON ${escapeId(table)}.patient_id = pat_prof.id`;
      } else if (table === 'diagnostic_patients' && sel.includes('patient')) {
        baseSql = `SELECT diagnostic_patients.*, p_prof.full_name AS profiles_full_name, p_prof.email AS profiles_email, p_prof.phone AS profiles_phone FROM diagnostic_patients LEFT JOIN \`User\` AS p_prof ON diagnostic_patients.patient_id = p_prof.id`;
      } else if (table === 'hospital_beds' && (sel.includes('patient') || sel.includes('doctor'))) {
        baseSql = `SELECT hospital_beds.*, patient_prof.full_name AS patient_full_name, patient_prof.phone AS patient_phone, patient_prof.email AS patient_email, doc_prof.full_name AS doctor_full_name FROM hospital_beds LEFT JOIN \`User\` AS patient_prof ON hospital_beds.patient_id = patient_prof.id LEFT JOIN \`User\` AS doc_prof ON hospital_beds.assigned_doctor_id = doc_prof.id`;
      } else if (table === 'doctor_patients' && (sel.includes('profiles') || sel.includes('User'))) {
        baseSql = `SELECT doctor_patients.*, p_prof.full_name AS profiles_full_name, p_prof.email AS profiles_email, p_prof.phone AS profiles_phone FROM doctor_patients LEFT JOIN \`User\` AS p_prof ON doctor_patients.patient_id = p_prof.id`;
      } else if (table === 'hospital_patients' && (sel.includes('profiles') || sel.includes('User'))) {
        baseSql = `SELECT hospital_patients.*, p_prof.full_name AS profiles_full_name, p_prof.email AS profiles_email, p_prof.phone AS profiles_phone FROM hospital_patients LEFT JOIN \`User\` AS p_prof ON hospital_patients.patient_id = p_prof.id`;
      } else if ((table === 'hospital_doctors' || table === 'HospitalDoctor') && (sel.includes('profiles') || sel.includes('User'))) {
        baseSql = `SELECT ${escapeId(table)}.*, doc_prof.full_name AS profiles_full_name, doc_prof.specialty AS profiles_specialty FROM ${escapeId(table)} LEFT JOIN \`User\` AS doc_prof ON ${escapeId(table)}.doctor_id = doc_prof.id`;
      } else if (table === 'diagnostic_orders' && (sel.includes('test') || sel.includes('MedicalTest'))) {
        baseSql = `SELECT diagnostic_orders.*, mt.name AS test_name, mt.category AS test_category, mt.base_price AS test_base_price FROM diagnostic_orders LEFT JOIN MedicalTest AS mt ON diagnostic_orders.test_id = mt.id`;
      } else {
        baseSql = `SELECT * FROM ${escapeId(table)}`;
      }

      // Build WHERE clause
      const { whereSql, whereParams } = buildWhereClause(filters || []);
      let sql = `${baseSql} WHERE ${whereSql}`;

      // Build Order By
      if (orderFields && orderFields.length > 0) {
        const orderParts = orderFields.map((o: any) => `${escapeId(o.field)} ${o.ascending ? 'ASC' : 'DESC'}`);
        sql += ` ORDER BY ${orderParts.join(', ')}`;
      }

      // Build Limit
      if (limitCount) {
        sql += ` LIMIT ?`;
        whereParams.push(limitCount);
      }

      const [rows]: any = await pool.query(sql, whereParams);

      // Map joins into nested objects to emulate Supabase structures
      let mapped = rows.map((row: any) => {
        const newRow = { ...row };

        // Parse JSON fields in tables
        const jsonFields = ['key_findings', 'attachment_urls', 'ai_details', 'medicines', 'vitals', 'test_names'];
        jsonFields.forEach(f => {
          if (newRow[f] && typeof newRow[f] === 'string') {
            try { newRow[f] = JSON.parse(newRow[f]); } catch(e) {}
          }
        });

        // Nested blood_donors profiles
        if (row.profiles_full_name !== undefined && table === 'blood_donors') {
          newRow.profiles = {
            full_name: row.profiles_full_name,
            phone: row.profiles_phone,
            blood_group: row.profiles_blood_group,
            district: row.profiles_district,
            gender: row.profiles_gender,
            email: row.profiles_email
          };
          delete newRow.profiles_full_name;
          delete newRow.profiles_phone;
          delete newRow.profiles_blood_group;
          delete newRow.profiles_district;
          delete newRow.profiles_gender;
          delete newRow.profiles_email;
        }

        // Nested blood_requests profiles
        if (row.profiles_full_name !== undefined && table === 'blood_requests') {
          newRow.profiles = {
            full_name: row.profiles_full_name,
            phone: row.profiles_phone
          };
          delete newRow.profiles_full_name;
          delete newRow.profiles_phone;
        }

        // Nested medical_events profiles & uploader
        if (table === 'medical_events') {
          if (row.uploader_full_name !== undefined) {
            newRow.uploader = {
              full_name: row.uploader_full_name,
              specialty: row.uploader_specialty
            };
            delete newRow.uploader_full_name;
            delete newRow.uploader_specialty;
          }
          if (row.profiles_full_name !== undefined) {
            newRow.profiles = {
              full_name: row.profiles_full_name,
              phone: row.profiles_phone
            };
            delete newRow.profiles_full_name;
            delete newRow.profiles_phone;
          }
        }

        // Nested patient_payments provider and profiles
        if (table === 'patient_payments') {
          if (row.provider_full_name !== undefined) {
            newRow.provider = {
              full_name: row.provider_full_name
            };
            delete newRow.provider_full_name;
          }
          if (row.profiles_full_name !== undefined) {
            newRow.profiles = {
              id: row.patient_id,
              full_name: row.profiles_full_name,
              email: row.profiles_email,
              phone: row.profiles_phone
            };
            delete newRow.profiles_full_name;
            delete newRow.profiles_email;
            delete newRow.profiles_phone;
          }
        }

        // Nested diagnostic_patients patient
        if (table === 'diagnostic_patients') {
          if (row.profiles_full_name !== undefined) {
            newRow.patient = {
              id: row.patient_id,
              full_name: row.profiles_full_name,
              email: row.profiles_email,
              phone: row.profiles_phone
            };
            delete row.profiles_full_name;
            delete row.profiles_email;
            delete row.profiles_phone;
          }
        }

        // Nested hospital_beds patient & doctor
        if (table === 'hospital_beds') {
          if (row.patient_full_name !== undefined) {
            newRow.patient = {
              full_name: row.patient_full_name,
              phone: row.patient_phone,
              email: row.patient_email
            };
            delete newRow.patient_full_name;
            delete newRow.patient_phone;
            delete newRow.patient_email;
          }
          if (row.doctor_full_name !== undefined) {
            newRow.doctor = {
              full_name: row.doctor_full_name
            };
            delete newRow.doctor_full_name;
          }
        }

        // Nested appointments doctor & hospital
        if (table === 'appointments' || table === 'Appointment') {
          if (row.doctor_full_name !== undefined) {
            newRow.doctor = {
              full_name: row.doctor_full_name,
              specialty: row.doctor_specialty
            };
            delete newRow.doctor_full_name;
            delete newRow.doctor_specialty;
          }
          if (row.hospital_full_name !== undefined) {
            newRow.hospital = {
              full_name: row.hospital_full_name,
              address: row.hospital_address
            };
            delete newRow.hospital_full_name;
            delete newRow.hospital_address;
          }
        }
        // Nested doctor_patients profiles
        if (table === 'doctor_patients') {
          if (row.profiles_full_name !== undefined) {
            newRow.profiles = {
              id: row.patient_id,
              full_name: row.profiles_full_name,
              email: row.profiles_email,
              phone: row.profiles_phone
            };
            delete newRow.profiles_full_name;
            delete newRow.profiles_email;
            delete newRow.profiles_phone;
          }
        }

        // Nested hospital_patients profiles
        if (table === 'hospital_patients') {
          if (row.profiles_full_name !== undefined) {
            const uObj = {
              id: row.patient_id,
              full_name: row.profiles_full_name,
              email: row.profiles_email,
              phone: row.profiles_phone
            };
            newRow.profiles = uObj;
            newRow.User = uObj;
            delete newRow.profiles_full_name;
            delete newRow.profiles_email;
            delete newRow.profiles_phone;
          }
        }

        // Nested hospital_doctors / HospitalDoctor profiles
        if (table === 'hospital_doctors' || table === 'HospitalDoctor') {
          if (row.profiles_full_name !== undefined) {
            const uObj = {
              id: row.doctor_id,
              full_name: row.profiles_full_name,
              specialty: row.profiles_specialty
            };
            newRow.profiles = uObj;
            newRow.User = uObj;
            delete newRow.profiles_full_name;
            delete newRow.profiles_specialty;
          }
        }

        // Nested diagnostic_orders test
        if (row.test_name !== undefined && table === 'diagnostic_orders') {
          newRow.test = {
            name: row.test_name,
            category: row.test_category,
            base_price: row.test_base_price
          };
          delete newRow.test_name;
          delete newRow.test_category;
          delete newRow.test_base_price;
        }

        return newRow;
      });

      if (isSingle) {
        res.status(200).json({ data: mapped[0] || null });
      } else {
        res.status(200).json({ data: mapped });
      }

    } else if (action === 'insert') {
      const rowsToInsert = Array.isArray(data) ? data : [data];
      const insertedRows = [];

      for (const row of rowsToInsert) {
        if (!row.id && (table === 'blood_requests' || table === 'medical_events' || table === 'patient_payments' || table === 'appointments' || table === 'Appointment' || table === 'notifications' || table === 'available_tests' || table === 'MedicalTest' || table === 'hospital_doctor_invitations' || table === 'doctor_leaves' || table === 'patient_admissions' || table === 'diagnostic_orders' || table === 'patient_referrals')) {
          row.id = crypto.randomUUID();
        }

        if (table === 'diagnostic_patients' && !row.provider_id) {
          row.provider_id = row.diagnostic_id;
        }

        const sanitized = sanitizeDataForMySQL(row);
        const keys = Object.keys(sanitized);
        const values = Object.values(sanitized);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO ${escapeId(table)} (${keys.map(k => escapeId(k)).join(', ')}) VALUES (${placeholders})`;

        const [result]: any = await pool.query(sql, values);

        let newlyInserted: any = null;
        if (result.insertId) {
          const [fetchRows]: any = await pool.query(`SELECT * FROM ${escapeId(table)} WHERE id = ?`, [result.insertId]);
          newlyInserted = fetchRows[0];
        } else if (row.id) {
          const [fetchRows]: any = await pool.query(`SELECT * FROM ${escapeId(table)} WHERE id = ?`, [row.id]);
          newlyInserted = fetchRows[0];
        } else if (row.user_id) {
          const [fetchRows]: any = await pool.query(`SELECT * FROM ${escapeId(table)} WHERE user_id = ?`, [row.user_id]);
          newlyInserted = fetchRows[0];
        } else {
          newlyInserted = row;
        }

        // Parse JSON output fields
        const jsonFields = ['key_findings', 'attachment_urls', 'ai_details', 'medicines', 'vitals', 'test_names'];
        jsonFields.forEach(f => {
          if (newlyInserted && newlyInserted[f] && typeof newlyInserted[f] === 'string') {
            try { newlyInserted[f] = JSON.parse(newlyInserted[f]); } catch(e) {}
          }
        });

        insertedRows.push(newlyInserted);
      }

      await afterQuerySuccess('insert', table, Array.isArray(data) ? insertedRows : insertedRows[0], filters, previousValueStr);
      res.status(200).json({ data: Array.isArray(data) ? insertedRows : insertedRows[0] });

    } else if (action === 'update') {
      const sanitized = sanitizeDataForMySQL(data);
      const keys = Object.keys(sanitized);
      const values = Object.values(sanitized);
      const setClause = keys.map(k => `${escapeId(k)} = ?`).join(', ');

      const { whereSql, whereParams } = buildWhereClause(filters || []);
      const sql = `UPDATE ${escapeId(table)} SET ${setClause} WHERE ${whereSql}`;
      const params = [...values, ...whereParams];

      await pool.query(sql, params);
      await afterQuerySuccess('update', table, data, filters, previousValueStr);
      res.status(200).json({ data: null });

    } else if (action === 'delete') {
      const { whereSql, whereParams } = buildWhereClause(filters || []);
      const sql = `DELETE FROM ${escapeId(table)} WHERE ${whereSql}`;

      await pool.query(sql, whereParams);
      await afterQuerySuccess('delete', table, null, filters, previousValueStr);
      res.status(200).json({ data: null });
      
    } else if (action === 'upsert') {
      const rowsToInsert = Array.isArray(data) ? data : [data];
      const insertedRows = [];

      for (const row of rowsToInsert) {
        if (!row.id && !row.user_id && (table === 'blood_requests' || table === 'medical_events' || table === 'patient_payments' || table === 'appointments' || table === 'Appointment' || table === 'notifications' || table === 'available_tests' || table === 'MedicalTest' || table === 'hospital_doctor_invitations' || table === 'doctor_leaves' || table === 'patient_admissions' || table === 'diagnostic_orders' || table === 'patient_referrals')) {
          row.id = crypto.randomUUID();
        }

        const sanitized = sanitizeDataForMySQL(row);
        const keys = Object.keys(sanitized);
        const values = Object.values(sanitized);
        const placeholders = keys.map(() => '?').join(', ');
        
        // Build ON DUPLICATE KEY UPDATE clause
        const updateKeys = keys.filter(k => k !== 'id' && k !== 'user_id');
        const updateClause = updateKeys.map(k => `${escapeId(k)} = VALUES(${escapeId(k)})`).join(', ');
        
        let sql = `INSERT INTO ${escapeId(table)} (${keys.map(k => escapeId(k)).join(', ')}) VALUES (${placeholders})`;
        if (updateClause) {
          sql += ` ON DUPLICATE KEY UPDATE ${updateClause}`;
        }

        const [result]: any = await pool.query(sql, values);

        let newlyInserted: any = null;
        const lookupVal = row.id || row.user_id;
        const lookupField = row.id ? 'id' : 'user_id';
        
        if (lookupVal) {
          const [fetchRows]: any = await pool.query(`SELECT * FROM ${escapeId(table)} WHERE ${escapeId(lookupField)} = ?`, [lookupVal]);
          newlyInserted = fetchRows[0];
        } else if (result.insertId) {
          const [fetchRows]: any = await pool.query(`SELECT * FROM ${escapeId(table)} WHERE id = ?`, [result.insertId]);
          newlyInserted = fetchRows[0];
        } else {
          newlyInserted = row;
        }

        // Parse JSON output fields
        const jsonFields = ['key_findings', 'attachment_urls', 'ai_details', 'medicines', 'vitals', 'test_names'];
        jsonFields.forEach(f => {
          if (newlyInserted && newlyInserted[f] && typeof newlyInserted[f] === 'string') {
            try { newlyInserted[f] = JSON.parse(newlyInserted[f]); } catch(e) {}
          }
        });

        insertedRows.push(newlyInserted);
      }

      await afterQuerySuccess('upsert', table, Array.isArray(data) ? insertedRows : insertedRows[0], filters, previousValueStr);
      res.status(200).json({ data: Array.isArray(data) ? insertedRows : insertedRows[0] });
    }
  } catch (error: any) {
    console.error('❌ SQL Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.post('/search', authenticateJWT, async (req: Request, res: Response) => {
  const { query, filters } = req.body;
  const page = Number(req.body.page || filters?.page) || 1;
  const limit = Number(req.body.limit || filters?.limit) || 10;
  const user = (req as any).user;
  const userId = user.id;
  const role = user.user_metadata?.role || 'CITIZEN';
  const qVal = `%${query || ''}%`;
  const offset = (page - 1) * limit;

  try {
    // 1. Establish permission structures
    let accessSqlReports = '';
    const accessParamsReports: any[] = [];
    if (role === 'CITIZEN') {
      accessSqlReports = `m.patient_id = ?`;
      accessParamsReports.push(userId);
    } else if (role === 'DOCTOR') {
      accessSqlReports = `(m.uploader_id = ? OR m.patient_id IN (SELECT patient_id FROM doctor_patients WHERE doctor_id = ?))`;
      accessParamsReports.push(userId, userId);
    } else if (role === 'HOSPITAL') {
      accessSqlReports = `(m.uploader_id = ? OR m.patient_id IN (SELECT patient_id FROM hospital_patients WHERE hospital_id = ?))`;
      accessParamsReports.push(userId, userId);
    } else if (role === 'DIAGNOSTIC') {
      accessSqlReports = `m.uploader_id = ?`;
      accessParamsReports.push(userId);
    }

    let accessSqlAppts = '';
    const accessParamsAppts: any[] = [];
    if (role === 'CITIZEN') {
      accessSqlAppts = `Appointment.patient_id = ?`;
      accessParamsAppts.push(userId);
    } else if (role === 'DOCTOR') {
      accessSqlAppts = `Appointment.doctor_id = ?`;
      accessParamsAppts.push(userId);
    } else if (role === 'HOSPITAL') {
      accessSqlAppts = `Appointment.hospital_id = ?`;
      accessParamsAppts.push(userId);
    }

    let accessSqlPatients = '';
    const accessParamsPatients: any[] = [];
    if (role === 'DOCTOR') {
      accessSqlPatients = `(p.id IN (SELECT patient_id FROM doctor_patients WHERE doctor_id = ?) OR p.id IN (SELECT patient_id FROM Appointment WHERE doctor_id = ?))`;
      accessParamsPatients.push(userId, userId);
    } else if (role === 'HOSPITAL') {
      accessSqlPatients = `(p.id IN (SELECT patient_id FROM hospital_patients WHERE hospital_id = ?) OR p.id IN (SELECT patient_id FROM Appointment WHERE hospital_id = ?) OR p.id IN (SELECT patient_id FROM hospital_beds WHERE hospital_id = ?))`;
      accessParamsPatients.push(userId, userId, userId);
    } else if (role === 'DIAGNOSTIC') {
      accessSqlPatients = `p.id IN (SELECT patient_id FROM diagnostic_patients WHERE provider_id = ?)`;
      accessParamsPatients.push(userId);
    }

    // 2. Build base SQL and parameter structures for each searchable entity
    // Doctors
    let docSql = `FROM \`User\` WHERE role = 'DOCTOR'`;
    const docParams: any[] = [];
    if (query) {
      docSql += ` AND (full_name LIKE ? OR specialty LIKE ? OR degree LIKE ? OR address LIKE ?)`;
      docParams.push(qVal, qVal, qVal, qVal);
    }
    if (filters?.location) {
      docSql += ` AND (address LIKE ? OR district LIKE ?)`;
      docParams.push(`%${filters.location}%`, `%${filters.location}%`);
    }
    if (filters?.department || filters?.specialty) {
      docSql += ` AND specialty LIKE ?`;
      docParams.push(`%${filters.department || filters.specialty}%`);
    }
    if (filters?.hospitalId) {
      docSql += ` AND id IN (SELECT doctor_id FROM HospitalDoctor WHERE hospital_id = ?)`;
      docParams.push(filters.hospitalId);
    }
    if (filters?.availability === 'available') {
      docSql += ` AND consultation_fee > 0`;
    }

    // Hospitals
    let hospSql = `FROM \`User\` WHERE role = 'HOSPITAL'`;
    const hospParams: any[] = [];
    if (query) {
      hospSql += ` AND (full_name LIKE ? OR address LIKE ? OR district LIKE ?)`;
      hospParams.push(qVal, qVal, qVal);
    }
    if (filters?.location) {
      hospSql += ` AND (address LIKE ? OR district LIKE ?)`;
      hospParams.push(`%${filters.location}%`, `%${filters.location}%`);
    }

    // Diagnostics
    let diagSql = `FROM \`User\` WHERE role = 'DIAGNOSTIC'`;
    const diagParams: any[] = [];
    if (query) {
      diagSql += ` AND (full_name LIKE ? OR address LIKE ? OR district LIKE ?)`;
      diagParams.push(qVal, qVal, qVal);
    }
    if (filters?.location) {
      diagSql += ` AND (address LIKE ? OR district LIKE ?)`;
      diagParams.push(`%${filters.location}%`, `%${filters.location}%`);
    }

    // Medical Reports / Prescriptions
    let reportsSql = `FROM medical_events m LEFT JOIN \`User\` p ON m.patient_id = p.id LEFT JOIN \`User\` u ON m.uploader_id = u.id WHERE 1=1`;
    const reportsParams: any[] = [];
    if (accessSqlReports) {
      reportsSql += ` AND ${accessSqlReports}`;
      reportsParams.push(...accessParamsReports);
    } else {
      reportsSql += ` AND 1=0`;
    }
    if (query) {
      reportsSql += ` AND (m.title LIKE ? OR m.summary LIKE ? OR p.full_name LIKE ?)`;
      reportsParams.push(qVal, qVal, qVal);
    }
    if (filters?.eventType) {
      reportsSql += ` AND m.event_type = ?`;
      reportsParams.push(filters.eventType);
    }
    if (filters?.severity) {
      reportsSql += ` AND m.severity = ?`;
      reportsParams.push(filters.severity);
    }
    if (filters?.date) {
      reportsSql += ` AND m.event_date = ?`;
      reportsParams.push(filters.date);
    }

    // Appointments
    let apptSql = `FROM Appointment LEFT JOIN \`User\` doc ON Appointment.doctor_id = doc.id LEFT JOIN \`User\` pat ON Appointment.patient_id = pat.id LEFT JOIN \`User\` hosp ON Appointment.hospital_id = hosp.id WHERE 1=1`;
    const apptParams: any[] = [];
    if (accessSqlAppts) {
      apptSql += ` AND ${accessSqlAppts}`;
      apptParams.push(...accessParamsAppts);
    } else {
      apptSql += ` AND 1=0`;
    }
    if (query) {
      apptSql += ` AND (Appointment.reason LIKE ? OR doc.full_name LIKE ? OR pat.full_name LIKE ? OR hosp.full_name LIKE ?)`;
      apptParams.push(qVal, qVal, qVal, qVal);
    }
    if (filters?.status) {
      apptSql += ` AND Appointment.status = ?`;
      apptParams.push(filters.status);
    }
    if (filters?.date) {
      apptSql += ` AND DATE(Appointment.appointment_date) = ?`;
      apptParams.push(filters.date);
    }

    // Patients
    let patSql = `FROM \`User\` p WHERE p.role = 'CITIZEN'`;
    const patParams: any[] = [];
    if (role !== 'CITIZEN') {
      if (accessSqlPatients) {
        patSql += ` AND ${accessSqlPatients}`;
        patParams.push(...accessParamsPatients);
      } else {
        patSql += ` AND 1=0`;
      }
      if (query) {
        patSql += ` AND (p.full_name LIKE ? OR p.email LIKE ? OR p.phone LIKE ?)`;
        patParams.push(qVal, qVal, qVal);
      }
    } else {
      patSql += ` AND 1=0`;
    }

    // Services
    let servSql = `FROM MedicalTest`;
    const servParams: any[] = [];
    if (query) {
      servSql += ` WHERE (name LIKE ? OR category LIKE ?)`;
      servParams.push(qVal, qVal);
    }

    // Specializations
    let specSql = `FROM \`User\` WHERE role = 'DOCTOR' AND specialty IS NOT NULL`;
    const specParams: any[] = [];
    if (query) {
      specSql += ` AND specialty LIKE ?`;
      specParams.push(qVal);
    }

    // Static blogs & packages lists
    const blogs = [
      { id: 'blog-1', title: '10 Tips for a Healthy Heart', summary: 'Learn about cardiovascular health, diet, and lifestyle changes to keep your heart strong.', category: 'Cardiology', author: 'Dr. Sarah Rahman', readTime: '5 min' },
      { id: 'blog-2', title: 'Understanding Your Lipid Profile Reports', summary: 'A comprehensive guide to understanding cholesterol levels, LDL, HDL, and triglycerides.', category: 'Biochemistry', author: 'Dr. Faisal Ahmed', readTime: '8 min' },
      { id: 'blog-3', title: 'The Importance of Regular Vaccination', summary: 'Why staying up-to-date with vaccines is critical for citizens of all ages.', category: 'Immunology', author: 'Dr. Nyla Kabir', readTime: '6 min' },
      { id: 'blog-4', title: 'Managing Diabetes: A Practical Guide', summary: 'Diet, exercise, and blood glucose tracking strategies for diabetic patients.', category: 'Endocrinology', author: 'Dr. Sajid Hassan', readTime: '10 min' },
      { id: 'blog-5', title: 'Top 5 Exercises for Joint Health', summary: 'Prevent arthritis and keep your joints flexible with these simple daily exercises.', category: 'Orthopedics', author: 'Dr. Rayhan Islam', readTime: '4 min' }
    ];

    const packages = [
      { id: 'pkg-1', name: 'Basic Cardiac Package', price: 1999, description: 'Includes ECG, Lipid Profile, Blood Sugar, and Cardiology Consultation.', category: 'Cardiology', testsCount: 4 },
      { id: 'pkg-2', name: 'Executive Full Body Checkup', price: 4999, description: 'Comprehensive health checkup covering CBC, LFT, Kidney Function, Thyroid, ECG, and consultation.', category: 'General Health', testsCount: 12 },
      { id: 'pkg-3', name: 'Women\'s Wellness Package', price: 2999, description: 'Specialized tests for women including CBC, Calcium, Vitamin D, Thyroid, and Gynecological Consult.', category: 'Women Health', testsCount: 7 },
      { id: 'pkg-4', name: 'Diabetes Screening Package', price: 999, description: 'Fasting Blood Sugar, HbA1c, Urine Routine, and Diabetes Consult.', category: 'Endocrinology', testsCount: 4 },
      { id: 'pkg-5', name: 'Senior Citizen Health Check', price: 3499, description: 'Tailored diagnostics for senior citizens including joint health, lipid levels, and full consultation.', category: 'Geriatrics', testsCount: 8 }
    ];

    // Filter static content for statistics count
    let filteredBlogs = blogs;
    if (query) {
      filteredBlogs = blogs.filter(b => 
        b.title.toLowerCase().includes(query.toLowerCase()) || 
        b.summary.toLowerCase().includes(query.toLowerCase()) || 
        b.category.toLowerCase().includes(query.toLowerCase())
      );
    }

    let filteredPackages = packages;
    if (query) {
      filteredPackages = packages.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) || 
        p.description.toLowerCase().includes(query.toLowerCase()) || 
        p.category.toLowerCase().includes(query.toLowerCase())
      );
    }

    // 3. Count matching records for statistics counts in parallel
    const stats: any = {
      doctors: 0,
      hospitals: 0,
      diagnostics: 0,
      reports: 0,
      appointments: 0,
      patients: 0,
      services: 0,
      blogs: filteredBlogs.length,
      packages: filteredPackages.length,
      specializations: 0
    };

    const countPromises: Promise<any>[] = [];

    countPromises.push(pool.query(`SELECT COUNT(*) AS total ` + docSql, docParams).then(([r]: any) => stats.doctors = r[0].total));
    countPromises.push(pool.query(`SELECT COUNT(*) AS total ` + hospSql, hospParams).then(([r]: any) => stats.hospitals = r[0].total));
    countPromises.push(pool.query(`SELECT COUNT(*) AS total ` + diagSql, diagParams).then(([r]: any) => stats.diagnostics = r[0].total));
    countPromises.push(pool.query(`SELECT COUNT(*) AS total ` + reportsSql, reportsParams).then(([r]: any) => stats.reports = r[0].total));
    countPromises.push(pool.query(`SELECT COUNT(*) AS total ` + apptSql, apptParams).then(([r]: any) => stats.appointments = r[0].total));
    
    if (role !== 'CITIZEN') {
      countPromises.push(pool.query(`SELECT COUNT(*) AS total ` + patSql, patParams).then(([r]: any) => stats.patients = r[0].total));
    }
    
    countPromises.push(pool.query(`SELECT COUNT(*) AS total ` + servSql, servParams).then(([r]: any) => stats.services = r[0].total));
    countPromises.push(pool.query(`SELECT COUNT(DISTINCT specialty) AS total ` + specSql, specParams).then(([r]: any) => stats.specializations = r[0].total));

    await Promise.all(countPromises);

    // 4. Retrieve rows based on pagination and category parameters
    const results: any = {
      doctors: [],
      hospitals: [],
      diagnostics: [],
      reports: [],
      appointments: [],
      patients: [],
      services: [],
      blogs: [],
      packages: [],
      specializations: []
    };

    const rowPromises: Promise<any>[] = [];
    const cat = filters?.category || 'all';

    // Helper to add query limits or defaults
    const activeLimit = cat === 'all' ? 5 : limit;
    const activeOffset = cat === 'all' ? 0 : offset;

    // 4a. Query Doctors
    if (cat === 'all' || cat === 'doctors') {
      rowPromises.push((async () => {
        const sql = `SELECT id, full_name, email, phone, specialty, degree, experience, consultation_fee, address, district ` + docSql + ` LIMIT ? OFFSET ?`;
        const [rows]: any = await pool.query(sql, [...docParams, activeLimit, activeOffset]);
        results.doctors = rows;
      })());
    }

    // 4b. Query Hospitals
    if (cat === 'all' || cat === 'hospitals') {
      rowPromises.push((async () => {
        const sql = `SELECT id, full_name, email, phone, address, district ` + hospSql + ` LIMIT ? OFFSET ?`;
        const [rows]: any = await pool.query(sql, [...hospParams, activeLimit, activeOffset]);
        results.hospitals = rows;
      })());
    }

    // 4c. Query Diagnostics
    if (cat === 'all' || cat === 'diagnostics') {
      rowPromises.push((async () => {
        const sql = `SELECT id, full_name, email, phone, address, district ` + diagSql + ` LIMIT ? OFFSET ?`;
        const [rows]: any = await pool.query(sql, [...diagParams, activeLimit, activeOffset]);
        results.diagnostics = rows;
      })());
    }

    // 4d. Query Reports
    if (cat === 'all' || cat === 'reports') {
      rowPromises.push((async () => {
        const sql = `SELECT m.id, m.title, m.event_type, m.event_date, m.severity, m.summary, p.full_name AS patient_name, u.full_name AS uploader_name ` + reportsSql + ` LIMIT ? OFFSET ?`;
        const [rows]: any = await pool.query(sql, [...reportsParams, activeLimit, activeOffset]);
        results.reports = rows;
      })());
    }

    // 4e. Query Appointments
    if (cat === 'all' || cat === 'appointments') {
      rowPromises.push((async () => {
        const sql = `SELECT Appointment.id, Appointment.appointment_date, Appointment.status, Appointment.reason, doc.full_name AS doctor_name, pat.full_name AS patient_name, hosp.full_name AS hospital_name ` + apptSql + ` LIMIT ? OFFSET ?`;
        const [rows]: any = await pool.query(sql, [...apptParams, activeLimit, activeOffset]);
        results.appointments = rows;
      })());
    }

    // 4f. Query Patients
    if ((cat === 'all' || cat === 'patients') && role !== 'CITIZEN') {
      rowPromises.push((async () => {
        const sql = `SELECT p.id, p.full_name, p.email, p.phone, p.gender, p.blood_group ` + patSql + ` LIMIT ? OFFSET ?`;
        const [rows]: any = await pool.query(sql, [...patParams, activeLimit, activeOffset]);
        results.patients = rows;
      })());
    }

    // 4g. Query Services
    if (cat === 'all' || cat === 'services') {
      rowPromises.push((async () => {
        const sql = `SELECT id, name, category, base_price ` + servSql + ` LIMIT ? OFFSET ?`;
        const [rows]: any = await pool.query(sql, [...servParams, activeLimit, activeOffset]);
        results.services = rows;
      })());
    }

    // 4h. Query Specializations
    if (cat === 'all' || cat === 'specializations') {
      rowPromises.push((async () => {
        const sql = `SELECT DISTINCT specialty ` + specSql + ` LIMIT ? OFFSET ?`;
        const [rows]: any = await pool.query(sql, [...specParams, activeLimit, activeOffset]);
        results.specializations = rows.map((r: any) => r.specialty).filter(Boolean);
      })());
    }

    // 4i. Static Blogs
    if (cat === 'all' || cat === 'blogs') {
      results.blogs = filteredBlogs.slice(activeOffset, activeOffset + activeLimit);
    }

    // 4j. Static Packages
    if (cat === 'all' || cat === 'packages') {
      results.packages = filteredPackages.slice(activeOffset, activeOffset + activeLimit);
    }

    await Promise.all(rowPromises);

    res.status(200).json({ data: results, stats });
  } catch (error: any) {
    console.error('❌ Global Search Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;

