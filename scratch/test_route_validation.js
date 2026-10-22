import {
  findLocalRoute,
  findMetroRoute,
  validateRoute,
  getAvailableRoutes,
} from "../client/src/utils/routeUtils.js";
import { allMetroStationsList, allRailwayStationsList } from "../client/src/utils/stations.js";

console.log("==================================================");
console.log("RUNNING VERIFICATION TEST SUITE (PART 24 & PART 25)");
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

// TEST 1: Dombivli -> Ghatkopar (Metro)
const t1 = findMetroRoute("Dombivli", "Ghatkopar");
assert(!t1.valid, "Dombivli -> Ghatkopar on Metro", `Message: ${t1.message}`);

// TEST 2: Ghatkopar -> Andheri (Metro)
const t2 = findMetroRoute("Ghatkopar", "Andheri");
assert(t2.valid && t2.path && t2.path.length > 2, "Ghatkopar -> Andheri on Metro Line 1", `Stops: ${t2.path ? t2.path.join(" -> ") : "None"}`);

// TEST 3: Dahisar East -> Andheri West (Metro)
const t3 = findMetroRoute("Dahisar East", "Andheri West");
assert(t3.valid && t3.path, "Dahisar East -> Andheri West on Yellow Line 2A", `Path: ${t3.path ? t3.path.join(" -> ") : "None"}`);

// TEST 4: Dahisar East -> Gundavali (Metro)
const t4 = findMetroRoute("Dahisar East", "Gundavali");
assert(t4.valid && t4.path, "Dahisar East -> Gundavali on Red Line 7", `Path: ${t4.path ? t4.path.join(" -> ") : "None"}`);

// TEST 5: Cuffe Parade -> CSMT (Metro)
const t5 = findMetroRoute("Cuffe Parade", "CSMT");
assert(t5.valid && t5.path, "Cuffe Parade -> CSMT on Aqua Line 3", `Path: ${t5.path ? t5.path.join(" -> ") : "None"}`);

// TEST 6: Invalid Metro source/destination
const t6 = findMetroRoute("Kalyan", "Thane");
assert(!t6.valid, "Kalyan -> Thane on Metro (Invalid)", `Result: ${t6.message}`);

// TEST 7: Valid Local Train source/destination
const t7 = findLocalRoute("Thane", "Dadar");
assert(t7.valid && t7.path, "Thane -> Dadar on Local Train", `Via: ${t7.via}`);

// TEST 8: Invalid Local Train source/destination
const t8 = findLocalRoute("Versova", "D.N. Nagar");
assert(!t8.valid, "Versova -> D.N. Nagar on Local Train (Invalid)", `Message: ${t8.message}`);

// TEST 9: Both Local and Metro valid (Ghatkopar -> Andheri)
const t9 = getAvailableRoutes("Ghatkopar", "Andheri");
const localOptT9 = t9.find(r => r.transportType === "local" && r.isAvailable);
const metroOptT9 = t9.find(r => r.transportType === "metro" && r.isAvailable);
assert(!!localOptT9 && !!metroOptT9, "Ghatkopar -> Andheri shows BOTH valid options", `Local: ${localOptT9?.via} | Metro: ${metroOptT9?.via}`);

// TEST 10: Only Local valid (Dombivli -> Ghatkopar)
const t10 = getAvailableRoutes("Dombivli", "Ghatkopar");
const localOptT10 = t10.find(r => r.transportType === "local" && r.isAvailable);
const metroOptT10 = t10.find(r => r.transportType === "metro" && !r.isAvailable);
assert(!!localOptT10 && !!metroOptT10, "Dombivli -> Ghatkopar: Local valid, Metro unavailable", `Local: ${localOptT10?.via} | Metro: ${metroOptT10?.via}`);

// TEST 11: Only Metro valid (Versova -> D.N. Nagar)
const t11 = getAvailableRoutes("Versova", "D.N. Nagar");
const localOptT11 = t11.find(r => r.transportType === "local" && !r.isAvailable);
const metroOptT11 = t11.find(r => r.transportType === "metro" && r.isAvailable);
assert(!!localOptT11 && !!metroOptT11, "Versova -> D.N. Nagar: Metro valid, Local unavailable", `Local: ${localOptT11?.via} | Metro: ${metroOptT11?.via}`);

// TEST 12: Neither valid (Fake stations)
const t12 = getAvailableRoutes("FakeStation1", "FakeStation2");
const localOptT12 = t12.find(r => r.transportType === "local" && !r.isAvailable);
const metroOptT12 = t12.find(r => r.transportType === "metro" && !r.isAvailable);
assert(!!localOptT12 && !!metroOptT12, "Neither valid returns unavailable statuses", `Local: ${localOptT12?.via} | Metro: ${metroOptT12?.via}`);

// TEST 13: Metro Season Ticket dropdowns contain Metro stations only
const metroStationsCount = allMetroStationsList.length;
const hasLocalOnlyInMetro = allMetroStationsList.some(s => s === "Dombivli" || s === "Kalyan" || s === "Thakurli");
assert(metroStationsCount > 10 && !hasLocalOnlyInMetro, "Metro station list contains Metro stations only (no Dombivli/Kalyan)", `Total Metro Stations: ${metroStationsCount}`);

// TEST 14: Metro Season Ticket with 2 valid connected Metro stations
const t14 = findMetroRoute("Ghatkopar", "Versova");
assert(t14.valid, "Metro Season Ticket for Ghatkopar -> Versova allowed", `Path: ${t14.path?.join(" -> ")}`);

// TEST 15: Metro Season Ticket with invalid Metro route
const t15 = findMetroRoute("Versova", "Badlapur");
assert(!t15.valid, "Metro Season Ticket for Versova -> Badlapur rejected", `Message: ${t15.message}`);

// TEST 16: Try to pass Local-only station (Dombivli) to Metro Season Ticket
const t16 = findMetroRoute("Dombivli", "Ghatkopar");
assert(!t16.valid, "Direct API/validation rejects Dombivli on Metro Season Ticket", `Message: ${t16.message}`);

// TEST 17: Existing Local Train Season Ticket
const t17 = findLocalRoute("Churchgate", "Borivali");
assert(t17.valid, "Local Train Season Ticket for Churchgate -> Borivali valid", `Path: ${t17.via}`);

console.log("\n==================================================");
console.log(`TEST SUMMARY: ${passedCount} / ${totalCount} TESTS PASSED`);
console.log("==================================================");
if (passedCount === totalCount) {
  console.log("🎉 ALL ROUTE VALIDATION AND METRO SEASON TICKET TESTS PASSED!");
} else {
  console.error("⚠️ SOME TESTS FAILED!");
}
