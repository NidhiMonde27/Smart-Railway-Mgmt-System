const { calculateCoachOccupancy, generateRoutePeakAnalysis, resolveFullTrainRoute } = require("../server/utils/coachOccupancyEngine");

function testAll17Requirements() {
  console.log("======================================================================");
  console.log("    APLI-MUMBAI: COMPREHENSIVE 17-SCENARIO VERIFICATION TEST SUITE   ");
  console.log("======================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(cond, testNum, description, details = "") {
    if (cond) {
      console.log(`[PASS] Test ${testNum}: ${description} ${details ? "(" + details + ")" : ""}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${testNum}: ${description} ${details ? "(" + details + ")" : ""}`);
      failed++;
    }
  }

  // 1. 12-coach formation with independently calculated occupancy
  const res12 = calculateCoachOccupancy({ trainId: "CR_1002", source: "Thane", destination: "Dadar" });
  assert(res12.coachCount === 12 && res12.coaches.length === 12, 1, "12-Coach Formation", `Count: ${res12.coaches.length}`);

  // 2. 15-coach formation with independently calculated occupancy
  const res15 = calculateCoachOccupancy({ trainId: "CR_1001", source: "Thane", destination: "Dadar" });
  assert(res15.coachCount === 15 && res15.coaches.length === 15, 2, "15-Coach Formation", `Count: ${res15.coaches.length}`);

  // 3. Correct coach order and composition for both formations
  const is12OrderCorrect = res12.coaches[0].coach_code === "SC/DIV" && res12.coaches[1].coach_code === "LADIES" && res12.coaches[3].coach_code === "FC" && res12.coaches[11].coach_code === "VENDOR";
  const is15OrderCorrect = res15.coaches[0].coach_code === "SC/DIV" && res15.coaches[1].coach_code === "LADIES" && res15.coaches[3].coach_code === "FC" && res15.coaches[13].coach_code === "LADIES" && res15.coaches[14].coach_code === "VENDOR";
  assert(is12OrderCorrect && is15OrderCorrect, 3, "Coach Order & Composition (12 & 15 coaches)");

  // 4. Different occupancy values for different coaches
  const uniquePcts = new Set(res12.coaches.map(c => c.occupancyPct));
  assert(uniquePcts.size > 1, 4, "Independent Per-Coach Occupancy Values", `${uniquePcts.size} distinct percentages`);

  // 5. Divyangjan occupancy calculated independently
  const divCoach = res12.coaches.find(c => c.coach_code === "SC/DIV" || c.coach_type.includes("Divyangjan"));
  const scCoach = res12.coaches.find(c => c.coach_code === "SC");
  assert(divCoach && divCoach.capacity === 430 && divCoach.occupancyPct < scCoach.occupancyPct, 5, "Divyangjan Independent Calculation", `Divyangjan: ${divCoach?.occupancyPct}% vs Second Class: ${scCoach?.occupancyPct}%`);

  // 6. Second Class, First Class and Ladies coach calculations
  const fcCoach = res12.coaches.find(c => c.coach_code === "FC");
  const ladiesCoach = res12.coaches.find(c => c.coach_code === "LADIES");
  assert(scCoach && fcCoach && ladiesCoach && fcCoach.capacity === 200 && fcCoach.occupancyPct !== scCoach.occupancyPct, 6, "Class-Specific Capacities & Loads", `SC: ${scCoach?.capacity} cap, FC: ${fcCoach?.capacity} cap`);

  // 7. Morning UP versus morning DOWN
  const morningDate = new Date("2026-10-09T08:30:00+05:30");
  const morningUP = calculateCoachOccupancy({ trainId: "CR_1002", source: "Kalyan", destination: "CSMT", referenceDate: morningDate });
  const morningDOWN = calculateCoachOccupancy({ trainId: "CR_1001", source: "CSMT", destination: "Kalyan", referenceDate: morningDate });
  assert(morningUP.direction === "UP" && morningDOWN.direction === "DOWN" && morningUP.overallOccupancyPct > morningDOWN.overallOccupancyPct, 7, "Morning UP vs Morning DOWN Peak Flow", `UP: ${morningUP.overallOccupancyPct}% vs DOWN: ${morningDOWN.overallOccupancyPct}%`);

  // 8. Evening UP versus evening DOWN
  const eveningDate = new Date("2026-10-09T18:30:00+05:30");
  const eveningUP = calculateCoachOccupancy({ trainId: "CR_1004", source: "Kalyan", destination: "CSMT", referenceDate: eveningDate });
  const eveningDOWN = calculateCoachOccupancy({ trainId: "CR_1003", source: "CSMT", destination: "Kalyan", referenceDate: eveningDate });
  assert(eveningUP.direction === "UP" && eveningDOWN.direction === "DOWN" && eveningDOWN.overallOccupancyPct > eveningUP.overallOccupancyPct, 8, "Evening UP vs Evening DOWN Peak Flow", `DOWN: ${eveningDOWN.overallOccupancyPct}% vs UP: ${eveningUP.overallOccupancyPct}%`);

  // 9. Occupancy increasing after boarding and decreasing after alighting
  const sim = morningUP.routeStationSim;
  let hasIncrease = false;
  let hasDecrease = false;
  for (let i = 1; i < sim.length; i++) {
    if (sim[i].totalPassengers > sim[i-1].totalPassengers) hasIncrease = true;
    if (sim[i].totalPassengers < sim[i-1].totalPassengers) hasDecrease = true;
  }
  assert(hasIncrease && hasDecrease, 9, "Station Boarding Accumulation & Alighting Reduction", `Pax increases after boarding, decreases after alighting`);

  // 10. Dombivli -> Thane and Thane -> Dombivli
  const dombThane = calculateCoachOccupancy({ source: "Dombivli", destination: "Thane" });
  const thaneDomb = calculateCoachOccupancy({ source: "Thane", destination: "Dombivli" });
  assert(dombThane.direction === "UP" && thaneDomb.direction === "DOWN", 10, "Dombivli ↔ Thane Directional Sensitivity", `Domb-Thane: ${dombThane.direction}, Thane-Domb: ${thaneDomb.direction}`);

  // 11. CSMT -> Kasara and CSMT -> Khopoli
  const csmtKasara = calculateCoachOccupancy({ trainId: "CR_1064", source: "CSMT", destination: "Kasara" });
  const csmtKhopoli = calculateCoachOccupancy({ trainId: "CR_1090", source: "CSMT", destination: "Khopoli" });
  assert(csmtKasara.fullRoute.includes("Kasara") && !csmtKasara.fullRoute.includes("Khopoli") && csmtKhopoli.fullRoute.includes("Khopoli") && !csmtKhopoli.fullRoute.includes("Kasara"), 11, "Kasara vs Khopoli Branch Isolation", `Kasara route length: ${csmtKasara.fullRoute.length}, Khopoli route length: ${csmtKhopoli.fullRoute.length}`);

  // 12. Karjat and intermediate-terminating services
  const csmtKarjat = calculateCoachOccupancy({ trainId: "CR_1080", source: "CSMT", destination: "Karjat" });
  assert(csmtKarjat.fullRoute.includes("Karjat") && csmtKarjat.fullRoute.includes("Badlapur"), 12, "Karjat Branch Service Route", `Includes Badlapur & Karjat`);

  // 13. Slow and fast service stopping patterns
  const fastRoute = resolveFullTrainRoute("CSMT", "Kalyan", "Central", "Fast Local");
  const slowRoute = resolveFullTrainRoute("CSMT", "Kalyan", "Central", "Slow Local");
  assert(fastRoute.length < slowRoute.length, 13, "Slow vs Fast Local Stopping Patterns", `Fast: ${fastRoute.length} stops vs Slow: ${slowRoute.length} stops`);

  // 14. Changing source, destination, train, direction and time
  const midDayDate = new Date("2026-10-09T14:00:00+05:30");
  const midDay = calculateCoachOccupancy({ trainId: "CR_1001", source: "Thane", destination: "Dadar", referenceDate: midDayDate });
  assert(midDay.periodName === "Mid-Day" && midDay.overallOccupancyPct < morningUP.overallOccupancyPct, 14, "Dynamic Time-of-Day Adaptation", `Mid-Day: ${midDay.overallOccupancyPct}% vs Morning Peak: ${morningUP.overallOccupancyPct}%`);

  // 15. Correct least crowded, most crowded and recommended coach results
  const leastOcc = res12.leastCrowded.occupancyPct;
  const mostOcc = res12.mostCrowded.occupancyPct;
  assert(leastOcc <= mostOcc && res12.recommendedBoarding.includes("Coach"), 15, "Least/Most Crowded & Recommended Coach", `Least: ${res12.leastCrowded.coach_number} (${leastOcc}%), Most: ${res12.mostCrowded.coach_number} (${mostOcc}%)`);

  // 16. Consistency between coach cards, station strip, summary and graph
  const boardingStep = res12.routeStationSim.find(s => s.station === "Thane");
  assert(boardingStep && boardingStep.overallOccupancyPct === res12.overallOccupancyPct, 16, "Component State Synchronization", `Station strip @ Thane: ${boardingStep?.overallOccupancyPct}% === Summary: ${res12.overallOccupancyPct}%`);

  // 17. Valid passenger counts and capacity calculations
  const allPaxValid = res12.coaches.every(c => c.passengers >= 0 && c.capacity > 0 && Number.isInteger(c.passengers));
  const sumPax = res12.coaches.reduce((a, c) => a + c.passengers, 0);
  const sumCap = res12.coaches.reduce((a, c) => a + c.capacity, 0);
  const mathPct = Math.round((sumPax / sumCap) * 100);
  assert(allPaxValid && mathPct === res12.overallOccupancyPct, 17, "Valid Non-Negative Pax Counts & Capacity Math", `Total Pax: ${sumPax}, Cap: ${sumCap}, Pct: ${mathPct}%`);

  console.log("\n======================================================================");
  console.log(`                 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("======================================================================\n");
}

testAll17Requirements();
