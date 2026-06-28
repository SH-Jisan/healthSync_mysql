import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { pool } from '../config/db.js';
import { authenticateJWT } from '../middleware/auth.js';
import { aggregatePatientContext } from '../services/ai/contextManager.js';
import { buildSystemPrompt, buildDoctorPrepPrompt } from '../services/ai/aiPromptEngine.js';

const router = Router();

// 1. Get Chat Sessions for User (Supports Pinned Ordering & Search)
router.get('/ai-assistant/sessions', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const search = req.query.q as string;

    let sql = `SELECT * FROM ai_chat_sessions WHERE user_id = ?`;
    const params: any[] = [userId];

    if (search && search.trim()) {
      sql += ` AND title LIKE ?`;
      params.push(`%${search.trim()}%`);
    }

    sql += ` ORDER BY is_pinned DESC, updated_at DESC`;

    const [rows]: any = await pool.query(sql, params);
    res.status(200).json({ success: true, data: rows });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 2. Create New Chat Session
router.post('/ai-assistant/sessions', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { title } = req.body;
    const sessionId = crypto.randomUUID();
    const sessionTitle = title || 'Health Consultation';

    await pool.query(
      `INSERT INTO ai_chat_sessions (id, user_id, title) VALUES (?, ?, ?)`,
      [sessionId, userId, sessionTitle]
    );

    res.status(200).json({ success: true, data: { id: sessionId, user_id: userId, title: sessionTitle, is_pinned: 0 } });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 3. Toggle Session Pin Status (Phase 12 Requirement)
router.put('/ai-assistant/sessions/:id/pin', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [sessions]: any = await pool.query(
      `SELECT is_pinned FROM ai_chat_sessions WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const newPinned = !sessions[0].is_pinned;
    await pool.query(
      `UPDATE ai_chat_sessions SET is_pinned = ? WHERE id = ?`,
      [newPinned, id]
    );

    res.status(200).json({ success: true, is_pinned: newPinned });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 4. Delete Chat Session
router.delete('/ai-assistant/sessions/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    await pool.query(
      `DELETE FROM ai_chat_sessions WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 5. Get Chat Messages for Session
router.get('/ai-assistant/messages/:sessionId', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { sessionId } = req.params;

    const [sessions]: any = await pool.query(
      `SELECT id FROM ai_chat_sessions WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found or unauthorized' });
    }

    const [messages]: any = await pool.query(
      `SELECT * FROM ai_chat_messages WHERE session_id = ? ORDER BY created_at ASC`,
      [sessionId]
    );

    res.status(200).json({ success: true, data: messages });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 6. Export Chat History (Markdown/Text format for sharing - Phase 12)
router.get('/ai-assistant/export/:sessionId', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { sessionId } = req.params;

    const [sessions]: any = await pool.query(
      `SELECT title, created_at FROM ai_chat_sessions WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const [messages]: any = await pool.query(
      `SELECT sender, message, created_at FROM ai_chat_messages WHERE session_id = ? ORDER BY created_at ASC`,
      [sessionId]
    );

    let exportContent = `# HealthSync Consultation Transcript: ${sessions[0].title}\n`;
    exportContent += `Date: ${new Date(sessions[0].created_at).toLocaleString()}\n\n`;
    exportContent += `--------------------------------------------------\n\n`;

    messages.forEach((m: any) => {
      const timeStr = new Date(m.created_at).toLocaleTimeString();
      exportContent += `### [${timeStr}] ${m.sender === 'USER' ? 'Patient' : 'HealthSync AI Assistant'}:\n${m.message}\n\n`;
    });

    exportContent += `\n--------------------------------------------------\n`;
    exportContent += `Disclaimer: This document is generated for informational guidance based on user health records. Always consult a qualified physician for medical decisions.\n`;

    res.status(200).json({ success: true, title: sessions[0].title, content: exportContent });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 7. Context-Aware AI Chat Endpoint (Modular Engine Integration)
router.post('/ai-assistant/chat', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { sessionId, message, referencedEventId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured on server.');

    let activeSessionId = sessionId;
    if (!activeSessionId) {
      activeSessionId = crypto.randomUUID();
      const initialTitle = message.trim().slice(0, 30) + '...';
      await pool.query(
        `INSERT INTO ai_chat_sessions (id, user_id, title) VALUES (?, ?, ?)`,
        [activeSessionId, userId, initialTitle]
      );
    } else {
      const [sessions]: any = await pool.query(
        `SELECT id FROM ai_chat_sessions WHERE id = ? AND user_id = ?`,
        [activeSessionId, userId]
      );
      if (sessions.length === 0) {
        return res.status(404).json({ error: 'Session not found or unauthorized' });
      }
    }

    // A. Fetch Multi-Entity Patient Context using modular contextManager
    const medicalContext = await aggregatePatientContext(userId, message.trim(), referencedEventId);

    // B. Fetch Previous 10 Messages for Conversational Memory
    const [chatHistory]: any = await pool.query(
      `SELECT sender, message FROM ai_chat_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 10`,
      [activeSessionId]
    );
    const orderedHistory = (chatHistory || []).reverse();
    const formattedHistory = orderedHistory.map((m: any) => `${m.sender}: ${m.message}`).join('\n');

    // C. Build Clinical System Prompt using modular aiPromptEngine
    const systemPrompt = buildSystemPrompt(medicalContext, formattedHistory, message.trim());

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

    const result = await model.generateContent(systemPrompt);
    const aiResponseText = result.response.text();

    const userMsgId = crypto.randomUUID();
    const aiMsgId = crypto.randomUUID();

    // Store User & AI Messages
    await pool.query(
      `INSERT INTO ai_chat_messages (id, session_id, sender, message, referenced_event_id) VALUES (?, ?, 'USER', ?, ?)`,
      [userMsgId, activeSessionId, message.trim(), referencedEventId || null]
    );

    await pool.query(
      `INSERT INTO ai_chat_messages (id, session_id, sender, message, referenced_event_id) VALUES (?, ?, 'ASSISTANT', ?, ?)`,
      [aiMsgId, activeSessionId, aiResponseText, referencedEventId || null]
    );

    await pool.query(
      `UPDATE ai_chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [activeSessionId]
    );

    res.status(200).json({
      success: true,
      data: {
        sessionId: activeSessionId,
        userMessage: { id: userMsgId, sender: 'USER', message: message.trim(), created_at: new Date() },
        aiMessage: { id: aiMsgId, sender: 'ASSISTANT', message: aiResponseText, created_at: new Date() }
      }
    });

  } catch (error: any) {
    console.error('AI Health Assistant Chat Error:', error);
    res.status(400).json({ error: error.message });
  }
});

// 8. Doctor Visit Preparation Generator Endpoint (Phase 2 Roadmap Feature)
router.post('/ai-assistant/doctor-prep', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { lang } = req.body;
    const language = lang === 'bn' ? 'bn' : 'en';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured on server.');

    const medicalContext = await aggregatePatientContext(userId, 'doctor visit prep', undefined);
    const prepPrompt = buildDoctorPrepPrompt(medicalContext, language);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

    const result = await model.generateContent(prepPrompt);
    const prepText = result.response.text();

    res.status(200).json({
      success: true,
      data: {
        prepGuide: prepText
      }
    });

  } catch (error: any) {
    console.error('Doctor Visit Prep Error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
