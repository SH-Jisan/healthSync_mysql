import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { JWT_SECRET, authenticateJWT } from '../middleware/auth.js';
const router = Router();
// Sign Up
router.post('/signup', async (req, res) => {
    const { email, password, options } = req.body;
    const metadata = options?.data || {};
    const fullName = metadata.full_name || '';
    const phone = metadata.phone || '';
    const role = metadata.role || 'CITIZEN';
    try {
        // Check if user exists
        const [existing] = await pool.query('SELECT id FROM `User` WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }
        const userId = crypto.randomUUID();
        const hashedPassword = await bcrypt.hash(password, 10);
        // Insert user/profile
        await pool.query(`INSERT INTO \`User\` (id, email, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)`, [userId, email, hashedPassword, fullName, phone, role]);
        const userObj = {
            id: userId,
            email,
            user_metadata: { full_name: fullName, phone, role },
        };
        const token = jwt.sign(userObj, JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({
            data: {
                user: userObj,
                session: {
                    access_token: token,
                    refresh_token: 'mock-refresh-token',
                    expires_in: 3600 * 24 * 7,
                    token_type: 'bearer',
                    user: userObj
                }
            },
            error: null
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Sign In
router.post('/signin', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM `User` WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid login credentials' });
        }
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid login credentials' });
        }
        const userObj = {
            id: user.id,
            email: user.email,
            user_metadata: {
                full_name: user.full_name,
                phone: user.phone,
                role: user.role
            }
        };
        const token = jwt.sign(userObj, JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({
            data: {
                user: userObj,
                session: {
                    access_token: token,
                    refresh_token: 'mock-refresh-token',
                    expires_in: 3600 * 24 * 7,
                    token_type: 'bearer',
                    user: userObj
                }
            },
            error: null
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Get Session
router.get('/session', authenticateJWT, (req, res) => {
    res.status(200).json({
        data: {
            session: {
                access_token: req.headers.authorization?.split(' ')[1],
                user: req.user
            }
        },
        error: null
    });
});
// Get User
router.get('/user', authenticateJWT, (req, res) => {
    res.status(200).json({
        data: {
            user: req.user
        },
        error: null
    });
});
export default router;
