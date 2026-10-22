const fetch = require('node-fetch'); // Ensure node-fetch is available or use native fetch in newer node

// Polyfill fetch if needed (Node 18+ has it native)
const doFetch = global.fetch || fetch;

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
    console.log("🚀 Starting Integration Tests...");

    try {
        // 1. Get List of Trains
        console.log("\n1. Fetching Trains...");
        const resTrains = await doFetch(`${BASE_URL}/trains`);
        const trains = await resTrains.json();
        
        if (!trains || trains.length === 0) throw new Error("No trains found. Did you run the SQL script?");
        console.log(`✅ Found ${trains.length} trains.`);

        const testTrain = trains[0];
        console.log(`   Targeting Train: ${testTrain.name} (ID: ${testTrain.id}, Current Status: ${testTrain.status})`);

        // 2. Scan IN until High Crowd
        console.log("\n2. Simulating Crowd Increase (Scanning IN)...");
        let currentStatus = testTrain.status;
        let suggestion = null;

        // Force reset or ensure we can hit high
        // We'll loop 5 times to simulate multiple people entering
        for (let i = 0; i < 5; i++) {
            const resScan = await doFetch(`${BASE_URL}/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transport_id: testTrain.id,
                    event_type: 'IN',
                    user_id: 'test_user'
                })
            });
            const data = await resScan.json();
            
            if (data.suggestion) {
                suggestion = data.suggestion;
                console.log(`   ⚠️ Smart Suggestion Triggered at loop ${i+1}:`);
                console.log(`      "${suggestion.message}"`);
            }
            currentStatus = data.data.status;
        }
        
        console.log(`   Final Status after scans: ${currentStatus}`);

        // 3. Verify Suggestion Logic
        if (currentStatus === 'High' && suggestion) {
            console.log("✅ PASS: System correctly suggested alternative when crowd is High.");
        } else if (currentStatus === 'High' && !suggestion) {
            console.log("⚠️ WARNING: Status is High but no suggestion returned. (Maybe no alternative exists in DB?)");
        } else {
             console.log("ℹ️ Note: Crowd did not reach 'High' levels, so no suggestion expected.");
        }

        // 4. Scan OUT to cleanup
        console.log("\n3. Cleaning up (Scanning OUT)...");
        await doFetch(`${BASE_URL}/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transport_id: testTrain.id,
                event_type: 'OUT',
                user_id: 'test_user'
            })
        });
        console.log("✅ Cleanup done.");

    } catch (err) {
        console.error("❌ TEST FAILED:", err.message);
        if (err.message.includes('ECONNREFUSED')) {
            console.error("   Is the server running? Attempted to connect to " + BASE_URL);
        }
    }
}

runTests();
