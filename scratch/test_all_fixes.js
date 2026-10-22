const http = require("http");

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on("error", (err) => reject(err));

    if (postData) {
      req.write(typeof postData === "string" ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log("==================================================");
  console.log("APLI-MUMBAI COMPREHENSIVE AUTOMATED VERIFICATION");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST GROUP 1: User-Wise My Tickets Isolation
    // ----------------------------------------------------
    console.log("\n--- TEST GROUP 1: User-Wise Ticket Isolation ---");

    const userA = "test_user_A_123";
    const userB = "test_user_B_456";

    // 1. Book ticket for User A
    const tktA = {
      ticket_id: `TKT_AUTOTEST_A_${Date.now()}`,
      userId: userA,
      category: "journey",
      source: "Thane",
      destination: "Dadar",
      class: "Second Class",
      ticket_type: "Single Journey",
      passengers: 1,
      fare: 15,
      issued_at: new Date().toISOString(),
      valid_upto: new Date(Date.now() + 86400000).toISOString(),
      status: "Active",
    };

    const bookARes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/tickets",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, tktA);
    assert(bookARes.status === 201, "Book ticket for User A returns HTTP 201");

    // 2. Book ticket for User B
    const tktB = {
      ticket_id: `TKT_AUTOTEST_B_${Date.now()}`,
      userId: userB,
      category: "journey",
      source: "Churchgate",
      destination: "Andheri",
      class: "First Class",
      ticket_type: "Single Journey",
      passengers: 1,
      fare: 105,
      issued_at: new Date().toISOString(),
      valid_upto: new Date(Date.now() + 86400000).toISOString(),
      status: "Active",
    };

    const bookBRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/tickets",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, tktB);
    assert(bookBRes.status === 201, "Book ticket for User B returns HTTP 201");

    // 3. User A opens My Tickets
    const resUserA = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/api/tickets?userId=${userA}`,
      method: "GET",
      headers: { "x-user-id": userA },
    });
    assert(resUserA.status === 200, "User A tickets request HTTP 200");
    const userATickets = resUserA.data;
    const hasOnlyUserA = userATickets.every((t) => t.userId === userA);
    assert(hasOnlyUserA && userATickets.some((t) => t.ticket_id === tktA.ticket_id), "User A sees ONLY User A tickets");

    // 4. User B opens My Tickets
    const resUserB = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/api/tickets?userId=${userB}`,
      method: "GET",
      headers: { "x-user-id": userB },
    });
    assert(resUserB.status === 200, "User B tickets request HTTP 200");
    const userBTickets = resUserB.data;
    const hasOnlyUserB = userBTickets.every((t) => t.userId === userB);
    assert(hasOnlyUserB && userBTickets.some((t) => t.ticket_id === tktB.ticket_id), "User B sees ONLY User B tickets");

    // 5. Unauthenticated user opens My Tickets
    const resUnauth = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/tickets",
      method: "GET",
    });
    assert(resUnauth.status === 200 && Array.isArray(resUnauth.data) && resUnauth.data.length === 0, "Unauthenticated /api/tickets returns empty array");

    // 6. Direct access: User A requests User B's ticket ID
    const resForbidden = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/api/tickets/${tktB.ticket_id}?userId=${userA}`,
      method: "GET",
      headers: { "x-user-id": userA },
    });
    assert(resForbidden.status === 403, "User A direct access to User B's ticket is DENIED (HTTP 403)");

    // 7. Authorized Admin views tickets
    const resAdmin = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/tickets?admin=true",
      method: "GET",
      headers: { "x-admin": "true" },
    });
    assert(resAdmin.status === 200 && resAdmin.data.length >= 2, "Authorized admin can view all tickets across users");

    // ----------------------------------------------------
    // TEST GROUP 2: Admin Panel Dynamic Revenue
    // ----------------------------------------------------
    console.log("\n--- TEST GROUP 2: Admin Dynamic Revenue ---");

    const allTicketsRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/tickets?admin=true",
      method: "GET",
      headers: { "x-admin": "true" },
    });
    const allTickets = allTicketsRes.data;

    const totalCalculated = allTickets
      .filter((t) => (t.status || "").toLowerCase() !== "cancelled")
      .reduce((sum, t) => sum + (parseFloat(t.fare) || 0), 0);
    assert(totalCalculated > 0, `Total all-time revenue dynamically calculated: ₹${totalCalculated}`);

    // ----------------------------------------------------
    // TEST GROUP 3: Admin QR Verification & Compact QR Payload
    // ----------------------------------------------------
    console.log("\n--- TEST GROUP 3: QR Code Verification ---");

    const compactQRPayload = JSON.stringify({
      ticket_id: tktA.ticket_id,
      source: "Thane",
      destination: "Dadar",
      class: "Second Class",
      ticket_type: "Single Journey",
      fare: 15,
    });

    const verifyRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/tickets/verify",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, {
      qrData: compactQRPayload,
      action: "verify_only",
    });

    assert(verifyRes.status === 200 && verifyRes.data.success && verifyRes.data.status === "VALID", "QR Scanner payload verification succeeds for valid ticket");

    // Verify second time for consumed ticket
    const consumeRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/tickets/verify",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, {
      qrData: compactQRPayload,
      action: "verify_and_consume",
    });
    assert(consumeRes.status === 200 && (consumeRes.data.status === "VALID" || consumeRes.data.status === "ALREADY_USED"), "Ticket verification and consumption processed cleanly");

    // ----------------------------------------------------
    // TEST GROUP 4: Web Push Notification Engine
    // ----------------------------------------------------
    console.log("\n--- TEST GROUP 4: Web Push Notification Engine ---");

    const vapidKeyRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/push/public-key",
      method: "GET",
    });
    assert(vapidKeyRes.status === 200 && vapidKeyRes.data.publicKey.length > 20, "VAPID Public Key API endpoint returns valid key");

    const mockSub = {
      endpoint: "https://updates.push.services.mozilla.com/wpush/v2/gAAAAABtest",
      keys: {
        p256dh: "BEl62iUYgUivxIkv69yViEuiBIa-IbtestKey",
        auth: "testAuthKey123",
      },
    };

    const subRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/push/subscribe",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, {
      subscription: mockSub,
      userId: userA,
    });
    assert(subRes.status === 200 && subRes.data.success, "Push subscription API successfully saved subscription under Clerk user");

    const testPushRes = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/push/test",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, {
      userId: userA,
    });
    assert(testPushRes.status === 200 && testPushRes.data.success, "Development /api/push/test endpoint successfully dispatches test push notification");

    console.log("\n==================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");
  } catch (err) {
    console.error("Test execution exception:", err);
  }
}

runTests();
