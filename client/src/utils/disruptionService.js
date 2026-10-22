/**
 * Centralized Client-Side Disruption & Notification Service Layer
 * Coordinates real disruption detection and notification API dispatches
 */

const API_BASE_URL = "https://smart-railway-mgmt-system.onrender.com/api";

// Fallback configured disruption data in case backend is offline (starts empty under normal conditions)
const DEFAULT_DISRUPTIONS = [];

/**
 * Fetch active disruptions from backend server
 */
export async function fetchActiveDisruptions() {
  try {
    const res = await fetch(`${API_BASE_URL}/disruptions`);
    if (res.ok) {
      const data = await res.json();
      return data.disruptions || DEFAULT_DISRUPTIONS;
    }
  } catch (err) {
    console.warn("Backend disruptions fetch failed, using configured service data fallback:", err.message);
  }
  return DEFAULT_DISRUPTIONS;
}

/**
 * Check if the selected Source -> Destination journey is affected by an active disruption
 */
export async function checkJourneyDisruption(source, destination) {
  if (!source || !destination || source.trim() === destination.trim()) {
    return { isAffected: false, alternativeRoutes: [], affectedDisruption: null };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/disruptions/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, destination }),
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn("Disruption check endpoint error, performing client evaluation fallback:", err.message);
  }

  // Client-side fallback check if server request fails
  const disruptions = DEFAULT_DISRUPTIONS;
  const sLower = source.toLowerCase();
  const dLower = destination.toLowerCase();

  const matching = disruptions.find((d) => {
    if (d.affectedStations && d.affectedStations.some((stn) => stn.toLowerCase() === sLower || stn.toLowerCase() === dLower)) {
      return true;
    }
    if (d.affectedSegment && d.affectedSegment.some((stn) => stn.toLowerCase() === sLower || stn.toLowerCase() === dLower)) {
      return true;
    }
    return false;
  });

  if (matching) {
    return {
      isAffected: true,
      source,
      destination,
      affectedDisruption: matching,
      alternativeRoutes: [],
    };
  }

  return { isAffected: false, source, destination, affectedDisruption: null, alternativeRoutes: [] };
}

/**
 * Trigger SMS notification using current authenticated user's saved mobile number
 */
export async function triggerSMSNotification(source, destination, toPhone = "", userId = "") {
  try {
    const res = await fetch(`${API_BASE_URL}/disruptions/send-sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: toPhone.trim(),
        source,
        destination,
        userId,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return data;
    }
    return {
      success: false,
      code: data.code || "SMS_FAILED",
      error: data.error || "Unable to send SMS alert. Please try again.",
    };
  } catch (err) {
    console.warn("SMS notification endpoint error:", err.message);
    return { success: false, error: "Unable to send SMS alert. Please try again." };
  }
}

/**
 * Trigger Email notification using current authenticated user's registered email
 */
export async function triggerEmailNotification(source, destination, accountEmail = "", userId = "") {
  try {
    const res = await fetch(`${API_BASE_URL}/disruptions/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        destination,
        email: accountEmail.trim(),
        userId,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return data;
    }
    return {
      success: false,
      error: data.error || "Unable to send email alert. Please try again.",
    };
  } catch (err) {
    console.warn("Email notification endpoint error:", err.message);
    return { success: false, error: "Unable to send email alert. Please try again." };
  }
}

/**
 * Exclude or filter out cancelled/disrupted trains from upcoming schedule
 */
export function filterDisruptedTrains(trainList, activeDisruptions = DEFAULT_DISRUPTIONS) {
  if (!trainList || !Array.isArray(trainList)) return [];
  if (!activeDisruptions || activeDisruptions.length === 0) return trainList;

  const cancelledTrainIds = new Set();
  const affectedLines = new Set();

  activeDisruptions.forEach((d) => {
    if (d.affectedTrains && Array.isArray(d.affectedTrains)) {
      d.affectedTrains.forEach((tId) => cancelledTrainIds.add(tId));
    }
    if (d.type === "service_suspension" || d.type === "train_cancellation") {
      if (d.line) affectedLines.add(d.line.toLowerCase());
    }
  });

  return trainList.filter((train) => {
    if (cancelledTrainIds.has(train.train_id || train.id)) return false;
    if (train.line && affectedLines.has(train.line.toLowerCase())) return false;
    return true;
  });
}
