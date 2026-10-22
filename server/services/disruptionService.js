const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const { createClerkClient } = require("@clerk/backend");

dotenv.config();

// Initialize Clerk Backend SDK if CLERK_SECRET_KEY is configured
let clerkClient = null;
if (process.env.CLERK_SECRET_KEY) {
  try {
    clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY,
    });
    console.log("[Clerk Backend] Client initialized with CLERK_SECRET_KEY.");
  } catch (err) {
    console.error("[Clerk Backend] Initialization error:", err.message);
  }
} else {
  console.warn("[Clerk Backend Notice] CLERK_SECRET_KEY is not set in server/.env.");
}

/**
 * Fetch authenticated Clerk user profile directly from Clerk Backend API
 */
async function resolveClerkUser(userId) {
  if (!userId || !clerkClient) return null;
  try {
    const user = await clerkClient.users.getUser(userId);
    return user;
  } catch (err) {
    console.error(`[Clerk Backend Error] Failed to fetch user ${userId}:`, err.message);
    return null;
  }
}

const webPush = require("web-push");
const fs = require("fs");
const path = require("path");

// Configure web-push with VAPID keys from server/.env
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:fs21co009nidhi@gmail.com";

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    console.log("[Web Push] VAPID keys configured successfully.");
  } catch (err) {
    console.error("[Web Push Error] Failed to set VAPID details:", err.message);
  }
}

// Push Subscriptions Persistence File
const PUSH_SUBS_FILE = path.join(__dirname, "../push_subscriptions.json");

function loadPushSubscriptions() {
  if (fs.existsSync(PUSH_SUBS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PUSH_SUBS_FILE, "utf-8")) || [];
    } catch (e) {
      return [];
    }
  }
  return [];
}

function savePushSubscriptions(subs) {
  try {
    fs.writeFileSync(PUSH_SUBS_FILE, JSON.stringify(subs, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving push_subscriptions.json:", e.message);
  }
}

let pushSubscriptions = loadPushSubscriptions();

// Active Disruption Data Store (starts empty under normal operational conditions)
let activeDisruptions = [];

// Sent SMS & Email log & deduplication registry
const sentSMSMap = new Map();
const smsLogs = [];
const sentEmailMap = new Map();
const emailLogs = [];

/**
 * Helper to normalize station names for matching
 */
function normalizeStation(name) {
  if (!name) return "";
  let s = name.trim().toLowerCase();
  s = s
    .replace(/ metro/g, "")
    .replace(/ junction/g, "")
    .replace(/ m3/g, "")
    .replace(/ road/g, "")
    .replace(/ station/g, "");
  if (s === "seawood") return "seawoods-darave";
  if (s === "diva") return "diva junction";
  if (s === "cstm" || s === "csmt") return "csmt";
  return s;
}

/**
 * Check whether disruption affects the user's journey (User Source -> User Destination)
 */
function checkDisruptionAffectsJourney(disruption, source, destination) {
  if (!disruption || !source || !destination) return false;

  const sNorm = normalizeStation(source);
  const dNorm = normalizeStation(destination);

  if (disruption.affectedStations && Array.isArray(disruption.affectedStations)) {
    const matchedStn = disruption.affectedStations.some((stn) => {
      const norm = normalizeStation(stn);
      return norm === sNorm || norm === dNorm;
    });
    if (matchedStn) return true;
  }

  if (disruption.affectedSegment && Array.isArray(disruption.affectedSegment)) {
    const segNorms = disruption.affectedSegment.map(normalizeStation);
    const containsSource = segNorms.includes(sNorm);
    const containsDest = segNorms.includes(dNorm);

    if (containsSource || containsDest) return true;
  }

  if (disruption.line) {
    const lineUpper = disruption.line.toUpperCase();
    const centralStations = ["csmt", "masjid", "sandhurst", "byculla", "chinchpokli", "currey", "parel", "dadar", "matunga", "sion", "kurla", "vidyavihar", "ghatkopar", "vikhroli", "kanjurmarg", "bhandup", "nahur", "mulund", "thane", "kalwa", "mumbra", "diva", "kopar", "dombivli", "thakurli", "kalyan", "kasara", "khopoli", "ambernath", "badlapur", "karjat"];
    const westernStations = ["churchgate", "marine", "charni", "grant", "mumbai central", "mahalaxmi", "lower parel", "prabhadevi", "dadar", "matunga", "mahim", "bandra", "khar", "santacruz", "vile parle", "andheri", "jogeshwari", "ram mandir", "goregaon", "malad", "kandivali", "borivali", "dahisar", "mira", "bhayandar", "naigaon", "vasai", "nallasopara", "virar", "dahanu"];

    if (lineUpper.includes("CENTRAL") && centralStations.includes(sNorm) && centralStations.includes(dNorm)) return true;
    if (lineUpper.includes("WESTERN") && westernStations.includes(sNorm) && westernStations.includes(dNorm)) return true;
  }

  return false;
}

/**
 * Calculate ranked alternative routes excluding affected line/station
 */
function calculateAlternativeRoutes(source, destination, affectedDisruption) {
  if (!source || !destination || source === destination) return [];

  const sNorm = normalizeStation(source);
  const dNorm = normalizeStation(destination);
  const affectedLine = affectedDisruption ? (affectedDisruption.line || "").toLowerCase() : "";

  const alternatives = [];

  if ((sNorm === "thane" && dNorm === "dadar") || (sNorm === "dadar" && dNorm === "thane")) {
    if (affectedLine.includes("central") || affectedDisruption?.affectedStations?.includes("Kurla")) {
      alternatives.push({
        id: "alt_th_harbour_dadar",
        via: "Via Trans-Harbour ➔ Kurla/Wadala ➔ Dadar",
        label: "Alternative 1: Trans-Harbour Connection",
        isRecommended: true,
        rank: 1,
        estimatedTimeMins: 42,
        additionalTimeMins: 12,
        interchanges: 1,
        lines: ["Trans-Harbour", "Harbour"],
        path: [source, "Sanpada / Wadala", destination],
        description: "Bypass Central Line disruption using Trans-Harbour Corridor via Sanpada & Wadala Interchange to Dadar.",
        mode: "Railway",
        crowdExposure: "Low",
      });
    }
  }

  if (alternatives.length === 0) {
    alternatives.push({
      id: "alt_generic_interchange",
      via: `Via Sanpada / Wadala Road Interchange to ${destination}`,
      label: `Alternative Route: Connected Bypass Route`,
      isRecommended: true,
      rank: 1,
      estimatedTimeMins: 45,
      additionalTimeMins: 15,
      interchanges: 1,
      lines: ["Trans-Harbour", "Harbour"],
      path: [source, "Sanpada / Wadala", destination],
      description: `Automated alternative journey from ${source} to ${destination} avoiding the disrupted segment.`,
      mode: "Railway / Metro",
      crowdExposure: "Low",
    });
  }

  return alternatives.sort((a, b) => a.rank - b.rank || a.estimatedTimeMins - b.estimatedTimeMins);
}

/**
 * Handle SMS Alert request
 * Resolves user mobile number from Clerk backend and dispatches using non-Twilio SMS provider
 */
async function sendSMSNotification({ to, source = "Thane", destination = "Dadar", userId = "" }) {
  let recipientPhone = "";

  // 1. Resolve mobile number directly from Clerk Backend API for authenticated user
  if (userId && clerkClient) {
    const clerkUser = await resolveClerkUser(userId);
    if (clerkUser) {
      recipientPhone =
        clerkUser.unsafeMetadata?.mobileNumber ||
        clerkUser.unsafeMetadata?.phoneNumber ||
        clerkUser.primaryPhoneNumber?.phoneNumber ||
        clerkUser.phoneNumbers?.[0]?.phoneNumber ||
        "";
    }
  }

  // Fallback to provided `to` parameter if present
  if (!recipientPhone && to) {
    recipientPhone = to.trim();
  }

  // 2. Return required error if no mobile number is saved in user profile
  if (!recipientPhone) {
    return {
      success: false,
      code: "NO_MOBILE_NUMBER",
      error: "Please add your mobile number in Manage Profile to receive SMS alerts.",
    };
  }

  // 3. E.164 normalization & Indian mobile validation
  let cleaned = recipientPhone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }

  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (!indianMobileRegex.test(cleaned)) {
    return {
      success: false,
      code: "INVALID_MOBILE_NUMBER",
      error: "Please enter a valid 10-digit Indian mobile number in Manage Profile.",
    };
  }

  const normalizedPhone = `+91${cleaned}`;
  const activeDisruption = activeDisruptions.find((d) => checkDisruptionAffectsJourney(d, source, destination));
  const disruptionId = activeDisruption ? activeDisruption.disruptionId : `ALERT_${Date.now()}`;

  // 4. Rate-limiting & Deduplication check (prevent spam within 10 seconds for same recipient)
  const dedupeKey = `${normalizedPhone}_${disruptionId}`;
  const lastSentTime = sentSMSMap.get(dedupeKey);
  if (lastSentTime && Date.now() - lastSentTime < 10000) {
    return {
      success: false,
      code: "DUPLICATE_REQUEST",
      error: "SMS alert was recently requested. Please wait a few seconds before trying again.",
    };
  }

  const message = activeDisruption
    ? `APLI-MUMBAI Railway Alert: ${activeDisruption.message} Check APLI-MUMBAI Live Map for alternate route.`
    : `APLI-MUMBAI Update: All services operating normally between ${source} and ${destination}.`;

  const logEntry = {
    id: `SMS_${Date.now()}`,
    to: normalizedPhone,
    source,
    destination,
    disruptionId,
    message,
    status: "failed",
    timestamp: new Date().toISOString(),
  };

  // 5. Non-Twilio SMS Provider Integration (MSG91 / Fast2SMS / Generic REST API)
  const msg91AuthKey = process.env.MSG91_AUTH_KEY;
  const fast2smsKey = process.env.FAST2SMS_API_KEY;
  const genericSmsKey = process.env.SMS_API_KEY;
  const genericSmsUrl = process.env.SMS_GATEWAY_URL;

  // Case A: MSG91 API
  if (msg91AuthKey && !msg91AuthKey.includes("your_")) {
    try {
      const msg91Res = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: msg91AuthKey,
        },
        body: JSON.stringify({
          template_id: process.env.MSG91_TEMPLATE_ID || "default_alert",
          short_url: "1",
          recipients: [{ mobiles: normalizedPhone.replace("+", ""), message }],
        }),
      });

      const resData = await msg91Res.json().catch(() => ({}));
      if (msg91Res.ok && (resData.type === "success" || resData.status === "success")) {
        logEntry.status = "submitted";
        logEntry.provider = "MSG91";
        smsLogs.unshift(logEntry);
        sentSMSMap.set(dedupeKey, Date.now());
        console.log(`[MSG91 SMS Submitted] Sent to ${normalizedPhone}`);
        return { success: true, code: "SMS_SENT", message: "SMS Alert accepted by MSG91 gateway.", log: logEntry };
      } else {
        logEntry.error = resData.message || "MSG91 API rejected request";
        smsLogs.unshift(logEntry);
        return { success: false, code: "SMS_PROVIDER_ERROR", error: `MSG91 SMS Gateway Error: ${logEntry.error}` };
      }
    } catch (err) {
      console.error("[MSG91 SMS Error]", err.message);
      logEntry.error = err.message;
      smsLogs.unshift(logEntry);
      return { success: false, code: "SMS_PROVIDER_ERROR", error: `MSG91 dispatch error: ${err.message}` };
    }
  }

  // Case B: Fast2SMS API
  if (fast2smsKey && !fast2smsKey.includes("your_")) {
    try {
      const fastRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: fast2smsKey,
        },
        body: JSON.stringify({
          route: "q",
          message,
          language: "english",
          flash: 0,
          numbers: cleaned,
        }),
      });

      const resData = await fastRes.json().catch(() => ({}));
      if (fastRes.ok && resData.return === true) {
        logEntry.status = "submitted";
        logEntry.provider = "Fast2SMS";
        smsLogs.unshift(logEntry);
        sentSMSMap.set(dedupeKey, Date.now());
        console.log(`[Fast2SMS Submitted] Sent to ${normalizedPhone}`);
        return { success: true, code: "SMS_SENT", message: "SMS Alert accepted by Fast2SMS gateway.", log: logEntry };
      } else {
        logEntry.error = resData.message || "Fast2SMS rejected request";
        smsLogs.unshift(logEntry);
        return { success: false, code: "SMS_PROVIDER_ERROR", error: `Fast2SMS Gateway Error: ${logEntry.error}` };
      }
    } catch (err) {
      console.error("[Fast2SMS Error]", err.message);
      logEntry.error = err.message;
      smsLogs.unshift(logEntry);
      return { success: false, code: "SMS_PROVIDER_ERROR", error: `Fast2SMS dispatch error: ${err.message}` };
    }
  }

  // Case C: Generic REST SMS Gateway API
  if (genericSmsUrl && genericSmsKey) {
    try {
      const genRes = await fetch(genericSmsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${genericSmsKey}`,
        },
        body: JSON.stringify({ to: normalizedPhone, message }),
      });

      const resData = await genRes.json().catch(() => ({}));
      if (genRes.ok) {
        logEntry.status = "submitted";
        logEntry.provider = "GenericSMS";
        smsLogs.unshift(logEntry);
        sentSMSMap.set(dedupeKey, Date.now());
        return { success: true, code: "SMS_SENT", message: "SMS Alert submitted to gateway.", log: logEntry };
      } else {
        logEntry.error = resData.message || "Generic SMS gateway error";
        smsLogs.unshift(logEntry);
        return { success: false, code: "SMS_PROVIDER_ERROR", error: `SMS Gateway Error: ${logEntry.error}` };
      }
    } catch (err) {
      logEntry.error = err.message;
      smsLogs.unshift(logEntry);
      return { success: false, code: "SMS_PROVIDER_ERROR", error: `SMS Gateway dispatch error: ${err.message}` };
    }
  }

  // If no non-Twilio SMS provider is configured in server/.env
  console.warn(`[SMS Service Notice] Phone number (${normalizedPhone}) retrieved from Clerk, but no non-Twilio SMS provider credentials (MSG91_AUTH_KEY, FAST2SMS_API_KEY, SMS_API_KEY) are configured in server/.env.`);
  logEntry.error = "No non-Twilio SMS provider configured in server/.env.";
  smsLogs.unshift(logEntry);

  return {
    success: false,
    code: "NO_SMS_PROVIDER",
    error: "SMS service is not configured. Please add non-Twilio SMS provider credentials (e.g., MSG91_AUTH_KEY or FAST2SMS_API_KEY) in server/.env.",
  };
}

/**
 * Handle status callback webhook if present
 */
function handleTwilioStatusCallback(body) {
  return { received: true };
}

/**
 * Send Email Notification to Authenticated User's Profile Email
 */
async function sendAccountEmailNotification({ email, source = "Thane", destination = "Dadar", userId = "" }) {
  let recipientEmail = email ? email.trim() : "";

  if (!recipientEmail && userId && clerkClient) {
    const clerkUser = await resolveClerkUser(userId);
    if (clerkUser) {
      const primaryEmailObj = clerkUser.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId);
      const clerkEmail = primaryEmailObj ? primaryEmailObj.emailAddress : clerkUser.emailAddresses?.[0]?.emailAddress;
      if (clerkEmail) recipientEmail = clerkEmail.trim();
    }
  }

  if (!recipientEmail) {
    console.error("[Email Service Error] No registered profile email address provided or found.");
    return { success: false, error: "No registered email address found for your account." };
  }

  const sNorm = normalizeStation(source);
  const dNorm = normalizeStation(destination);

  const activeDisruption = activeDisruptions.find((d) => checkDisruptionAffectsJourney(d, source, destination));
  const disruptionId = activeDisruption ? activeDisruption.disruptionId : "NO_DISRUPTION";
  const dedupeKey = `${recipientEmail}_${sNorm}_${dNorm}_${disruptionId}`;

  const alternatives = calculateAlternativeRoutes(source, destination, activeDisruption);

  const subject = activeDisruption
    ? `APLI-MUMBAI Railway Alert - ${activeDisruption.title}`
    : `APLI-MUMBAI Railway Update - ${source} to ${destination}`;

  const messageText = activeDisruption
    ? `${activeDisruption.message}\n\nAn alternative route is available in Live Map.\n\nPlease check APLI-MUMBAI for the latest available information.`
    : `Service Status Update for ${source} to ${destination}: All train services are operating normally.`;

  const logEntry = {
    id: `EMAIL_${Date.now()}`,
    dedupeKey,
    to: recipientEmail,
    userId,
    source,
    destination,
    disruptionId,
    subject,
    status: "queued",
    timestamp: new Date().toISOString(),
  };

  // Check if SMTP credentials exist in server/.env
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(`[Email Service Notice] SMTP_USER/SMTP_PASS not configured in server/.env. Real email delivery to ${recipientEmail} requires SMTP configuration.`);
    logEntry.status = "failed";
    logEntry.error = "SMTP credentials missing in server/.env";
    emailLogs.unshift(logEntry);

    return {
      success: false,
      error: "Unable to send email alert. SMTP credentials (SMTP_USER & SMTP_PASS) are not configured in server/.env.",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, "") : "",
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"APLI-MUMBAI Alerts" <${process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject,
      text: messageText,
    };

    const info = await transporter.sendMail(mailOptions);

    logEntry.status = "delivered";
    logEntry.messageId = info.messageId;

    console.log(`[Email Delivered to Real Inbox] Sent to ${recipientEmail}, Message ID: ${info.messageId}`);
    sentEmailMap.set(dedupeKey, logEntry);
    emailLogs.unshift(logEntry);

    return { success: true, messageId: info.messageId, log: logEntry };
  } catch (err) {
    console.error("[Email Provider Error]", err.message);
    logEntry.status = "failed";
    logEntry.error = err.message;
    emailLogs.unshift(logEntry);
    return { success: false, error: "Unable to send email alert. Please try again." };
  }
}

function addPushSubscription(subscription, userId = "") {
  if (!subscription || !subscription.endpoint) return { success: false, error: "Invalid subscription object" };

  const existingIdx = pushSubscriptions.findIndex((s) => s.endpoint === subscription.endpoint);
  const entry = {
    endpoint: subscription.endpoint,
    subscription,
    userId,
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx !== -1) {
    pushSubscriptions[existingIdx] = entry;
  } else {
    pushSubscriptions.push(entry);
  }
  savePushSubscriptions(pushSubscriptions);
  return { success: true, message: "Push subscription saved successfully." };
}

async function sendWebPushAlert({ title, message, url = "/dashboard", userId = "" }) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    return { success: false, error: "VAPID keys not configured on backend server." };
  }

  // Strip [TEST/MOCK EVENT] prefix for clean notification title display
  const cleanTitle = (title || "APLI-MUMBAI Railway Alert").replace(/^\[TEST\/MOCK EVENT\]\s*/i, "").trim();

  const payload = JSON.stringify({
    title: cleanTitle,
    body: message || "Railway disruption alert update.",
    url: url || "/dashboard",
    timestamp: Date.now(),
  });

  const activeSubs = pushSubscriptions.filter((s) => !userId || s.userId === userId || s.userId === "");
  let sentCount = 0;
  let failedCount = 0;

  const validSubs = [];

  for (const item of activeSubs) {
    try {
      await webPush.sendNotification(item.subscription, payload);
      sentCount++;
      validSubs.push(item);
    } catch (err) {
      console.warn(`[Web Push Dispatch Error] Endpoint ${item.endpoint.substring(0, 30)}...: ${err.message}`);
      if (err.statusCode === 404 || err.statusCode === 410) {
        console.log(`[Web Push Prune] Removing expired subscription endpoint: ${item.endpoint.substring(0, 30)}...`);
      } else {
        validSubs.push(item);
      }
      failedCount++;
    }
  }

  if (validSubs.length !== pushSubscriptions.length) {
    pushSubscriptions = validSubs;
    savePushSubscriptions(pushSubscriptions);
  }

  return {
    success: true,
    sentCount,
    failedCount,
    totalSubscribers: pushSubscriptions.length,
    message: `Web Push dispatch complete. Sent: ${sentCount}, Failed/Pruned: ${failedCount}`,
  };
}

function getActiveDisruptions() {
  return activeDisruptions;
}

function createOrUpdateDisruption(data) {
  const existingIndex = activeDisruptions.findIndex((d) => d.disruptionId === data.disruptionId);
  if (existingIndex !== -1) {
    activeDisruptions[existingIndex] = { ...activeDisruptions[existingIndex], ...data, timestamp: new Date().toISOString() };
  } else {
    activeDisruptions.unshift({
      disruptionId: data.disruptionId || `DISRUPT_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }

  // Automatically trigger Web Push Notification for subscribed devices
  const dis = activeDisruptions[0];
  if (dis) {
    sendWebPushAlert({
      title: dis.title || "APLI-MUMBAI Railway Alert",
      message: dis.message || "Railway service disruption reported.",
      url: "/map",
    }).catch((err) => console.error("Auto push dispatch error:", err.message));
  }

  return activeDisruptions;
}

function clearDisruption(disruptionId) {
  activeDisruptions = activeDisruptions.filter((d) => d.disruptionId !== disruptionId);
  return activeDisruptions;
}

async function checkJourneyDisruption({ source, destination, phone, optIn = true }) {
  if (!source || !destination) {
    return { isAffected: false, activeDisruptions, alternativeRoutes: [] };
  }

  const matchingDisruptions = activeDisruptions.filter((d) => checkDisruptionAffectsJourney(d, source, destination));

  if (matchingDisruptions.length === 0) {
    return {
      isAffected: false,
      source,
      destination,
      activeDisruptions,
      affectedDisruption: null,
      alternativeRoutes: [],
    };
  }

  const primaryDisruption = matchingDisruptions[0];
  const alternativeRoutes = calculateAlternativeRoutes(source, destination, primaryDisruption);

  return {
    isAffected: true,
    source,
    destination,
    affectedDisruption: primaryDisruption,
    allMatchingDisruptions: matchingDisruptions,
    alternativeRoutes,
  };
}

module.exports = {
  getActiveDisruptions,
  createOrUpdateDisruption,
  clearDisruption,
  checkDisruptionAffectsJourney,
  calculateAlternativeRoutes,
  checkJourneyDisruption,
  sendSMSNotification,
  handleTwilioStatusCallback,
  sendAccountEmailNotification,
  addPushSubscription,
  sendWebPushAlert,
  getPushSubscriptions: () => pushSubscriptions,
  getSMSLogs: () => smsLogs,
  getEmailLogs: () => emailLogs,
};
