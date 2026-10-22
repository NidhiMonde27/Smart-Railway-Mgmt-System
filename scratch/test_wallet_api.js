// Native fetch test script

async function testWalletAPI() {
  console.log("==========================================");
  console.log("TESTING USER-AUTHENTICATED WALLET API");
  console.log("==========================================\n");

  const baseUrl = "http://localhost:5000/api/wallet";

  // 1. Fetch initial wallet for user_alice
  console.log("Test 1: Fetch initial wallet for user_alice");
  let res = await fetch(`${baseUrl}/user_alice`);
  let data = await res.json();
  console.log("Result:", data);
  console.assert(data.balance === 500, "Initial balance should be 500");

  // 2. Add ₹250 to user_alice
  console.log("\nTest 2: Add ₹250 to user_alice");
  res = await fetch(`${baseUrl}/add-money`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "user_alice", amount: 250 }),
  });
  data = await res.json();
  console.log("Result:", data);
  console.assert(data.balance === 750, "Balance should be 750 after adding 250");

  // 3. User isolation check: Fetch user_bob
  console.log("\nTest 3: Fetch wallet for user_bob (User Isolation)");
  res = await fetch(`${baseUrl}/user_bob`);
  data = await res.json();
  console.log("Result:", data);
  console.assert(data.balance === 500, "user_bob should have independent balance of 500");

  // 4. Test invalid negative amount
  console.log("\nTest 4: Test negative amount protection");
  res = await fetch(`${baseUrl}/add-money`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "user_alice", amount: -100 }),
  });
  data = await res.json();
  console.log("Result (Should fail):", data);
  console.assert(res.status === 400, "Should return 400 for negative amount");

  // 5. Test zero amount
  console.log("\nTest 5: Test zero amount protection");
  res = await fetch(`${baseUrl}/add-money`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "user_alice", amount: 0 }),
  });
  data = await res.json();
  console.log("Result (Should fail):", data);
  console.assert(res.status === 400, "Should return 400 for zero amount");

  // 6. Deduct ₹150 from user_alice
  console.log("\nTest 6: Deduct ₹150 fare from user_alice");
  res = await fetch(`${baseUrl}/deduct-money`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "user_alice", amount: 150 }),
  });
  data = await res.json();
  console.log("Result:", data);
  console.assert(data.balance === 600, "Balance should be 600 after deducting 150");

  console.log("\n==========================================");
  console.log("ALL WALLET TESTS COMPLETED SUCCESSFULLY");
  console.log("==========================================");
}

testWalletAPI().catch(console.error);
