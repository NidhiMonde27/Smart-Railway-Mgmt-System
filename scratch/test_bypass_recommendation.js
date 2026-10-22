import {
  calculateJourneyRouteOptions,
  findAlternativeRailwayRoutes,
} from "../client/src/utils/routeUtils.js";

console.log("==================================================");
console.log("TESTING DYNAMIC BYPASS RECOMMENDATION ENGINE");
console.log("==================================================\n");

// Test Case 1: Thane -> Dadar under normal conditions (no disruption, normal crowd)
const res1 = calculateJourneyRouteOptions({
  source: "Thane",
  destination: "Dadar",
  referenceDate: new Date("2026-10-07T14:00:00+05:30"), // Off-peak afternoon
  activeDisruptions: [],
});

console.log("--- Test 1: Thane -> Dadar (Normal Conditions) ---");
console.log("Recommend Bypass?", res1.recommendBypass);
console.log("Reason:", res1.reason);
console.log("Primary Card Badge:", res1.routes[0]?.badge);
console.log("Primary Card Type:", res1.routes[0]?.type);
console.log("All Card Badges:", res1.routes.map((r) => r.badge).join(" | "));
console.log("");

// Test Case 2: Thane -> Dadar with Active Central Line Disruption
const disruptionCR = [
  {
    disruptionId: "DISRUPT_CR_001",
    title: "Central Line Track & Signal Disruption",
    line: "Central",
    affectedStations: ["Thane", "Kurla", "Dadar"],
    affectedSegment: ["Thane", "Kurla", "Dadar"],
    message: "Central Line track disruption between Thane and Dadar near Kurla Junction",
  },
];

const res2 = calculateJourneyRouteOptions({
  source: "Thane",
  destination: "Dadar",
  referenceDate: new Date("2026-10-07T14:00:00+05:30"),
  activeDisruptions: disruptionCR,
});

console.log("--- Test 2: Thane -> Dadar (Central Line Disruption) ---");
console.log("Recommend Bypass?", res2.recommendBypass);
console.log("Reason:", res2.reason);
console.log("Primary Card Badge:", res2.routes[0]?.badge);
console.log("Primary Card Subtext:", res2.routes[0]?.badgeSubtext);
console.log("Primary Card Type:", res2.routes[0]?.type);
console.log("");

// Test Case 3: Dombivli -> Dadar under normal conditions
const res3 = calculateJourneyRouteOptions({
  source: "Dombivli",
  destination: "Dadar",
  referenceDate: new Date("2026-10-07T14:00:00+05:30"),
  activeDisruptions: [],
});

console.log("--- Test 3: Dombivli -> Dadar (Normal Conditions) ---");
console.log("Recommend Bypass?", res3.recommendBypass);
console.log("Primary Card Badge:", res3.routes[0]?.badge);
console.log("Primary Card Type:", res3.routes[0]?.type);
console.log("");

// Test Case 4: Andheri -> Churchgate under normal conditions
const res4 = calculateJourneyRouteOptions({
  source: "Andheri",
  destination: "Churchgate",
  referenceDate: new Date("2026-10-07T14:00:00+05:30"),
  activeDisruptions: [],
});

console.log("--- Test 4: Andheri -> Churchgate (Normal Conditions) ---");
console.log("Recommend Bypass?", res4.recommendBypass);
console.log("Primary Card Badge:", res4.routes[0]?.badge);
console.log("Primary Card Type:", res4.routes[0]?.type);
console.log("");

// Test Case 5: Vashi -> Dadar under normal conditions
const res5 = calculateJourneyRouteOptions({
  source: "Vashi",
  destination: "Dadar",
  referenceDate: new Date("2026-10-07T14:00:00+05:30"),
  activeDisruptions: [],
});

console.log("--- Test 5: Vashi -> Dadar (Normal Conditions) ---");
console.log("Recommend Bypass?", res5.recommendBypass);
console.log("Primary Card Badge:", res5.routes[0]?.badge);
console.log("Primary Card Type:", res5.routes[0]?.type);
console.log("");

console.log("==================================================");
