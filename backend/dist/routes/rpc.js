import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { authenticateJWT } from '../middleware/auth.js';
const router = Router();
router.post('/create_dummy_user', authenticateJWT, async (req, res) => {
    const { u_email, u_password, u_name, u_phone, u_role, u_address } = req.body;
    const user = req.user;
    try {
        const userId = crypto.randomUUID();
        const hashedPassword = await bcrypt.hash(u_password || '123456', 10);
        // 1. Insert patient profile
        await pool.query(`INSERT INTO \`User\` (id, email, password_hash, full_name, phone, role, address) VALUES (?, ?, ?, ?, ?, ?, ?)`, [userId, u_email, hashedPassword, u_name, u_phone || null, u_role || 'CITIZEN', u_address || '']);
        // 2. Automatically link patient to the caller depending on caller's role
        if (user) {
            const callerRole = user.user_metadata?.role || 'CITIZEN';
            const callerId = user.id;
            if (callerRole === 'DIAGNOSTIC') {
                await pool.query(`INSERT INTO diagnostic_patients (diagnostic_id, provider_id, patient_id) VALUES (?, ?, ?)`, [callerId, callerId, userId]);
            }
            else if (callerRole === 'DOCTOR') {
                await pool.query(`INSERT INTO doctor_patients (doctor_id, patient_id) VALUES (?, ?)`, [callerId, userId]);
            }
            else if (callerRole === 'HOSPITAL') {
                await pool.query(`INSERT INTO hospital_patients (hospital_id, patient_id) VALUES (?, ?)`, [callerId, userId]);
            }
        }
        res.status(200).json({ data: { success: true, userId } });
    }
    catch (err) {
        console.error('❌ RPC create_dummy_user Error:', err.message);
        res.status(400).json({ error: err.message });
    }
});
export default router;
