import jwt from 'jsonwebtoken';

const URL_PREP = 'http://localhost:5000/api/functions/ai-assistant/doctor-prep';
const URL_CHAT = 'http://localhost:5000/api/functions/ai-assistant/chat';
const JWT_SECRET = process.env.JWT_SECRET || 'healthsync_secret_key_jwt';

function getAuthToken(userId, role) {
    return 'Bearer ' + jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '1h' });
}

async function runTests() {
    console.log('🧪 Starting Phase 2 High-Priority AI Features Verification Suite...\n');

    const citizenToken = getAuthToken('c1111111-1111-1111-1111-111111111111', 'CITIZEN');

    // 1. Test Doctor Visit Preparation Generator (POST /doctor-prep)
    console.log('1️⃣ Testing Doctor Visit Prep Guide Generation (POST /doctor-prep)...');
    const prepRes = await fetch(URL_PREP, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': citizenToken
        },
        body: JSON.stringify({ lang: 'bn' })
    });
    const prepData = await prepRes.json();
    console.log(`Status Code: ${prepRes.status}`);
    if (prepRes.status === 200 && prepData.success) {
        console.log('Prep Guide Snippet (Bangla):');
        console.log(`${prepData.data.prepGuide.slice(0, 250)}...\n`);
        console.log('✅ PASS: Doctor visit prep guide generated successfully.\n');
    } else {
        console.log('❌ FAIL: Doctor prep generation failed: ' + (prepData.error || 'Unknown error') + '\n');
    }

    // 2. Test Lab Trend Analysis Query via Chat Endpoint
    console.log('2️⃣ Testing Lab Trend Analysis Query via Chat...');
    const chatRes = await fetch(URL_CHAT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': citizenToken
        },
        body: JSON.stringify({
            message: 'আমার সাম্প্রতিক ল্যাব রিপোর্টগুলোর পরিবর্তন ও ট্রেন্ড এনালাইসিস করুন'
        })
    });

    const chatData = await chatRes.json();
    console.log(`Status Code: ${chatRes.status}`);
    if (chatRes.status === 200 && chatData.success) {
        console.log('Lab Trend AI Response Snippet:');
        console.log(`${chatData.data.aiMessage.message.slice(0, 200)}...\n`);
        console.log('✅ PASS: Lab trend chat analysis generated cleanly.\n');
    } else {
        console.log('❌ FAIL: Chat execution returned error: ' + (chatData.error || 'Unknown') + '\n');
    }

    console.log('🎉 Phase 2 AI Features Verification Suite Completed!');
}

runTests();
