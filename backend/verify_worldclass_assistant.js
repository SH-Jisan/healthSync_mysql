import jwt from 'jsonwebtoken';

const URL_SESSIONS = 'http://localhost:5000/api/functions/ai-assistant/sessions';
const URL_CHAT = 'http://localhost:5000/api/functions/ai-assistant/chat';
const JWT_SECRET = process.env.JWT_SECRET || 'healthsync_secret_key_jwt';

function getAuthToken(userId, role) {
    return 'Bearer ' + jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '1h' });
}

async function runTests() {
    console.log('🧪 Starting World-Class AI Health Assistant Verification Suite...\n');

    const citizenToken = getAuthToken('c1111111-1111-1111-1111-111111111111', 'CITIZEN');

    // 1. Create a Chat Session
    console.log('1️⃣ Testing Chat Session Creation...');
    const sessionRes = await fetch(URL_SESSIONS, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': citizenToken
        },
        body: JSON.stringify({ title: 'World-Class AI Test Consultation' })
    });
    const sessionData = await sessionRes.json();
    console.log(`Status Code: ${sessionRes.status}`);
    if (sessionRes.status === 200 && sessionData.success) {
        console.log(`Created Session ID: ${sessionData.data.id}`);
        console.log('✅ PASS: Session created successfully.\n');
    } else {
        console.log('❌ FAIL: Session creation failed.\n');
        return;
    }

    const sessionId = sessionData.data.id;

    // 2. Test Session Pinning (PUT /pin)
    console.log('2️⃣ Testing Conversation Pinning (PUT /pin)...');
    const pinRes = await fetch(`${URL_SESSIONS}/${sessionId}/pin`, {
        method: 'PUT',
        headers: {
            'Authorization': citizenToken
        }
    });
    const pinData = await pinRes.json();
    console.log(`Status Code: ${pinRes.status}`);
    if (pinRes.status === 200 && pinData.success) {
        console.log(`Pin Status: ${pinData.is_pinned}`);
        console.log('✅ PASS: Session pinned successfully.\n');
    } else {
        console.log('❌ FAIL: Session pin toggle failed.\n');
    }

    // 3. Test Multi-Entity RAG Chat Generation
    console.log('3️⃣ Testing Multi-Entity RAG Context Chat Generation...');
    const chatRes = await fetch(URL_CHAT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': citizenToken
        },
        body: JSON.stringify({
            sessionId: sessionId,
            message: 'Have I had any recent blood tests or hospital admissions, and when is my next appointment?'
        })
    });

    const chatData = await chatRes.json();
    console.log(`Status Code: ${chatRes.status}`);
    if (chatRes.status === 200 && chatData.success) {
        console.log('AI Response Snippet:');
        console.log(`${chatData.data.aiMessage.message.slice(0, 200)}...\n`);
        console.log('✅ PASS: Multi-entity RAG response generated cleanly.\n');
    } else {
        console.log('❌ FAIL: Chat execution returned error: ' + (chatData.error || 'Unknown') + '\n');
    }

    // 4. Test Export Chat Transcript
    console.log('4️⃣ Testing Chat Transcript Export (GET /export)...');
    const exportRes = await fetch(`http://localhost:5000/api/functions/ai-assistant/export/${sessionId}`, {
        method: 'GET',
        headers: {
            'Authorization': citizenToken
        }
    });
    const exportData = await exportRes.json();
    console.log(`Status Code: ${exportRes.status}`);
    if (exportRes.status === 200 && exportData.success) {
        console.log('Export Title: ' + exportData.title);
        console.log('Export Preview:\n' + exportData.content.slice(0, 150) + '...\n');
        console.log('✅ PASS: Chat transcript exported in Markdown format successfully.\n');
    } else {
        console.log('❌ FAIL: Export failed.\n');
    }

    console.log('🎉 World-Class AI Health Assistant Test Suite Completed!');
}

runTests();
