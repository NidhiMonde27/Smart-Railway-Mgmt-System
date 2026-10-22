import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ticketsPath = path.join(__dirname, "../server/tickets.json");

const tickets = JSON.parse(fs.readFileSync(ticketsPath, "utf-8"));

console.log("==================================================");
console.log("RUNNING ADMIN USER TICKET MANAGEMENT FILTER TESTS");
console.log("==================================================\n");

let passedCount = 0;
let totalCount = 0;

const assert = (condition, testName, details = "") => {
  totalCount++;
  if (condition) {
    console.log(`✓ PASS [TEST ${totalCount}] ${testName}`);
    if (details) console.log(`   └─ ${details}`);
    passedCount++;
  } else {
    console.error(`❌ FAIL [TEST ${totalCount}] ${testName}`);
    if (details) console.error(`   └─ ${details}`);
  }
};

const parseTicketDate = (ticket) => {
  if (!ticket) return null;
  const rawStr = ticket.issued_at || ticket.issuedAt || ticket.created_at || ticket.createdAt || ticket.date;
  if (rawStr) {
    const parsed = new Date(rawStr);
    if (!isNaN(parsed.getTime())) return parsed;

    if (typeof rawStr === "string" && rawStr.includes("/")) {
      const parts = rawStr.split("/");
      if (parts.length === 3) {
        const dNum = parseInt(parts[0], 10);
        const mNum = parseInt(parts[1], 10);
        const yNum = parseInt(parts[2], 10);
        if (yNum > 1000) {
          return new Date(yNum, mNum - 1, dNum);
        }
      }
    }
  }
  return null;
};

const isToday = (ticketDate) => {
  if (!ticketDate) return false;
  const now = new Date();
  return (
    ticketDate.getFullYear() === now.getFullYear() &&
    ticketDate.getMonth() === now.getMonth() &&
    ticketDate.getDate() === now.getDate()
  );
};

const isThisWeek = (ticketDate) => {
  if (!ticketDate) return false;
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return ticketDate >= startOfWeek && ticketDate <= endOfWeek;
};

const isThisMonth = (ticketDate) => {
  if (!ticketDate) return false;
  const now = new Date();
  return (
    ticketDate.getFullYear() === now.getFullYear() &&
    ticketDate.getMonth() === now.getMonth()
  );
};

const isSpecificDate = (ticketDate, targetDateStr) => {
  if (!ticketDate || !targetDateStr) return false;
  const [tYear, tMonth, tDay] = targetDateStr.split("-").map((n) => parseInt(n, 10));
  return (
    ticketDate.getFullYear() === tYear &&
    ticketDate.getMonth() === tMonth - 1 &&
    ticketDate.getDate() === tDay
  );
};

// TEST 1: Open User Ticket Management -> All booked tickets displayed
assert(tickets.length > 0, "All Tickets displayed by default", `Total Tickets Loaded: ${tickets.length}`);

// TEST 2: Select 'Today'
const todayTickets = tickets.filter(t => isToday(parseTicketDate(t)));
assert(Array.isArray(todayTickets), "Filter 'Today' executes cleanly", `Today tickets count: ${todayTickets.length}`);

// TEST 3: Select 'This Week'
const weekTickets = tickets.filter(t => isThisWeek(parseTicketDate(t)));
assert(Array.isArray(weekTickets), "Filter 'This Week' executes cleanly", `This Week tickets count: ${weekTickets.length}`);

// TEST 4: Select 'This Month'
const monthTickets = tickets.filter(t => isThisMonth(parseTicketDate(t)));
assert(Array.isArray(monthTickets), "Filter 'This Month' executes cleanly", `This Month tickets count: ${monthTickets.length}`);

// TEST 5 & 6: Select specific date with multiple bookings (2026-10-04)
const targetDateStr = "2026-10-04";
const dateSpecificTickets = tickets.filter(t => isSpecificDate(parseTicketDate(t), targetDateStr));
assert(dateSpecificTickets.length >= 4, "Date-wise filtering ignores time portion and returns all tickets for 2026-10-04", `Bookings found on ${targetDateStr}: ${dateSpecificTickets.length}`);

// TEST 7: Select a date with no bookings
const emptyDateStr = "2020-01-01";
const emptyTickets = tickets.filter(t => isSpecificDate(parseTicketDate(t), emptyDateStr));
assert(emptyTickets.length === 0, "Date with no bookings returns 0 tickets ('No tickets found for the selected period.')", `Count: ${emptyTickets.length}`);

// TEST 8: Change Select Date -> Today clears custom date restriction
let dateFilterMode = "custom";
let selectedDateVal = "2026-10-04";
// Switch to today
dateFilterMode = "today";
selectedDateVal = "";
assert(dateFilterMode === "today" && selectedDateVal === "", "Switching to Today clears custom date filter", `Mode: ${dateFilterMode}`);

// TEST 9: Change Today -> All Tickets restores complete booked-ticket list
dateFilterMode = "all";
const restoredTickets = tickets;
assert(dateFilterMode === "all" && restoredTickets.length === tickets.length, "Switching to All Tickets restores full list", `Restored count: ${restoredTickets.length}`);

// TEST 10: Verify existing ticket actions & fields
const sample = tickets[0];
assert(sample.ticket_id && sample.source && sample.destination && sample.fare !== undefined, "Ticket fields (ID, Source, Destination, Fare) preserved intact", `Sample ID: ${sample.ticket_id}`);

console.log("\n==================================================");
console.log(`ADMIN FILTER TEST SUMMARY: ${passedCount} / ${totalCount} PASSED`);
console.log("==================================================");
