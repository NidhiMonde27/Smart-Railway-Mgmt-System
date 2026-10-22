/**
 * Centralized Phone Number Normalization and Validation Utility
 * Standardizes Indian mobile numbers to E.164 format (+91XXXXXXXXXX)
 */

export function normalizePhoneNumber(input) {
  if (!input || typeof input !== "string") {
    return {
      isValid: false,
      normalized: "",
      error: "Mobile number is required.",
    };
  }

  // Remove spaces, hyphens, and parentheses
  let cleaned = input.trim().replace(/[\s\-\(\)]/g, "");

  // Remove leading duplicate pluses or accidental formatting prefixes
  while (cleaned.startsWith("++")) {
    cleaned = cleaned.substring(1);
  }

  // Handle +91 prefix correctly without duplicating
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }

  // Validate that cleaned digits consist of exactly 10 digits starting with 6, 7, 8, or 9
  const indianMobileRegex = /^[6-9]\d{9}$/;

  if (!indianMobileRegex.test(cleaned)) {
    return {
      isValid: false,
      normalized: "",
      error: "Please enter a valid 10-digit Indian mobile number (e.g., 9876543210 or +919876543210).",
    };
  }

  const normalized = `+91${cleaned}`;

  return {
    isValid: true,
    normalized,
    error: null,
  };
}
