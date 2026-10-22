const express = require("express");
const router = express.Router();
const {
  getActiveDisruptions,
  createOrUpdateDisruption,
  clearDisruption,
  checkJourneyDisruption,
  handleTwilioStatusCallback,
  getSMSLogs,
  sendSMSNotification,
  sendAccountEmailNotification,
  getEmailLogs,
  addPushSubscription,
  sendWebPushAlert,
  getPushSubscriptions,
} = require("../services/disruptionService");

// GET /api/push/public-key - Return VAPID Public Key for Web Push subscription
router.get("/push/public-key", (req, res) => {
  res.json({
    success: true,
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
  });
});

// POST /api/push/subscribe - Register browser push subscription for authenticated user
router.post("/push/subscribe", (req, res) => {
  try {
    const { subscription, userId = "" } = req.body;
    const result = addPushSubscription(subscription, userId);
    res.json(result);
  } catch (err) {
    console.error("Error in /api/push/subscribe:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/push/send - Dispatch Web Push notification
router.post("/push/send", async (req, res) => {
  try {
    const { title, message, url, userId } = req.body;
    const result = await sendWebPushAlert({ title, message, url, userId });
    res.json(result);
  } catch (err) {
    console.error("Error in /api/push/send:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/push/test - Dispatch actual Web Push test notification
router.post("/push/test", async (req, res) => {
  try {
    const { userId = "" } = req.body;
    const result = await sendWebPushAlert({
      title: "APLI-MUMBAI Test Notification",
      message: "Your railway alert notifications are working successfully.",
      url: "/dashboard",
      userId,
    });
    res.json(result);
  } catch (err) {
    console.error("Error in /api/push/test:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/disruptions - Fetch all active disruptions
router.get("/disruptions", (req, res) => {
  res.json({
    success: true,
    disruptions: getActiveDisruptions(),
  });
});

// POST /api/disruptions/check - Check if a specific journey (Source -> Destination) is affected
router.post("/disruptions/check", async (req, res) => {
  try {
    const { source = "Thane", destination = "Dadar", phone = "", optIn = true } = req.body;
    const result = await checkJourneyDisruption({ source, destination, phone, optIn });
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("Error in /api/disruptions/check:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/disruptions/send-email - Dispatch Email Notification to Logged-in User's Profile Email
router.post("/disruptions/send-email", async (req, res) => {
  try {
    const { email, source = "Thane", destination = "Dadar", userId = "" } = req.body;
    const result = await sendAccountEmailNotification({ email, source, destination, userId });
    res.json(result);
  } catch (err) {
    console.error("Error in /api/disruptions/send-email:", err);
    res.status(500).json({ success: false, error: "Unable to send email alert. Please try again." });
  }
});

// POST /api/disruptions/send-sms - Dispatch SMS Notification to Logged-in User's Saved Mobile Number
router.post("/disruptions/send-sms", async (req, res) => {
  try {
    const { to, source = "Thane", destination = "Dadar", userId = "" } = req.body;
    const result = await sendSMSNotification({ to, source, destination, userId });
    res.json(result);
  } catch (err) {
    console.error("Error in /api/disruptions/send-sms:", err);
    res.status(500).json({ success: false, error: "Unable to send SMS alert. Please try again." });
  }
});

// GET /api/disruptions/email-logs - Fetch delivery tracking log for Email notifications
router.get("/disruptions/email-logs", (req, res) => {
  res.json({
    success: true,
    logs: getEmailLogs(),
  });
});

// POST /api/disruptions/sms-status - Twilio status callback webhook
router.post("/disruptions/sms-status", (req, res) => {
  try {
    handleTwilioStatusCallback(req.body);
    res.type("text/xml").send("<Response></Response>");
  } catch (err) {
    console.error("Error handling Twilio status callback:", err);
    res.status(500).send("Callback processing failed");
  }
});

// GET /api/disruptions/sms-logs - Fetch delivery tracking log for SMS notifications
router.get("/disruptions/sms-logs", (req, res) => {
  res.json({
    success: true,
    logs: getSMSLogs(),
  });
});

// POST /api/admin/disruptions - Create or update disruption
router.post("/admin/disruptions", (req, res) => {
  try {
    const disruption = req.body;
    const updatedList = createOrUpdateDisruption(disruption);
    res.json({
      success: true,
      message: "Disruption updated successfully",
      disruptions: updatedList,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/disruptions/:id - Remove a resolved disruption
router.delete("/admin/disruptions/:id", (req, res) => {
  try {
    const updatedList = clearDisruption(req.params.id);
    res.json({
      success: true,
      message: "Disruption resolved and removed",
      disruptions: updatedList,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
