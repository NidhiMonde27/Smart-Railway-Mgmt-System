const { normalizePhoneNumber } = require('../client/src/utils/phoneUtils');

async function testSMSAndClerkIntegration() {
  console.log("=== 1. TESTING PHONE NUMBER NORMALIZATION & VALIDATION ===");
  const testNumbers = [
    { input: "9876543210", expectedValid: true, expectedNormalized: "+919876543210" },
    { input: "+919876543210", expectedValid: true, expectedNormalized: "+919876543210" },
    { input: "09876543210", expectedValid: true, expectedNormalized: "+919876543210" },
    { input: "919876543210", expectedValid: true, expectedNormalized: "+919876543210" },
    { input: "12345", expectedValid: false },
    { input: "abc", expectedValid: false },
    { input: "", expectedValid: false }
  ];

  testNumbers.forEach(t => {
    const res = normalizePhoneNumber(t.input);
    const pass = res.isValid === t.expectedValid && (!t.expectedValid || res.normalized === t.expectedNormalized);
    console.log(`Input: "${t.input}" => Valid: ${res.isValid}, Normalized: "${res.normalized || ''}" [${pass ? 'PASS' : 'FAIL'}]`);
  });

  console.log("\n=== 2. TESTING BACKEND SMS ENDPOINT (/api/disruptions/send-sms) ===");
  try {
    // Test A: No mobile number stored / passed
    const resNoNum = await fetch("http://localhost:5000/api/disruptions/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "Thane", destination: "Dadar" }),
    });
    const dataNoNum = await resNoNum.json();
    console.log("Missing Mobile Number Response:", dataNoNum);
    console.log("Passes missing number check:", dataNoNum.code === "NO_MOBILE_NUMBER");

    // Test B: Invalid Mobile Number
    const resInvalid = await fetch("http://localhost:5000/api/disruptions/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "12345", source: "Thane", destination: "Dadar" }),
    });
    const dataInvalid = await resInvalid.json();
    console.log("Invalid Mobile Number Response:", dataInvalid);
    console.log("Passes invalid number check:", dataInvalid.code === "INVALID_MOBILE_NUMBER");

    // Test C: Valid Mobile Number with Non-Twilio Provider Check
    const resValid = await fetch("http://localhost:5000/api/disruptions/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "9876543210", source: "Thane", destination: "Dadar" }),
    });
    const dataValid = await resValid.json();
    console.log("Valid Mobile Number Request Response:", dataValid);

  } catch (err) {
    console.error("Backend endpoint test error:", err.message);
  }

  console.log("\n=== 3. TESTING EMAIL NOTIFICATION ENDPOINT (/api/disruptions/send-email) UNCHANGED ===");
  try {
    const resEmail = await fetch("http://localhost:5000/api/disruptions/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "fs21co009nidhi@gmail.com", source: "Thane", destination: "Dadar" }),
    });
    const dataEmail = await resEmail.json();
    console.log("Email Notification Endpoint Response:", dataEmail);
    console.log("Email endpoint active & working:", resEmail.ok);
  } catch (err) {
    console.error("Email endpoint test error:", err.message);
  }
}

testSMSAndClerkIntegration();
