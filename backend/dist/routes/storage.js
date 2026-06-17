import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { authenticateJWT } from '../middleware/auth.js';
const router = Router();
const uploadsDir = path.join(process.cwd(), 'public/uploads');
// Multer Setup for Storage Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const filePath = req.body.filePath || file.originalname;
        const dir = path.join(uploadsDir, path.dirname(filePath));
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const filePath = req.body.filePath || file.originalname;
        cb(null, path.basename(filePath));
    }
});
const upload = multer({ storage });
router.post('/upload', authenticateJWT, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.status(200).json({ data: { path: req.body.filePath }, error: null });
});
router.get('/download', authenticateJWT, (req, res) => {
    const filePath = req.query.path;
    if (!filePath) {
        return res.status(400).json({ error: 'Missing path parameter' });
    }
    const fullPath = path.join(uploadsDir, filePath);
    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    res.sendFile(fullPath);
});
router.post('/remove', authenticateJWT, (req, res) => {
    const { paths } = req.body;
    if (!paths || !Array.isArray(paths)) {
        return res.status(400).json({ error: 'Missing paths array' });
    }
    for (const file of paths) {
        const fullPath = path.join(uploadsDir, file);
        if (fs.existsSync(fullPath)) {
            try {
                fs.unlinkSync(fullPath);
            }
            catch (err) {
                console.error('File remove error:', err);
            }
        }
    }
    res.status(200).json({ data: { success: true }, error: null });
});
export default router;
