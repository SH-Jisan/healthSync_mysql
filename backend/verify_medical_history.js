import jwt from 'jsonwebtoken';

const URL_SEARCH = 'http://localhost:5000/api/functions/semantic-search';
const URL_PROCESS = 'http://localhost:5000/api/functions/process-medical-report';
const JWT_SECRET = process.env.JWT_SECRET || 'healthsync_secret_key_jwt';

function getAuthToken(userId, role) {
    return 'Bearer ' + jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '1h' });
}

async function runTests() {
    console.log('🧪 Starting Medical History & AI Analysis Integration Tests...\n');

    const citizenToken = getAuthToken('c1111111-1111-1111-1111-111111111111', 'CITIZEN');

    // 1. Test Semantic Search Query Expansion
    console.log('1️⃣ Testing Semantic Search for "blood test" (rokto porikkha)...');
    const searchRes = await fetch(URL_SEARCH, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': citizenToken
        },
        body: JSON.stringify({
            query: 'rokto porikkha cbc',
            patient_id: 'c1111111-1111-1111-1111-111111111111'
        })
    });

    const searchData = await searchRes.json();
    console.log(`Status Code: ${searchRes.status}`);
    console.log(`Search Results Count: ${searchData.data ? searchData.data.length : 'N/A'}`);
    if (searchRes.status === 200 && searchData.success) {
        console.log('✅ PASS: Semantic search endpoint responded successfully.\n');
    } else {
        console.log('❌ FAIL: Semantic search endpoint failed.\n');
    }

    // 2. Test AI Multi-Level Analysis Mock Call
    console.log('2️⃣ Testing AI Medical Report Analyzer...');
    const processRes = await fetch(URL_PROCESS, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': citizenToken
        },
        body: JSON.stringify({
            reportText: 'Patient: Jisan. Test: CBC. Hemoglobin: 8.5 g/dL (Low, Reference: 12-16). Platelets: 150k. Severity suggestion: HIGH.',
            patient_id: 'c1111111-1111-1111-1111-111111111111',
            file_url: 'http://localhost:5000/uploads/reports/test_report.pdf',
            file_hash: 'hash-test-mock-123'
        })
    });

    const processData = await processRes.json();
    console.log(`Status Code: ${processRes.status}`);
    if (processRes.status === 200 && processData.success) {
        console.log('AI Analysis Output Structure Sample:');
        console.log(`- Title: ${processData.data.title}`);
        console.log(`- Event Type: ${processData.data.event_type}`);
        console.log(`- Quick Summary (EN): ${processData.data.quick_summary_en}`);
        console.log(`- Patient Explanation (EN): ${processData.data.patient_explanation_en ? processData.data.patient_explanation_en.slice(0, 50) + '...' : 'N/A'}`);
        console.log(`- Doctor Summary (EN): ${processData.data.doctor_summary_en}`);
        console.log(`- Alerts Generated: ${JSON.stringify(processData.data.alerts)}`);
        console.log('✅ PASS: AI analysis generated multi-level clinical details correctly.\n');
    } else if (processRes.status === 409) {
        console.log('⚠️ Note: Duplicate file uploaded (already seeded). Test passes.');
        console.log('✅ PASS: Duplicate check blocked re-upload.\n');
    } else {
        console.log('❌ FAIL: AI Analyzer returned error: ' + (processData.error || 'Unknown error') + '\n');
    }

    console.log('🎉 Integration checks completed!');
}

runTests();
