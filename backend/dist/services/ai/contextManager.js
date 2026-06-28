import { pool } from '../../config/db.js';
export async function aggregatePatientContext(userId, userQuery, referencedEventId) {
    // 1. Fetch Profile & Demographics
    const [userProfiles] = await pool.query(`SELECT full_name, gender, blood_group, district, allergies, chronic_diseases, vaccination_history, insurance_info, emergency_contact_name, emergency_contact_phone FROM \`User\` WHERE id = ?`, [userId]);
    const profile = userProfiles[0] || {};
    // 2. Fetch Recent Medical Events (Top 20)
    const [timelineEvents] = await pool.query(`SELECT id, title, event_type, event_date, severity, summary, key_findings, ai_details FROM medical_events WHERE patient_id = ? ORDER BY event_date DESC, created_at DESC LIMIT 20`, [userId]);
    // 3. Fetch Active / Recent Inpatient Admissions
    const [admissions] = await pool.query(`SELECT pa.*, hb.bed_number, hb.bed_type, u.full_name as doctor_name 
     FROM patient_admissions pa 
     LEFT JOIN hospital_beds hb ON hb.patient_id = pa.patient_id AND hb.hospital_id = pa.hospital_id
     LEFT JOIN \`User\` u ON hb.assigned_doctor_id = u.id 
     WHERE pa.patient_id = ? ORDER BY pa.admitted_at DESC LIMIT 5`, [userId]);
    // 4. Fetch Doctor Appointments
    const [appointments] = await pool.query(`SELECT a.id, a.appointment_date, a.status, a.reason, u.full_name as doctor_name, u.specialty 
     FROM Appointment a 
     LEFT JOIN \`User\` u ON a.doctor_id = u.id 
     WHERE a.patient_id = ? ORDER BY a.appointment_date DESC LIMIT 5`, [userId]);
    // 5. Fetch Diagnostic Orders
    const [diagnosticOrders] = await pool.query(`SELECT do.id, do.status, do.created_at, mt.name as test_name, u.full_name as diagnostic_center 
     FROM diagnostic_orders do 
     LEFT JOIN MedicalTest mt ON do.test_id = mt.id 
     LEFT JOIN \`User\` u ON do.diagnostic_id = u.id 
     WHERE do.patient_id = ? ORDER BY do.created_at DESC LIMIT 5`, [userId]);
    // 6. Fetch Specifically Referenced Report (if any)
    let referencedReport = null;
    if (referencedEventId) {
        const [refEvents] = await pool.query(`SELECT * FROM medical_events WHERE id = ? AND patient_id = ?`, [referencedEventId, userId]);
        if (refEvents.length > 0) {
            referencedReport = refEvents[0];
        }
    }
    // 7. Dynamic Timeline Search Keyword Matching
    let dynamicSearchResults = [];
    const lowerQuery = userQuery.toLowerCase();
    const keywords = ['diabetes', 'sugar', 'cholesterol', 'mri', 'ct scan', 'x-ray', 'xray', 'ecg', 'blood test', 'cbc', 'lipid', 'kidney', 'liver', 'hospital', 'surgery', 'heart', 'pressure', 'bp'];
    const matchedKeywords = keywords.filter(k => lowerQuery.includes(k));
    if (matchedKeywords.length > 0) {
        const searchConditions = matchedKeywords.map(() => `(title LIKE ? OR summary LIKE ? OR extracted_text LIKE ?)`).join(' OR ');
        const params = [userId];
        matchedKeywords.forEach(k => {
            params.push(`%${k}%`, `%${k}%`, `%${k}%`);
        });
        const [searchRows] = await pool.query(`SELECT id, title, event_type, event_date, severity, summary, key_findings FROM medical_events WHERE patient_id = ? AND (${searchConditions}) ORDER BY event_date DESC LIMIT 10`, params);
        dynamicSearchResults = searchRows;
    }
    // 8. Extract Lab Trends (Phase 2 Recommendation)
    const labTrends = [];
    (timelineEvents || []).forEach((ev) => {
        if (ev.event_type === 'REPORT' || ev.event_type === 'GENERIC') {
            const details = ev.ai_details || {};
            if (details.key_findings || details.laboratory_values) {
                labTrends.push({
                    date: ev.event_date,
                    title: ev.title,
                    findings: details.key_findings || details.laboratory_values || ev.summary
                });
            }
        }
    });
    return {
        profile,
        timelineEvents,
        admissions,
        appointments,
        diagnosticOrders,
        referencedReport,
        dynamicSearchResults,
        labTrends
    };
}
