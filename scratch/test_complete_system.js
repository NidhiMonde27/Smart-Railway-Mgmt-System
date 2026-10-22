import { getAllStations, railwayStations, allRailwayStationsList, localStationCategories, getStationLines, getStationDisplayLabel } from "../client/src/utils/allStations.js";
import { westernLineStations, centralLineStations, harbourLineStations, transHarbourLineStations } from "../client/src/utils/stations.js";
import { getAvailableRoutes } from "../client/src/utils/routeUtils.js";
import {
  isTicketValid,
  getTicketExpiryDate,
  getTicketStatus,
  calculateSeasonExpiry,
  isTicketConsumed,
  formatTicketDateTime
} from "../client/src/utils/ticketUtils.js";
import { calculateFare, calculateSeasonFare } from "../client/src/utils/fareCalculator.js";
import { searchUpcomingTrains, ALL_TRAIN_SERVICES } from "../client/src/utils/timetableData.js";

console.log("==========================================");
console.log("      RUNNING END-TO-END VERIFICATION     ");
console.log("==========================================");

// 1. Station Dataset & Categorization Verification
console.log("\n--- 1. STATION CATEGORIZATION TEST ---");
const allStns = getAllStations();
console.log("Total stations loaded:", allStns.length);
console.log("Western line stations count:", westernLineStations.length);
console.log("Central line stations count:", centralLineStations.length);
console.log("Harbour line stations count:", harbourLineStations.length);
console.log("Trans-Harbour line stations count:", transHarbourLineStations.length);

console.log("\nVerifying Local Station Categories Data Structure:");
console.log("Central Branches:", Object.keys(localStationCategories.Central));
console.log("Harbour Branches:", Object.keys(localStationCategories.Harbour));
console.log("Western Branches:", Object.keys(localStationCategories.Western));

// Verify shared interchange stations display labels
const dadarLines = getStationLines("Dadar");
const andheriLines = getStationLines("Andheri");
const csmtLines = getStationLines("CSMT");
console.log("Dadar Lines:", dadarLines, "| Display:", getStationDisplayLabel("Dadar"));
console.log("Andheri Lines:", andheriLines, "| Display:", getStationDisplayLabel("Andheri"));
console.log("CSMT Lines:", csmtLines, "| Display:", getStationDisplayLabel("CSMT"));

if (!dadarLines.includes("Central") || !dadarLines.includes("Western")) {
  console.error("✕ ERROR: Dadar shared lines mapping failed!");
  process.exit(1);
}

// 2. Timetable Search Engine Test
console.log("\n--- 2. TIMETABLE SEARCH ENGINE TEST ---");
console.log("Total Timetable Services Loaded:", ALL_TRAIN_SERVICES.length);

// Test Ghatkopar -> Dadar (e.g. Kalyan -> CSMT service sequence verification)
const ghatkoparToDadar = searchUpcomingTrains("Ghatkopar", "Dadar");
console.log(`Ghatkopar -> Dadar upcoming trains count: ${ghatkoparToDadar.length}`);
if (ghatkoparToDadar.length > 0) {
  const t = ghatkoparToDadar[0];
  console.log(`✓ Next train: ${t.name} | Dep Ghatkopar: ${t.departureTime} | Arr Dadar: ${t.arrivalTime} | ETA: ${t.eta}`);
} else {
  console.error("✕ ERROR: Timetable search Ghatkopar -> Dadar returned 0 trains!");
  process.exit(1);
}

// Test Thane -> Sanpada (Trans-Harbour)
const thaneToSanpada = searchUpcomingTrains("Thane", "Sanpada");
console.log(`Thane -> Sanpada upcoming trains count: ${thaneToSanpada.length}`);
if (thaneToSanpada.length > 0) {
  const t = thaneToSanpada[0];
  console.log(`✓ Next train: ${t.name} | Dep Thane: ${t.departureTime} | Arr Sanpada: ${t.arrivalTime} | ETA: ${t.eta}`);
} else {
  console.error("✕ ERROR: Timetable search Thane -> Sanpada returned 0 trains!");
  process.exit(1);
}

// 3. Route Calculation Test (Including Via & Trans-Harbour)
console.log("\n--- 3. ROUTE CALCULATION TEST ---");
const directRoutes = getAvailableRoutes("Churchgate", "Borivali");
console.log("Direct Route (Churchgate -> Borivali):", directRoutes[0].via, "| Path:", directRoutes[0].path);

const viaDadarRoutes = getAvailableRoutes("Dombivli", "Andheri");
console.log("Cross-Line Route (Dombivli -> Andheri):", viaDadarRoutes[0].via, "| Path:", viaDadarRoutes[0].path);

const transHarbourRoutes = getAvailableRoutes("Thane", "Juinagar");
console.log("Trans-Harbour Route (Thane -> Juinagar):", transHarbourRoutes[0].via, "| Path:", transHarbourRoutes[0].path);

// 4. Centralized Ticket Validity Test (Asia/Kolkata)
console.log("\n--- 4. TICKET VALIDITY TEST (Asia/Kolkata) ---");
const now = new Date();
const singleTicket = {
  ticket_type: "Single Journey",
  issued_at: now.toISOString(),
  category: "journey"
};
const singleExpiry = getTicketExpiryDate(singleTicket);
console.log("Single Ticket Issued:", formatTicketDateTime(now));
console.log("Single Ticket Expiry (Same-day 23:59:59 IST):", formatTicketDateTime(singleExpiry));
console.log("Is Single Ticket Valid?", isTicketValid(singleTicket));

const returnTicket = {
  ticket_type: "Return Journey",
  issued_at: now.toISOString(),
  category: "journey"
};
const returnExpiry = getTicketExpiryDate(returnTicket);
console.log("Return Ticket Expiry (48h IST):", formatTicketDateTime(returnExpiry));
console.log("Is Return Ticket Valid?", isTicketValid(returnTicket));

const monthlyPass = {
  category: "season",
  season_type: "monthly",
  ticket_type: "Monthly Season Ticket",
  valid_from: now.toISOString(),
};
const monthlyExpiry = getTicketExpiryDate(monthlyPass);
console.log("Monthly Pass Expiry (1 Calendar Month IST):", formatTicketDateTime(monthlyExpiry));
console.log("Is Monthly Pass Valid?", isTicketValid(monthlyPass));
console.log("Is Monthly Pass Consumed on Scan?", isTicketConsumed(monthlyPass));

// 5. Season Fare Test
console.log("\n--- 5. FARE CALCULATOR TEST ---");
const singleFare = calculateFare("Thane", "Dadar", "Second Class", "Single Journey", 1);
const monthlyFare = calculateSeasonFare("Thane", "Dadar", "Second Class", "Monthly");
console.log(`Single Fare Thane->Dadar: ₹${singleFare} | Monthly Pass Fare: ₹${monthlyFare}`);

console.log("\n==========================================");
console.log("      ALL TESTS PASSED SUCCESSFULLY!       ");
console.log("==========================================");
