async function runTests() {
  console.log("--- TEST 1: QR Payload JSON Parsing ---");
  const sampleTicket = {
    ticket_id: "TKT_TEST_123456",
    source: "Churchgate",
    destination: "Andheri",
    via: "Direct",
    train_id: "90033",
    train_name: "Fast Local",
    departure_time: "10:30 AM",
    class: "First Class",
    ticket_type: "Single Journey",
    passengers: 1,
    fare: 105,
    issued_at: new Date().toISOString(),
    valid_upto: new Date(Date.now() + 86400000).toISOString(),
    date: new Date().toLocaleDateString("en-IN"),
    isDirect: true,
    interchanges: [],
    transfers: [],
    segments: []
  };

  const payloadString = JSON.stringify(sampleTicket);
  console.log("Encoded QR string:", payloadString);

  const parsed = JSON.parse(payloadString);
  console.log("Decoded Ticket ID:", parsed.ticket_id);
  console.log("Matches original:", parsed.ticket_id === sampleTicket.ticket_id);

  console.log("\n--- TEST 2: Verification Endpoint Compatibility ---");
  try {
    const res = await fetch("http://localhost:5000/api/tickets/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: parsed.ticket_id,
        qrData: payloadString,
        action: "verify_and_consume"
      })
    });
    const result = await res.json();
    console.log("Verification HTTP status:", res.status);
    console.log("Verification Response:", result);
  } catch (e) {
    console.error("Server test failed (is server running?):", e.message);
  }
}

runTests();
