/**
 * Centralized Ticket Date, Validity and Formatting Utilities
 * Timezone: Asia/Kolkata (Mumbai, India)
 */

/**
 * Normalizes and cleans Via station text so it never duplicates "Via" prefix
 * E.g., "Via Vidyavihar" -> "Vidyavihar", "Via: Dadar" -> "Dadar", "Ghatkopar" -> "Ghatkopar"
 * @param {string} via 
 * @returns {string}
 */
export const formatViaStation = (via) => {
  if (!via) return "";
  let clean = String(via).trim();
  clean = clean.replace(/^via[:\s]+/i, "").trim();
  if (!clean || clean.toLowerCase() === "direct" || clean.toLowerCase() === "none") {
    return "";
  }
  return clean;
};

/**
 * Extracts a valid Date object for ticket issuance/generation
 * @param {Object|string|Date} ticket 
 * @returns {Date|null}
 */
export const getTicketIssueDate = (ticket) => {
  if (!ticket) return null;
  const issueVal = typeof ticket === "object"
    ? (ticket.issued_at || ticket.issuedAt || ticket.created_at || ticket.createdAt || ticket.date)
    : ticket;

  if (!issueVal) return null;
  const d = new Date(issueVal);
  if (!isNaN(d.getTime())) return d;

  // Backward compatibility: If date and time strings were stored separately
  if (typeof ticket === "object" && ticket.date && typeof issueVal === "string") {
    const combined = new Date(`${ticket.date} ${issueVal}`);
    if (!isNaN(combined.getTime())) return combined;
  }

  return null;
};

/**
 * Gets year, month (0-indexed), day, hour, minute, second in Asia/Kolkata
 * @param {Date} dateObj 
 * @returns {Object|null}
 */
export const getKolkataDateParts = (dateObj) => {
  if (!dateObj || isNaN(dateObj.getTime())) return null;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(dateObj);
    const p = {};
    parts.forEach(({ type, value }) => {
      p[type] = value;
    });
    return {
      year: parseInt(p.year, 10),
      month: parseInt(p.month, 10) - 1, // 0-indexed
      day: parseInt(p.day, 10),
      hour: parseInt(p.hour, 10) % 24,
      minute: parseInt(p.minute, 10),
      second: parseInt(p.second, 10),
    };
  } catch (e) {
    return {
      year: dateObj.getFullYear(),
      month: dateObj.getMonth(),
      day: dateObj.getDate(),
      hour: dateObj.getHours(),
      minute: dateObj.getMinutes(),
      second: dateObj.getSeconds(),
    };
  }
};

/**
 * Calculates end of the calendar day (23:59:59.999) in Asia/Kolkata for a given Date
 * @param {Date} dateObj 
 * @returns {Date|null}
 */
export const getKolkataEndOfDay = (dateObj) => {
  const parts = getKolkataDateParts(dateObj);
  if (!parts) return null;
  const yearStr = String(parts.year).padStart(4, "0");
  const monthStr = String(parts.month + 1).padStart(2, "0");
  const dayStr = String(parts.day).padStart(2, "0");
  return new Date(`${yearStr}-${monthStr}-${dayStr}T23:59:59.999+05:30`);
};

/**
 * Calculates calendar month expiry for Season Tickets (Monthly = 1 month, Quarterly = 3 months, Yearly = 12 months)
 * @param {Date} validFromDate 
 * @param {string} seasonType 
 * @returns {Date|null}
 */
export const calculateSeasonExpiry = (validFromDate, seasonType) => {
  if (!validFromDate || isNaN(validFromDate.getTime())) return null;

  const type = (seasonType || "").toLowerCase();
  let monthsToAdd = 1;
  if (type.includes("quarter")) monthsToAdd = 3;
  else if (type.includes("year") || type.includes("annual")) monthsToAdd = 12;

  const parts = getKolkataDateParts(validFromDate);
  if (!parts) return null;

  let targetYear = parts.year;
  let targetMonth = parts.month + monthsToAdd;

  targetYear += Math.floor(targetMonth / 12);
  targetMonth = targetMonth % 12;

  let targetDay = parts.day;
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  if (targetDay > daysInTargetMonth) {
    targetDay = daysInTargetMonth;
  }

  const endTargetDate = new Date(targetYear, targetMonth, targetDay);
  endTargetDate.setDate(endTargetDate.getDate() - 1);

  const yStr = String(endTargetDate.getFullYear()).padStart(4, "0");
  const mStr = String(endTargetDate.getMonth() + 1).padStart(2, "0");
  const dStr = String(endTargetDate.getDate()).padStart(2, "0");

  return new Date(`${yStr}-${mStr}-${dStr}T23:59:59.999+05:30`);
};

/**
 * Centralized function to calculate ticket expiry Date based on ticket type and rules
 * @param {Object|string|Date} ticket 
 * @returns {Date|null}
 */
export const getTicketExpiryDate = (ticket) => {
  if (!ticket) return null;

  const issueDate = getTicketIssueDate(ticket);

  if (typeof ticket === "object") {
    const rawCategory = (ticket.category || "").toLowerCase();
    const rawType = (ticket.ticket_type || ticket.ticketType || ticket.type || ticket.journeyType || ticket.season_type || "").toLowerCase();

    // 1. Season Tickets (Monthly, Quarterly, Yearly)
    if (
      rawCategory === "season" ||
      rawType.includes("season") ||
      rawType.includes("monthly") ||
      rawType.includes("quarterly") ||
      rawType.includes("yearly")
    ) {
      const validFromVal = ticket.valid_from || ticket.validFrom || issueDate;
      const validFromDate = validFromVal ? new Date(validFromVal) : issueDate;
      return calculateSeasonExpiry(validFromDate, rawType);
    }

    // 2. Return Ticket -> 48 hours from issue timestamp
    if (rawType.includes("return")) {
      if (issueDate && !isNaN(issueDate.getTime())) {
        return new Date(issueDate.getTime() + 48 * 60 * 60 * 1000);
      }
    }

    // 3. Explicit valid_upto override if stored
    if (ticket.valid_upto || ticket.validUntil) {
      const explicitVal = ticket.valid_upto || ticket.validUntil;
      const d = new Date(explicitVal);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // 4. Single Ticket (default) -> End of the same calendar day (23:59:59.999) in Asia/Kolkata
  if (issueDate && !isNaN(issueDate.getTime())) {
    return getKolkataEndOfDay(issueDate);
  }

  return null;
};

/**
 * Checks whether a ticket has been used / consumed / scanned
 * Season Tickets are reusable and NEVER consumed after one scan.
 * @param {Object} ticket 
 * @returns {boolean}
 */
export const isTicketConsumed = (ticket) => {
  if (!ticket || typeof ticket !== "object") return false;

  const rawCategory = (ticket.category || "").toLowerCase();
  const rawType = (ticket.ticket_type || ticket.ticketType || ticket.type || "").toLowerCase();

  // Season tickets are multi-use and never consumed after one scan
  if (
    rawCategory === "season" ||
    rawType.includes("season") ||
    rawType.includes("monthly") ||
    rawType.includes("quarterly") ||
    rawType.includes("yearly")
  ) {
    return false;
  }

  return Boolean(
    ticket.used ||
    ticket.is_used ||
    ticket.consumed ||
    ticket.is_consumed ||
    ticket.status === "Used" ||
    ticket.status === "Consumed"
  );
};

/**
 * Determines whether a ticket is currently Active (valid and unconsumed)
 * Checks Valid From for future season tickets if specified.
 * @param {Object|string|Date} ticket 
 * @returns {boolean}
 */
export const isTicketValid = (ticket) => {
  if (!ticket) return false;

  // Consumed/used tickets are no longer active
  if (isTicketConsumed(ticket)) {
    return false;
  }

  const now = new Date();

  // Check valid_from if defined (for upcoming season tickets)
  if (typeof ticket === "object" && (ticket.valid_from || ticket.validFrom)) {
    const validFrom = new Date(ticket.valid_from || ticket.validFrom);
    if (!isNaN(validFrom.getTime()) && now < validFrom) {
      return false; // Upcoming, not yet active
    }
  }

  const expiryDate = getTicketExpiryDate(ticket);
  if (!expiryDate || isNaN(expiryDate.getTime())) {
    return false;
  }

  return now < expiryDate;
};

/**
 * Returns status string: "Active", "Used", "Upcoming", or "Expired"
 * @param {Object|string|Date} ticket 
 * @returns {"Active"|"Used"|"Upcoming"|"Expired"}
 */
export const getTicketStatus = (ticket) => {
  if (!ticket) return "Expired";
  if (isTicketConsumed(ticket)) return "Used";

  const now = new Date();
  if (typeof ticket === "object" && (ticket.valid_from || ticket.validFrom)) {
    const validFrom = new Date(ticket.valid_from || ticket.validFrom);
    if (!isNaN(validFrom.getTime()) && now < validFrom) {
      return "Upcoming";
    }
  }

  return isTicketValid(ticket) ? "Active" : "Expired";
};

/**
 * Formats a Date into standard readable string in Asia/Kolkata timezone
 * @param {Date|string|number} dateVal 
 * @returns {string}
 */
export const formatTicketDateTime = (dateVal) => {
  if (!dateVal) return "N/A";
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (isNaN(d.getTime())) return "N/A";

  try {
    const formatted = d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return formatted.replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase());
  } catch (e) {
    return d.toLocaleString();
  }
};

/**
 * Normalizes a ticket object with calculated date objects, validity status, and formatted strings.
 * @param {Object} ticket 
 * @returns {Object}
 */
export const normalizeTicket = (ticket) => {
  if (!ticket || typeof ticket !== "object") return null;

  const issueDate = getTicketIssueDate(ticket);
  const expiryDate = getTicketExpiryDate(ticket);
  const consumed = isTicketConsumed(ticket);
  const valid = isTicketValid(ticket);
  const status = getTicketStatus(ticket);

  return {
    ...ticket,
    issueDate,
    expiryDate,
    isConsumed: consumed,
    isValid: valid,
    status,
    issuedAtFormatted: formatTicketDateTime(issueDate),
    validUntilFormatted: formatTicketDateTime(expiryDate),
  };
};
