async function runTests() {
  console.log("=== 1. TESTING VAPID PUBLIC KEY ENDPOINT (/api/push/public-key) ===");
  try {
    const resKey = await fetch("http://localhost:5000/api/push/public-key");
    const dataKey = await resKey.json();
    console.log("VAPID Public Key Response:", dataKey);
    console.log("VAPID Public Key Present:", !!dataKey.publicKey);
  } catch (err) {
    console.error("VAPID Public Key Test Error:", err.message);
  }

  console.log("\n=== 2. TESTING PUSH SUBSCRIPTION ENDPOINT (/api/push/subscribe) ===");
  try {
    const testSub = {
      endpoint: "https://fcm.googleapis.com/fcm/send/test-mock-endpoint-" + Date.now(),
      keys: {
        p256dh: "BMFGP097lAyVrAEV6FeeAUNWHk4WcrGcE5LizEFCvAe6Q7rJjpgnjclbwZlTg04bIHS_HivLS6kU5PBUNKHm-wM",
        auth: "Pp_eUcgsy-Gk2i8b2p-b0Qq4FvJqSxtA9G2kKe1ANSY"
      }
    };

    const resSub = await fetch("http://localhost:5000/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: testSub, userId: "user_test_clerk_123" })
    });
    const dataSub = await resSub.json();
    console.log("Push Subscribe Response:", dataSub);
    console.log("Subscribe Success:", dataSub.success);
  } catch (err) {
    console.error("Push Subscribe Test Error:", err.message);
  }

  console.log("\n=== 3. TESTING PUSH ALERT DISPATCH ENDPOINT (/api/push/send) ===");
  try {
    const resSend = await fetch("http://localhost:5000/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "[TEST/MOCK EVENT] Central Line Signal Disruption (Thane - Dadar)",
        message: "Signal maintenance in progress near Kurla.",
        url: "/map"
      })
    });
    const dataSend = await resSend.json();
    console.log("Push Dispatch Response:", dataSend);
    console.log("Push Dispatch Success:", dataSend.success);
  } catch (err) {
    console.error("Push Dispatch Test Error:", err.message);
  }
}

runTests();
