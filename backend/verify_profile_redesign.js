import jwt from 'jsonwebtoken';

const URL_QUERY = 'http://localhost:5000/api/db/query';
const JWT_SECRET = process.env.JWT_SECRET || 'healthsync_secret_key_jwt';

function getAuthToken(userId, role) {
    return 'Bearer ' + jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '1h' });
}

async function runTests() {
    console.log('🧪 Starting Profile Redesign Verification Suite...\n');

    const citizenToken = getAuthToken('c1111111-1111-1111-1111-111111111111', 'CITIZEN');

    // 1. Query Citizen Profile
    console.log('1️⃣ Querying Citizen Profile Data...');
    const res = await fetch(URL_QUERY, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': citizenToken
        },
        body: JSON.stringify({
            table: 'User',
            action: 'select',
            selectFields: '*',
            filters: [{ field: 'id', type: 'eq', value: 'c1111111-1111-1111-1111-111111111111' }]
        })
    });

    const data = await res.json();
    console.log(`Status Code: ${res.status}`);
    if (res.status === 200 && Array.isArray(data.data) && data.data.length > 0) {
        const user = data.data[0];
        console.log(`User Name: ${user.full_name}`);
        console.log(`Email: ${user.email}`);
        console.log(`Blood Group: ${user.blood_group}`);
        console.log('✅ PASS: Citizen profile retrieved cleanly.\n');
    } else {
        console.log('❌ FAIL: Profile query failed: ' + JSON.stringify(data) + '\n');
    }

    console.log('🎉 Profile Redesign Verification Suite Completed!');
}

runTests();
