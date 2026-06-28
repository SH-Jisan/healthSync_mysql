import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { pool } from '../config/db.js';
import { authenticateJWT } from '../middleware/auth.js';
const router = Router();
router.post('/semantic-search', authenticateJWT, async (req, res) => {
    try {
        const { query, patient_id } = req.body;
        if (!query || !patient_id) {
            return res.status(400).json({ error: 'Query and patient_id are required' });
        }
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey)
            throw new Error('Missing GEMINI_API_KEY');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
        const prompt = `
    Role: You are a Medical Search Query Interpreter.
    User Query: "${query}"

    Task: Translate and expand this search query (which may be in English, Bangla, or Banglish) into structured metadata filters.
    - Map symptoms, colloquial names, or local terms to record categories and keywords.
    - Categories (event_types) must be selected from this list:
      "REPORT", "PRESCRIPTION", "IMAGING", "DISCHARGE_SUMMARY", "ADMISSION_RECORD", "VACCINATION", "SURGERY", "REFERRAL", "CERTIFICATE", "GENERIC"
    - Translate Bangla/Banglish terms into English keywords (e.g. "rokto" -> "blood", "buker betha" -> "chest pain", "jwar" -> "fever").
    - If severity (HIGH, MEDIUM, LOW) is explicitly mentioned or strongly implied, specify it.

    Output JSON ONLY (no explanations, no markdown fences).
    
    JSON Structure:
    {
      "event_types": ["REPORT", "PRESCRIPTION", "IMAGING"], 
      "keywords": ["blood", "cbc", "cardiology"],
      "severity": "HIGH / MEDIUM / LOW / null"
    }
    `;
        let aiData = { event_types: [], keywords: [], severity: null };
        try {
            const result = await model.generateContent(prompt);
            const cleanedText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            aiData = JSON.parse(cleanedText);
        }
        catch (e) {
            console.error('Semantic search AI parse error:', e);
        }
        // Build MySQL SQL query based on filters
        let sql = `SELECT * FROM medical_events WHERE patient_id = ?`;
        const params = [patient_id];
        const conditions = [];
        if (aiData.event_types && aiData.event_types.length > 0) {
            const placeholders = aiData.event_types.map(() => '?').join(', ');
            conditions.push(`event_type IN (${placeholders})`);
            params.push(...aiData.event_types);
        }
        if (aiData.severity && ['HIGH', 'MEDIUM', 'LOW'].includes(aiData.severity)) {
            conditions.push(`severity = ?`);
            params.push(aiData.severity);
        }
        // Dynamic search terms matching the query itself plus any expanded keywords
        const searchTerms = [query];
        if (aiData.keywords && Array.isArray(aiData.keywords)) {
            searchTerms.push(...aiData.keywords);
        }
        if (searchTerms.length > 0) {
            const subConditions = searchTerms.map(() => `(title LIKE ? OR summary LIKE ? OR extracted_text LIKE ?)`).join(' OR ');
            conditions.push(`(${subConditions})`);
            searchTerms.forEach(term => {
                params.push(`%${term}%`, `%${term}%`, `%${term}%`);
            });
        }
        if (conditions.length > 0) {
            sql += ` AND (${conditions.join(' AND ')})`;
        }
        sql += ` ORDER BY event_date DESC, created_at DESC`;
        const [rows] = await pool.query(sql, params);
        res.status(200).json({ success: true, data: rows });
    }
    catch (error) {
        console.error('Semantic search failed:', error);
        res.status(400).json({ error: error.message });
    }
});
export default router;
