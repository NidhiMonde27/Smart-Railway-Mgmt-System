/**
 * Client-Side Web Push Subscription Utility
 * Manages service worker registration, browser permissions, and VAPID subscription dispatches
 */

const API_BASE_URL = "https://smart-railway-mgmt-system.onrender.com/api";

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Fetch VAPID Public Key from backend API or environment fallback
 */
export async function getVapidPublicKey() {
  try {
    const res = await fetch(`${API_BASE_URL}/push/public-key`);
    if (res.ok) {
      const data = await res.json();
      if (data.publicKey) return data.publicKey;
    }
  } catch (err) {
    console.warn("Failed to fetch VAPID key from backend, using client env fallback:", err.message);
  }
  return import.meta.env.VITE_VAPID_PUBLIC_KEY || "BMFGP097lAyVrAEV6FeeAUNWHk4WcrGcE5LizEFCvAe6Q7rJjpgnjclbwZlTg04bIHS_HivLS6kU5PBUNKHm-wM";
}

/**
 * Register service worker and subscribe browser to Web Push Notifications
 */
export async function subscribeToWebPush(userId = "") {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return {
      success: false,
      error: "Web Push Notifications are not supported by your browser or device."
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: "Notification permission was denied. Please allow notifications in browser settings."
      };
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const vapidKey = await getVapidPublicKey();
    const convertedVapidKey = urlBase64ToUint8Array(vapidKey);

    // Subscribe to browser push manager
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    // Dispatch subscription to backend server
    const res = await fetch(`${API_BASE_URL}/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        userId
      })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      // Trigger a real test push notification dispatch immediately
      await sendTestPushNotification(userId);
      return { success: true, message: "Phone alerts enabled successfully!" };
    }

    return {
      success: false,
      error: data.error || "Unable to save push subscription on backend server."
    };
  } catch (err) {
    console.error("Web push subscription error:", err);
    return {
      success: false,
      error: `Failed to enable push notifications: ${err.message || err}`
    };
  }
}

/**
 * Dispatch a real test Web Push notification to current user via backend API
 */
export async function sendTestPushNotification(userId = "") {
  try {
    const res = await fetch(`${API_BASE_URL}/push/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    return await res.json();
  } catch (err) {
    console.error("Error dispatching test Web Push:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Check if the browser is currently subscribed to Web Push Notifications
 */
export async function isSubscribedToWebPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (e) {
    return false;
  }
}
