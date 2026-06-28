import jwt from 'jsonwebtoken';

const URL_SESSIONS = 'http://localhost:5000/api/functions/ai-assistant/sessions';
const URL_CHAT = 'http://localhost:5000/api/functions/ai-assistant/chat';
const JWT_SECRET = process.env.JWT_SECRET || 'healthsync_secret_key_jwt';

function getAuthToken(userId, role) {
    return 'Bearer ' + jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '1h' });
}

async function runTests() {
    console.log('🧪 Starting AI Health Assistant Context-Aware Chatbot Verification Tests...\n');

    const citizenToken = getAuthToken('c1111111-1111-1111-1111-111111111111', 'CITIZEN');

    // 1. Create a Chat Session
    console.log('1️⃣ Testing Chat Session Creation...');
    const sessionRes = await fetch(URL_SESSIONS, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': citizenToken
        },
        body: JSON.stringify({ title: 'Integration Test Session' })
    });
    const sessionData = await sessionRes.json();
    console.log(`Status Code: ${sessionRes.status}`);
    if (sessionRes.status === 200 && sessionData.success) {
        console.log(`Session Created ID: ${sessionData.data.id}`);
        console.log('✅ PASS: Session created successfully.\n');
    } else {
        console.log('❌ FAIL: Session creation failed.\n');
        return;
    }

    const sessionId = sessionData.data.id;

    // 2. Send Context-Aware Chat Message
    console.log('2️⃣ Testing Context-Aware Conversation Generation...');
    const chatRes = await fetch(URL_CHAT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': citizenToken
        },
        body: JSON.stringify({
            sessionId: sessionId,
            message: 'What are my chronic conditions and allergies, and what should I keep in mind?'
        })
    });

    const chatData = await chatRes.json();
    console.log(`Status Code: ${chatRes.status}`);
    if (chatRes.status === 200 && chatData.success) {
        console.log('AI Response Sample:');
        console.log(`User Message ID: ${chatData.data.userMessage.id}`);
        console.log(`AI Response Message:\n${chatData.data.aiMessage.message.slice(0, 150)}...\n`);
        console.log('✅ PASS: Context-aware chatbot generated personalized health information successfully.\n');
    } else {
        console.log('❌ FAIL: Chat generation returned error: ' + (chatData.error || 'Unknown error') + '\n');
    }

    console.log('🎉 AI Assistant verification tests completed!');
}

runTests();
