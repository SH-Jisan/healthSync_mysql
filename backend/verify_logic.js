import jwt from 'jsonwebtoken';

const URL = 'http://localhost:5000/api/db/query';
const JWT_SECRET = process.env.JWT_SECRET || 'healthsync_secret_key_jwt';

function getAuthToken(userId, role) {
    return 'Bearer ' + jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '1h' });
}

async function testQuery(payload, token) {
    const res = await fetch(URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify(payload)
    });
    const status = res.status;
    const body = await res.json().catch(() => ({}));
    return { status, body };
}

async function runTests() {
    console.log('🧪 Starting Enterprise Healthcare Logic Verification Tests...\n');

    const citizen1Token = getAuthToken('c1111111-1111-1111-1111-111111111111', 'CITIZEN');
    const citizen2Token = getAuthToken('c2222222-2222-2222-2222-222222222222', 'CITIZEN');
    const doctorToken = getAuthToken('d1111111-1111-1111-1111-111111111111', 'DOCTOR');
    const diagToken = getAuthToken('g1111111-1111-1111-1111-111111111111', 'DIAGNOSTIC');

    // ==========================================
    // 1. Duplicate NID Verification Test
    // ==========================================
    console.log('1️⃣ Testing Duplicate National ID Validation...');
    
    // Set NID of Citizen 1 to '1234567890' (should succeed)
    const setNidRes = await testQuery({
        action: 'update',
        table: 'User',
        filters: [{ field: 'id', type: 'eq', value: 'c1111111-1111-1111-1111-111111111111' }],
        data: { national_id: '1234567890' }
    }, citizen1Token);
    
    // Try to set NID of Citizen 2 to '1234567890' (should fail)
    const duplicateNidPayload = {
        action: 'update',
        table: 'User',
        filters: [{ field: 'id', type: 'eq', value: 'c2222222-2222-2222-2222-222222222222' }],
        data: { national_id: '1234567890' }
    };
    const dupRes = await testQuery(duplicateNidPayload, citizen2Token);
    console.log(`Status Code: ${dupRes.status}`);
    console.log(`Error Message: ${dupRes.body.error || 'None'}`);
    if (dupRes.status === 400 && dupRes.body.error && dupRes.body.error.includes('already exists')) {
        console.log('✅ PASS: Successfully blocked duplicate National ID assignment.\n');
    } else {
        console.log('❌ FAIL: Expected duplicate National ID to be blocked.\n');
    }

    // ==========================================
    // 2. Doctor Leaves Past Date Validation
    // ==========================================
    console.log('2️⃣ Testing Doctor Leave Past Date Validation...');
    const pastLeavePayload = {
        action: 'insert',
        table: 'doctor_leaves',
        data: {
            doctor_id: 'd1111111-1111-1111-1111-111111111111',
            start_date: '2020-01-01',
            end_date: '2020-01-05',
            leave_type: 'CASUAL',
            status: 'PENDING',
            reason: 'Sick leave in past'
        }
    };
    const pastLeaveRes = await testQuery(pastLeavePayload, doctorToken);
    console.log(`Status Code: ${pastLeaveRes.status}`);
    console.log(`Error Message: ${pastLeaveRes.body.error || 'None'}`);
    if (pastLeaveRes.status === 400 && pastLeaveRes.body.error && pastLeaveRes.body.error.includes('in the past')) {
        console.log('✅ PASS: Successfully blocked leave application in the past.\n');
    } else {
        console.log('❌ FAIL: Expected past leave date to be blocked.\n');
    }

    // ==========================================
    // 3. Invalid Diagnostic Status Transition
    // ==========================================
    console.log('3️⃣ Testing Invalid Diagnostic Status Transition...');
    
    // Get a valid test_id from database
    const selectTest = await testQuery({
        action: 'select',
        table: 'MedicalTest',
        selectFields: ['id'],
        limitCount: 1
    }, citizen1Token);
    const testId = selectTest.body.data?.[0]?.id || 'test-1';

    // Cleanup previous order if any
    await testQuery({
        action: 'delete',
        table: 'diagnostic_orders',
        filters: [{ field: 'id', type: 'eq', value: 'diag-order-1' }]
    }, diagToken);

    // Insert Booked Order
    const insertOrder = await testQuery({
        action: 'insert',
        table: 'diagnostic_orders',
        data: {
            id: 'diag-order-1',
            payment_id: 'payment-1',
            patient_id: 'c1111111-1111-1111-1111-111111111111',
            diagnostic_id: 'g1111111-1111-1111-1111-111111111111',
            test_id: testId,
            status: 'BOOKED'
        }
    }, diagToken);

    if (insertOrder.status !== 200) {
        console.log('Setup Error inserting order:', insertOrder.body.error);
    }

    // Attempt transition straight from BOOKED to APPROVED (should fail)
    const invalidTransitionPayload = {
        action: 'update',
        table: 'diagnostic_orders',
        filters: [{ field: 'id', type: 'eq', value: 'diag-order-1' }],
        data: {
            status: 'APPROVED'
        }
    };
    const transRes = await testQuery(invalidTransitionPayload, diagToken);
    console.log(`Status Code: ${transRes.status}`);
    console.log(`Error Message: ${transRes.body.error || 'None'}`);
    if (transRes.status === 400 && transRes.body.error && transRes.body.error.includes('Invalid diagnostic status transition')) {
        console.log('✅ PASS: Successfully blocked illegal status transition sequence.\n');
    } else {
        console.log('❌ FAIL: Expected illegal transition to be rejected.\n');
    }

    // Clean up
    await testQuery({
        action: 'delete',
        table: 'diagnostic_orders',
        filters: [{ field: 'id', type: 'eq', value: 'diag-order-1' }]
    }, diagToken);

    console.log('🎉 Verification checks completed!');
}

runTests();
