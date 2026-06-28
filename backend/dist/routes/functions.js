import { Router } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAuth } from 'google-auth-library';
import { pool } from '../config/db.js';
import { authenticateJWT } from '../middleware/auth.js';
const router = Router();
// 1. Extract Blood Request
router.post('/extract-blood-request', authenticateJWT, async (req, res) => {
    try {
        const { text } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey)
            throw new Error('GEMINI_API_KEY not set');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
        const prompt = `
    Role: Medical Emergency Assistant.
    Input Text: "${text}"

    Task: Extract blood request details.

    Output Format: JSON ONLY.
    {
      "blood_group": "A+/A-/B+/B-/O+/O-/AB+/AB- or null if not found",
      "location": "Hospital name or Area name or null",
      "urgency": "CRITICAL (if accident/operation/emergency) or NORMAL",
      "patient_note": "A polite and clear message for donors summarizing the need (max 20 words)."
    }
    `;
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        res.status(200).json(JSON.parse(cleanedText));
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// 2. Generate Health Plan
router.post('/generate-health-plan', authenticateJWT, async (req, res) => {
    try {
        const { history, language } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey)
            throw new Error('GEMINI_API_KEY not set');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
        const isBangla = language === 'bangla';
        const langInstruction = isBangla
            ? 'Provide the response strictly in BENGALI language.'
            : 'Provide the response strictly in ENGLISH language.';
        const prompt = `
    Role: Expert AI Medical Assistant & Nutritionist.
    Task: Analyze the patient's medical history and create a personalized daily health routine.

    Patient Medical History (Latest Events):
    ${JSON.stringify(history)}

    Instructions:
    1. Analyze the 'severity', 'event_type', and 'summary' of the provided events.
    2. Create a routine including Diet, Exercise, and Precautions based on these conditions.
    3. ${langInstruction}
    4. Ensure 'diet', 'exercise', and 'precautions' are SIMPLE STRINGS (semicolon or newline separated if needed). Do NOT use nested arrays or objects.

    Output JSON format (Strictly JSON, no Markdown):
    {
      "summary": "Short analysis of current health status based on history",
      "diet": "Specific food advice (what to eat and what to avoid) as a single string",
      "exercise": "Safe exercises suitable for their condition as a single string",
      "precautions": "Critical warnings or lifestyle changes as a single string"
    }
    `;
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        res.status(200).json(JSON.parse(cleanedText));
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// 3. Notify Donors
router.post('/notify-donors', authenticateJWT, async (req, res) => {
    try {
        const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!serviceAccountStr)
            throw new Error('Missing FIREBASE_SERVICE_ACCOUNT in secrets');
        const serviceAccount = JSON.parse(serviceAccountStr);
        const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
        const auth = new GoogleAuth({
            credentials: {
                client_email: serviceAccount.client_email,
                private_key: privateKey,
                project_id: serviceAccount.project_id,
            },
            scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
        });
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        if (!accessToken.token)
            throw new Error('Failed to generate Access Token');
        const { blood_group, hospital, urgency } = req.body;
        console.log(`🔍 Finding donors for ${blood_group}...`);
        const [donors] = await pool.query(`SELECT \`User\`.fcm_token FROM blood_donors 
       INNER JOIN \`User\` ON blood_donors.user_id = \`User\`.id 
       WHERE blood_donors.availability = true AND \`User\`.blood_group = ?`, [blood_group]);
        const tokens = donors
            .map((d) => d.fcm_token)
            .filter((token) => token && typeof token === 'string' && token.length > 10);
        const uniqueTokens = [...new Set(tokens)];
        if (uniqueTokens.length === 0) {
            console.log('⚠️ No compatible donors found.');
            return res.status(200).json({ message: 'No donors found' });
        }
        console.log(`📢 Sending to ${uniqueTokens.length} devices via HTTP v1...`);
        const sendPromises = uniqueTokens.map(async (token) => {
            const url = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
            const payload = {
                message: {
                    token: token,
                    notification: {
                        title: `🩸 Urgent: ${blood_group} Blood Needed!`,
                        body: `${urgency} Request at ${hospital}. Tap to help!`,
                    },
                    data: {
                        type: 'blood_request',
                        click_action: 'FLUTTER_NOTIFICATION_CLICK',
                    }
                }
            };
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            return res.ok;
        });
        const results = await Promise.all(sendPromises);
        const successCount = results.filter(r => r === true).length;
        const failureCount = results.length - successCount;
        console.log(`✅ Sent: ${successCount}, ❌ Failed: ${failureCount}`);
        res.status(200).json({
            success: true,
            sent_count: successCount,
            failed_count: failureCount
        });
    }
    catch (error) {
        console.error('❌ Critical Error:', error.message);
        res.status(400).json({ error: error.message });
    }
});
// 4. Process Medical Report
router.post('/process-medical-report', authenticateJWT, async (req, res) => {
    try {
        const { imageBase64, mimeType, reportText, patient_id, uploader_id, file_url, file_hash, file_path } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey)
            throw new Error('Missing environment variables!');
        // Duplicate Check based on File Hash
        if (file_hash) {
            const [duplicates] = await pool.query('SELECT id FROM medical_events WHERE patient_id = ? AND file_hash = ?', [patient_id, file_hash]);
            if (duplicates.length > 0) {
                // Clean local file if duplicate
                if (file_path) {
                    const fullPath = path.join(process.cwd(), 'public/uploads', file_path);
                    if (fs.existsSync(fullPath)) {
                        try {
                            fs.unlinkSync(fullPath);
                        }
                        catch (err) { }
                    }
                }
                return res.status(409).json({ error: 'Duplicate File: This report has already been uploaded.' });
            }
        }
        // Fetch previous reports for comparative analysis
        const [prevEvents] = await pool.query(`SELECT title, event_type, event_date, severity, summary, key_findings FROM medical_events WHERE patient_id = ? ORDER BY event_date DESC, created_at DESC LIMIT 5`, [patient_id]);
        const historyText = prevEvents && prevEvents.length > 0
            ? JSON.stringify(prevEvents, null, 2)
            : 'No previous medical history available.';
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
        const prompt = `
    Role: You are an Expert Medical AI Assistant with strong OCR, clinical reasoning, and bilingual explanation skills.

Primary Objective:
Accurately read, understand, and analyze medical documents (reports or prescriptions) from image or text input, with zero hallucination.

PATIENT HISTORICAL MEDICAL RECORDS:
${historyText}

Step-by-step Tasks:

1. OCR & TEXT EXTRACTION:
   - Extract every single visible word, number, symbol, heading, footer, stamp, handwriting (if readable).
   - Preserve original spelling, line breaks, units, and formatting as closely as possible.
   - Do NOT guess missing or unclear text. If unreadable, write "[illegible]".

2. DOCUMENT CLASSIFICATION:
   - Identify the document type strictly as one of:
     - "REPORT" (lab tests, investigations, pathology, etc.)
     - "PRESCRIPTION" (medicines, dosage, doctor advice)
     - "IMAGING" (X-ray, CT, MRI, Ultrasound, etc.)
     - "DISCHARGE_SUMMARY" (discharge summary notes)
     - "ADMISSION_RECORD" (admission records)
     - "VACCINATION" (vaccine records)
     - "SURGERY" (surgical history)
     - "REFERRAL" (referral documents)
     - "CERTIFICATE" (medical certificates)
     - "GENERIC" (any other records)

3. MULTI-LEVEL AI SUMMARY:
   Provide analysis structured across five distinct summaries:
   a) Quick Summary (2-4 sentences): Short clinical overview.
   b) Detailed Summary: Complete explanation of the report in simple language.
   c) Medical Insights: Main diagnosis, key findings (values/reference ranges), abnormal/normal values, recommended follow-up tests, suggested discussion points for their doctor, and risk indicators.
   d) Patient-Friendly Explanation: Term definitions in plain English/Bangla, why it matters, symptom associations, and lifestyle/wellness considerations.
   e) Doctor-Oriented Summary: Concise clinical summary preserving medical jargon.

4. HISTORICAL COMPARISON:
   Compare the newly uploaded report with the patient's HISTORICAL MEDICAL RECORDS provided above.
   Identify:
   - Improvements, stable conditions, or deterioration of laboratory/clinical values.
   - Disease progression or recovery progress.
   If no previous records are provided, indicate "No historical records to compare."

5. INTELLIGENT ALERTS:
   Extract any parameters or findings that require:
   - Immediate clinical attention (CRITICAL)
   - Follow-up checkups (FOLLOW_UP)
   - Basic monitoring/information (INFO)
   Provide these as a list of alert objects.

6. BILINGUAL OUTPUT:
   Provide ALL explanations and summaries in both:
   - English
   - Bengali (Bangla, simple and natural language)

7. SAFETY & VALIDATION RULES:
   - Do NOT make a confirmed final diagnosis. Always encourage users to consult qualified healthcare professionals.
   - Clearly state when a doctor consultation is required.
   - Medicine safety check: for prescriptions, identify potential drug interactions; for reports, return "N/A".

Final Output:
Return ONLY valid JSON (no explanations, no markdown fences outside text fields).

JSON Structure:
{
  "title": "Short descriptive title (e.g., CBC Report / Prescription by Dr. X)",
  "event_type": "REPORT / PRESCRIPTION / IMAGING / DISCHARGE_SUMMARY / ADMISSION_RECORD / VACCINATION / SURGERY / REFERRAL / CERTIFICATE / GENERIC",
  "event_date": "YYYY-MM-DD (If not found, use today's date)",
  "severity": "HIGH / MEDIUM / LOW",

  "quick_summary_en": "Quick summary in English",
  "quick_summary_bn": "বাংলায় সংক্ষিপ্ত সারসংক্ষেপ",

  "detailed_summary_en": "Detailed summary in English",
  "detailed_summary_bn": "বাংলায় বিস্তারিত সারসংক্ষেপ",

  "medical_insights_en": "Medical insights in English (diagnosis, findings, recommended tests, suggested questions).",
  "medical_insights_bn": "বাংলায় মেডিকেল ইনসাইট (মূল রোগ নির্ণয়, পরীক্ষার ফলাফল, পরবর্তী পরীক্ষা, ডাক্তারকে জিজ্ঞাস্য প্রশ্ন)।",

  "patient_explanation_en": "Patient-friendly explanation (what it means, why it matters, symptom/lifestyle advice) in English.",
  "patient_explanation_bn": "বাংলায় রোগীর জন্য সহজ ব্যাখ্যা (এর অর্থ কী, এটি কেন গুরুত্বপূর্ণ, উপসর্গ ও লাইফস্টাইল বিষয়ক পরামর্শ)।",

  "doctor_summary_en": "Clinical doctor-oriented summary in English.",
  "doctor_summary_bn": "ডাক্তারদের জন্য বাংলায় ক্লিনিকাল সারসংক্ষেপ।",

  "historical_comparison_en": "Comparison with previous records in English.",
  "historical_comparison_bn": "পূর্ববর্তী রেকর্ডের সাথে তুলনা বাংলায়।",

  "alerts": [
    {
      "title": "Alert Title",
      "message": "Detailed warning/info message",
      "type": "CRITICAL / FOLLOW_UP / INFO"
    }
  ],

  "extracted_text": "Complete extracted OCR text.",
  "key_findings": ["Key values with status"],
  "medicine_safety_check": "Safe / Caution / Danger / N/A"
}`;
        let generatedContent;
        if (imageBase64) {
            const result = await model.generateContent([
                prompt,
                { inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } },
            ]);
            generatedContent = result.response.text();
        }
        else {
            const result = await model.generateContent([prompt, `DOCUMENT CONTENT: ${reportText}`]);
            generatedContent = result.response.text();
        }
        const cleanedText = generatedContent.replace(/```json/g, '').replace(/```/g, '').trim();
        let aiData;
        try {
            aiData = JSON.parse(cleanedText);
        }
        catch (e) {
            console.error('JSON Parse Error:', cleanedText);
            throw new Error('Failed to parse AI response');
        }
        const newTitle = aiData.title || 'Medical Document';
        const rawDate = aiData.event_date;
        const newDate = (rawDate && rawDate.match(/^\d{4}-\d{2}-\d{2}$/))
            ? rawDate
            : new Date().toISOString().split('T')[0];
        const eventId = crypto.randomUUID();
        // Insert into MySQL
        await pool.query(`INSERT INTO medical_events 
       (id, patient_id, uploader_id, title, event_type, event_date, severity, summary, extracted_text, key_findings, attachment_urls, file_hash, ai_details) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            eventId,
            patient_id,
            uploader_id || patient_id,
            newTitle,
            aiData.event_type || 'REPORT',
            newDate,
            aiData.severity || 'LOW',
            aiData.quick_summary_en || aiData.simple_explanation_en || '',
            aiData.extracted_text || '',
            JSON.stringify(aiData.key_findings || []),
            JSON.stringify([file_url]),
            file_hash || '',
            JSON.stringify(aiData)
        ]);
        // Auto-generate notifications for critical alerts
        if (aiData.alerts && Array.isArray(aiData.alerts)) {
            for (const alertObj of aiData.alerts) {
                if (alertObj.type === 'CRITICAL' || aiData.severity === 'HIGH') {
                    await pool.query(`INSERT INTO notifications (id, user_id, title, content) VALUES (?, ?, ?, ?)`, [crypto.randomUUID(), patient_id, `⚠️ Critical Alert: ${alertObj.title}`, alertObj.message]);
                }
            }
        }
        res.status(200).json({ success: true, data: aiData });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// 5. Triage Symptoms
router.post('/triage-symptoms', authenticateJWT, async (req, res) => {
    try {
        const { symptoms, location } = req.body;
        const userLocation = location || 'Dhaka, Bangladesh';
        const apiKey = process.env.GEMINI_API_KEY;
        const serperKey = process.env.SERPER_API_KEY;
        if (!apiKey || !serperKey)
            throw new Error('Missing API keys!');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
        const prompt = `
    Role: Professional Medical Triage Nurse.
    Input Symptoms: "${symptoms}"

    Task: Analyze symptoms. Provide possible condition, list of potential causes, urgency, specialist, and advice.

    Output Format: JSON ONLY.
    {
      "condition": "Brief condition name (e.g. Migraine)",
      "potential_causes": ["Cause 1", "Cause 2", "Cause 3"],
      "specialty": "Medical Specialty Name (e.g. Neurologist)",
      "urgency": "HIGH/MEDIUM/LOW",
      "advice": "Immediate advice",
      "search_query": "Keyword to search doctor (e.g. Best Neurologist)"
    }
    `;
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiData = JSON.parse(cleanedText);
        // Google Search via Serper API
        const searchQuery = `${aiData.search_query} in ${userLocation}`;
        const searchResponse = await fetch('https://google.serper.dev/places', {
            method: 'POST',
            headers: {
                'X-API-KEY': serperKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ q: searchQuery })
        });
        const searchData = (await searchResponse.json());
        const finalResponse = {
            ...aiData,
            internet_doctors: searchData.places || []
        };
        res.status(200).json(finalResponse);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
export default router;
