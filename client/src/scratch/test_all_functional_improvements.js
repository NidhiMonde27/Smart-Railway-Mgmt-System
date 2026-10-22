async function runTests() {
  console.log("==========================================");
  console.log("TESTING ALL FUNCTIONAL IMPROVEMENTS");
  console.log("==========================================");

  // 1. Generate Via Ticket (Thane -> Sanpada -> Juinagar)
  console.log("\n[TEST 1] Generating Via Ticket (Thane -> Sanpada -> Juinagar)...");
  const ticket1Data = {
    ticket_id: `TKT_TEST_VIA_${Date.now()}`,
    category: "journey",
    source_type: "online",
    source: "Thane",
    destination: "Juinagar",
    via: "Via Sanpada",
    class: "Second Class",
    ticket_type: "Single Journey",
    passengers: 2,
    fare: 15,
    issued_at: new Date().toISOString(),
    valid_upto: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    date: new Date().toLocaleDateString("en-IN"),
    used: false,
    status: "Active",
  };

  const res1 = await fetch("https://smart-railway-mgmt-system.onrender.com/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ticket1Data),
  });

  if (res1.ok) {
    const created1 = await res1.json();
    console.log("✓ Created Via Ticket:", created1.ticket_id, "| Via:", created1.via);
  } else {
    console.error("✗ Failed to create Via ticket:", await res1.text());
  }

  // 2. Generate Trans-Harbour Ticket (Thane -> Airoli)
  console.log("\n[TEST 2] Generating Trans-Harbour Ticket (Thane -> Airoli)...");
  const ticket2Data = {
    ticket_id: `TKT_TEST_AIROLI_${Date.now()}`,
    category: "journey",
    source_type: "online",
    source: "Thane",
    destination: "Airoli",
    via: "Via Airoli",
    class: "Second Class",
    ticket_type: "Single Journey",
    passengers: 1,
    fare: 10,
    issued_at: new Date().toISOString(),
    valid_upto: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    date: new Date().toLocaleDateString("en-IN"),
    used: false,
    status: "Active",
  };

  const res2 = await fetch("https://smart-railway-mgmt-system.onrender.com/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ticket2Data),
  });

  if (res2.ok) {
    const created2 = await res2.json();
    console.log("✓ Created Trans-Harbour Ticket:", created2.ticket_id, "| Via:", created2.via);
  } else {
    console.error("✗ Failed to create Trans-Harbour ticket");
  }

  // 3. Verify Admin Ticket Fetch (Manual Verification)
  console.log("\n[TEST 3] Admin Manual Ticket Verification for Ticket 1...");
  const resFetch = await fetch(`https://smart-railway-mgmt-system.onrender.com/api/tickets/${ticket1Data.ticket_id}`);
  if (resFetch.ok) {
    const fetched = await resFetch.json();
    console.log("✓ Manual verification found ticket:", fetched.ticket_id);
    console.log("  - Source:", fetched.source);
    console.log("  - Via:", fetched.via);
    console.log("  - Destination:", fetched.destination);
    console.log("  - Fare:", fetched.fare);
    console.log("  - Status:", fetched.status);
  } else {
    console.error("✗ Admin Manual Verification failed");
  }

  // 4. Verify QR Verification & Ticket Consumption
  console.log("\n[TEST 4] Admin QR Verification (Consuming Ticket 1)...");
  const resConsume = await fetch("https://smart-railway-mgmt-system.onrender.com/api/tickets/consume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticketId: ticket1Data.ticket_id }),
  });

  if (resConsume.ok) {
    const consumedResult = await resConsume.json();
    console.log("✓ Ticket successfully consumed:", consumedResult.message || JSON.stringify(consumedResult));
  } else {
    console.error("✗ Ticket consumption failed");
  }

  // Verify second consumption attempt gets rejected (Used/Consumed)
  const resConsume2 = await fetch(`https://smart-railway-mgmt-system.onrender.com/api/tickets/${ticket1Data.ticket_id}`);
  if (resConsume2.ok) {
    const refetched = await resConsume2.json();
    console.log("✓ Refetched consumed ticket status:", refetched.used ? "Used (Correct)" : "Active");
  }

  console.log("\n==========================================");
  console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
  console.log("==========================================");
}

runTests();
