const { calculateCoachOccupancy, generateRoutePeakAnalysis, resolveFullTrainRoute } = require("../server/utils/coachOccupancyEngine");

function runScenarios() {
  console.log("==================================================");
  console.log("COACH OCCUPANCY & ROUTE CROWD ENGINE VERIFICATION");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(cond, desc) {
    if (cond) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  // 1. CSMT -> Kalyan during Morning Peak
  const morningDate = new Date("2026-10-09T08:30:00+05:30");
  const res1 = calculateCoachOccupancy({
    trainId: "CR_1001",
    source: "CSMT",
    destination: "Kalyan",
    travelClass: "Second Class",
    referenceDate: morningDate,
  });
  assert(res1.direction === "DOWN", "Scenario 1: CSMT -> Kalyan direction is DOWN");
  assert(res1.fullRoute.length >= 26, "Scenario 1: Full route contains complete station sequence");
  assert(res1.routeStationSim.length === res1.fullRoute.length, "Scenario 1: Station-by-station simulation generated for all stations");

  // 2. Kalyan -> CSMT during Morning Peak
  const res2 = calculateCoachOccupancy({
    trainId: "CR_1002",
    source: "Kalyan",
    destination: "CSMT",
    travelClass: "Second Class",
    referenceDate: morningDate,
  });
  assert(res2.direction === "UP", "Scenario 2: Kalyan -> CSMT direction is UP");
  assert(res2.overallOccupancyPct > res1.overallOccupancyPct, "Scenario 2: Morning peak UP towards city center has higher occupancy than DOWN");

  // 3. CSMT -> Kalyan during Evening Peak
  const eveningDate = new Date("2026-10-09T18:30:00+05:30");
  const res3 = calculateCoachOccupancy({
    trainId: "CR_1003",
    source: "CSMT",
    destination: "Kalyan",
    travelClass: "Second Class",
    referenceDate: eveningDate,
  });
  assert(res3.direction === "DOWN", "Scenario 3: CSMT -> Kalyan in Evening Peak is DOWN");
  assert(res3.overallOccupancyPct > res1.overallOccupancyPct, "Scenario 3: Evening peak DOWN out of city center has high occupancy");

  // 4. Kalyan -> CSMT during Evening Peak
  const res4 = calculateCoachOccupancy({
    trainId: "CR_1004",
    source: "Kalyan",
    destination: "CSMT",
    travelClass: "Second Class",
    referenceDate: eveningDate,
  });
  assert(res4.direction === "UP", "Scenario 4: Kalyan -> CSMT in Evening Peak is UP");

  // 5. Service terminating at Kasara
  const res5 = calculateCoachOccupancy({
    trainId: "CR_1064",
    source: "Thane",
    destination: "Kasara",
    travelClass: "Second Class",
  });
  assert(res5.fullRoute.includes("Kasara") && res5.fullRoute.includes("Titwala"), "Scenario 5: Service to Kasara includes Kasara branch stations");

  // 6. Service terminating at Karjat
  const res6 = calculateCoachOccupancy({
    trainId: "CR_1080",
    source: "Dadar",
    destination: "Karjat",
    travelClass: "Second Class",
  });
  assert(res6.fullRoute.includes("Karjat") && res6.fullRoute.includes("Badlapur"), "Scenario 6: Service to Karjat includes Karjat branch stations");

  // 7. Service continuing to Khopoli
  const res7 = calculateCoachOccupancy({
    trainId: "CR_1090",
    source: "CSMT",
    destination: "Khopoli",
    travelClass: "Second Class",
  });
  assert(res7.fullRoute.includes("Khopoli") && res7.fullRoute.includes("Lowjee"), "Scenario 7: Service to Khopoli includes Khopoli branch stations");

  // 8. Intermediate origins / destinations (Dombivli, Thane, Badlapur, Titwala, Asangaon)
  const res8 = calculateCoachOccupancy({
    trainId: "CR_1010",
    source: "Dombivli",
    destination: "Badlapur",
    travelClass: "Second Class",
  });
  assert(res8.routeStationSim.some(s => s.station === "Dombivli") && res8.routeStationSim.some(s => s.station === "Badlapur"), "Scenario 8: Intermediate origin/dest (Dombivli -> Badlapur) calculated cleanly");

  // 9. Slow vs Fast train stopping patterns
  const fastRoute = resolveFullTrainRoute("CSMT", "Kalyan", "Central", "Fast Local");
  const slowRoute = resolveFullTrainRoute("CSMT", "Kalyan", "Central", "Slow Local");
  assert(fastRoute.length < slowRoute.length, `Scenario 9: Fast local stops (${fastRoute.length}) < Slow local stops (${slowRoute.length})`);

  // 10. 12-coach vs 15-coach formations
  const res12 = calculateCoachOccupancy({ trainId: "CR_1002" });
  const res15 = calculateCoachOccupancy({ trainId: "CR_1001" });
  assert(res12.coachCount === 12 || res12.coachCount === 15, "Scenario 10: Valid coach count (12 or 15) produced");

  // 11. Changing source, destination, train, class
  const res11a = calculateCoachOccupancy({ trainId: "CR_1001", source: "Thane", destination: "Dadar", travelClass: "Second Class" });
  const res11b = calculateCoachOccupancy({ trainId: "CR_1001", source: "Thane", destination: "Dadar", travelClass: "First Class" });
  assert(res11b.overallOccupancyPct < res11a.overallOccupancyPct, "Scenario 11: First Class has lower occupancy than Second Class");

  // 12. Bounds & accumulation validity check (0-100% occupancy, positive passengers)
  const allInBounds = res1.coaches.every(c => c.occupancyPct >= 0 && c.occupancyPct <= 100 && c.passengers >= 0);
  assert(allInBounds, "Scenario 12: All coach occupancy percentages stay strictly within 0% to 100%");

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");
}

runScenarios();
