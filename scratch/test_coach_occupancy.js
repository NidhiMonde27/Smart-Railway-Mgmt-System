// Comprehensive Test Script for Coach Occupancy Engine across all lines and routes
const fs = require('fs');

const STATION_DEMAND_SCORES = {
  "csmt": 1.5, "churchgate": 1.5, "dadar": 1.5, "kurla": 1.4, "thane": 1.4,
  "kalyan": 1.3, "andheri": 1.4, "borivali": 1.4, "ghatkopar": 1.3, "bandra": 1.3,
  "vashi": 1.3, "panvel": 1.3, "dombivli": 1.2, "goregaon": 1.2, "chembur": 1.1,
  "nerul": 1.1, "belapur": 1.1, "seawoods-darave": 1.1, "virar": 1.3, "airoli": 1.0
};

function getStationDemandScore(stationName) {
  if (!stationName) return 0.85;
  const norm = stationName.trim().toLowerCase()
    .replace(/ metro/g, "").replace(/ junction/g, "").replace(/ road/g, "").replace(/ station/g, "");
  return STATION_DEMAND_SCORES[norm] || 0.85;
}

function getDeterministicHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function calculateCoachOccupancy({
  trainId = "CR_1001",
  source = "Thane",
  destination = "Dadar",
  travelClass = "Second Class",
  referenceDate = new Date(),
  trainService = null
}) {
  const strSeed = `${trainId}_${source}_${destination}_${travelClass}`.toLowerCase();
  const seedHash = getDeterministicHash(strSeed);

  const now = referenceDate ? new Date(referenceDate) : new Date();
  const utcHours = now.getUTCHours();
  const utcMins = now.getUTCMinutes();
  const istTotalMinutes = (utcHours * 60 + utcMins + 330) % 1440;

  let timeFactor = 0.65;
  let periodName = "Mid-Day";

  if (istTotalMinutes >= 420 && istTotalMinutes <= 660) {
    timeFactor = 1.45;
    periodName = "Morning Peak";
  } else if (istTotalMinutes > 660 && istTotalMinutes < 1020) {
    timeFactor = 0.65;
    periodName = "Mid-Day";
  } else if (istTotalMinutes >= 1020 && istTotalMinutes <= 1260) {
    timeFactor = 1.50;
    periodName = "Evening Peak";
  } else {
    timeFactor = 0.40;
    periodName = "Late Night";
  }

  let line = "Central";
  if (trainService && trainService.line) {
    line = trainService.line;
  } else if (trainId.startsWith("WR")) {
    line = "Western";
  } else if (trainId.startsWith("HR")) {
    line = "Harbour";
  } else if (trainId.startsWith("TH")) {
    line = "Trans-Harbour";
  }

  const normSrc = source.trim().toLowerCase();
  const normDst = destination.trim().toLowerCase();

  let isUpDirection = false;
  if (line === "Central") {
    const southOrder = ["csmt", "masjid", "sandhurst road", "byculla", "chinchpokli", "currey road", "parel", "dadar", "matunga", "sion", "kurla", "vidyavihar", "ghatkopar", "vikhroli", "kanjurmarg", "bhandup", "nahur", "mulund", "thane", "kalwa", "mumbra", "diva junction", "dombivli", "kalyan", "kasara", "khopoli"];
    const sIdx = southOrder.findIndex(s => normSrc.includes(s));
    const dIdx = southOrder.findIndex(s => normDst.includes(s));
    if (sIdx !== -1 && dIdx !== -1) {
      isUpDirection = sIdx > dIdx;
    } else {
      isUpDirection = normDst.includes("csmt") || normDst.includes("dadar");
    }
  } else if (line === "Western") {
    const southOrder = ["churchgate", "marine lines", "charni road", "grant road", "mumbai central", "mahalaxmi", "lower parel", "prabhadevi", "dadar", "matunga road", "mahim", "bandra", "khar road", "santacruz", "vile parle", "andheri", "jogeshwari", "ram mandir", "goregaon", "malad", "kandivali", "borivali", "dahisar", "mira road", "bhayandar", "virar", "dahanu road"];
    const sIdx = southOrder.findIndex(s => normSrc.includes(s));
    const dIdx = southOrder.findIndex(s => normDst.includes(s));
    if (sIdx !== -1 && dIdx !== -1) {
      isUpDirection = sIdx > dIdx;
    } else {
      isUpDirection = normDst.includes("churchgate") || normDst.includes("dadar");
    }
  } else if (line === "Harbour") {
    const southOrder = ["csmt", "masjid", "sandhurst road", "dockyard road", "reay road", "cotton green", "sewri", "wadala road", "gtb nagar", "chunabhatti", "kurla", "tilak nagar", "chembur", "govandi", "mankhurd", "vashi", "sanpada", "juinagar", "nerul", "seawoods-darave", "cbd belapur", "kharghar", "mansarovar", "khandeshwar", "panvel"];
    const sIdx = southOrder.findIndex(s => normSrc.includes(s));
    const dIdx = southOrder.findIndex(s => normDst.includes(s));
    if (sIdx !== -1 && dIdx !== -1) {
      isUpDirection = sIdx > dIdx;
    } else {
      isUpDirection = normDst.includes("csmt") || normDst.includes("kurla");
    }
  } else if (line === "Trans-Harbour") {
    const order = ["thane", "digha gaon", "airoli", "rabale", "ghansoli", "koparkhairane", "turbhe", "sanpada", "vashi", "juinagar", "nerul", "panvel"];
    const sIdx = order.findIndex(s => normSrc.includes(s));
    const dIdx = order.findIndex(s => normDst.includes(s));
    if (sIdx !== -1 && dIdx !== -1) {
      isUpDirection = sIdx > dIdx; // Towards Thane
    }
  }

  let directionFactor = 1.0;
  if (periodName === "Morning Peak") {
    directionFactor = isUpDirection ? 1.40 : 0.60;
  } else if (periodName === "Evening Peak") {
    directionFactor = isUpDirection ? 0.65 : 1.45;
  } else if (periodName === "Mid-Day") {
    directionFactor = isUpDirection ? 0.90 : 0.80;
  } else {
    directionFactor = 0.50;
  }

  const srcScore = getStationDemandScore(source);
  const dstScore = getStationDemandScore(destination);
  const segmentFactor = Math.min(1.5, 0.80 + (srcScore + dstScore) * 0.25);

  let classMultiplier = 1.0;
  if (travelClass === "First Class") classMultiplier = 0.55;
  if (travelClass === "AC Local") classMultiplier = 0.38;

  let coachCount = 12;
  const isFastService = trainService?.type?.toLowerCase().includes("fast") || trainId.toLowerCase().includes("fast");
  const trainNum = parseInt(trainId.replace(/\D/g, "")) || 0;
  if ((line === "Central" || line === "Western") && isFastService && trainNum % 2 === 1) {
    coachCount = 15;
  } else if (trainService && trainService.coachCount === 15) {
    coachCount = 15;
  }

  const coaches = [];
  let totalPassengers = 0;
  let totalCapacity = 0;

  for (let i = 1; i <= coachCount; i++) {
    const coachNumber = `C${i}`;
    let coachType = "General";
    let baseCapacity = 450;

    if (coachCount === 12) {
      if (i === 2 || i === 6 || i === 10) {
        coachType = "Ladies";
        baseCapacity = 450;
      } else if (i === 12) {
        coachType = "Luggage / Vendors";
        baseCapacity = 320;
      } else if (i === 1) {
        coachType = "General / Divyangjan";
        baseCapacity = 430;
      } else if (travelClass === "First Class" && (i === 4 || i === 8)) {
        coachType = "First Class";
        baseCapacity = 200;
      }
    } else {
      if (i === 2 || i === 6 || i === 10 || i === 14) {
        coachType = "Ladies";
        baseCapacity = 450;
      } else if (i === 15) {
        coachType = "Luggage / Vendors";
        baseCapacity = 320;
      } else if (i === 1) {
        coachType = "General / Divyangjan";
        baseCapacity = 430;
      } else if (travelClass === "First Class" && (i === 4 || i === 8 || i === 12)) {
        coachType = "First Class";
        baseCapacity = 200;
      }
    }

    if (travelClass === "AC Local") {
      baseCapacity = 160;
    }

    let platformWeight = 1.0;
    const midPoint = (coachCount + 1) / 2;
    const distFromCenter = Math.abs(i - midPoint);
    if (distFromCenter <= 1.5) {
      platformWeight = 1.25;
    } else if (distFromCenter <= 3.5) {
      platformWeight = 1.05;
    } else {
      platformWeight = 0.85;
    }

    const coachVar = ((seedHash + i * 19) % 13) - 6;
    const demandMultiplier = (timeFactor * 0.40) + (directionFactor * 0.35) + (segmentFactor * 0.25);
    const targetLoadRatio = demandMultiplier * classMultiplier * platformWeight;
    const rawPassengers = Math.round(baseCapacity * 0.65 * targetLoadRatio + coachVar);
    const passengers = Math.max(12, Math.min(baseCapacity, rawPassengers));
    const occupancyPct = Math.min(100, Math.max(8, Math.round((passengers / baseCapacity) * 100)));

    totalPassengers += passengers;
    totalCapacity += baseCapacity;

    coaches.push({
      coach_number: coachNumber,
      passengers,
      capacity: baseCapacity,
      occupancyPct,
      coach_type: coachType,
      occupancy_level: occupancyPct <= 50 ? "LOW" : occupancyPct <= 75 ? "MEDIUM" : "HIGH"
    });
  }

  const overallOccupancyPct = totalCapacity > 0 ? Math.round((totalPassengers / totalCapacity) * 100) : 0;
  const sortedCoaches = [...coaches].sort((a, b) => a.occupancyPct - b.occupancyPct);
  const leastCrowded = sortedCoaches[0];
  const mostCrowded = sortedCoaches[sortedCoaches.length - 1];

  let recommendedBoarding = "Front Platform Area (Coaches C1–C4)";
  if (leastCrowded) {
    const coachNum = parseInt(leastCrowded.coach_number.replace(/\D/g, "")) || 1;
    if (coachCount === 15) {
      if (coachNum <= 5) recommendedBoarding = "Front Platform Area (Coaches C1–C5)";
      else if (coachNum <= 10) recommendedBoarding = "Middle Platform Area (Coaches C6–C10)";
      else recommendedBoarding = "Rear Platform Area (Coaches C11–C15)";
    } else {
      if (coachNum <= 4) recommendedBoarding = "Front Platform Area (Coaches C1–C4)";
      else if (coachNum <= 8) recommendedBoarding = "Middle Platform Area (Coaches C5–C8)";
      else recommendedBoarding = "Rear Platform Area (Coaches C9–C12)";
    }
  }

  return {
    trainId,
    source,
    destination,
    travelClass,
    line,
    direction: isUpDirection ? "UP" : "DOWN",
    coachCount,
    coaches,
    overallOccupancyPct,
    totalPassengers,
    totalCapacity,
    leastCrowded,
    mostCrowded,
    recommendedBoarding,
    isEstimated: true
  };
}

const testJourneys = [
  { line: "Central", src: "Thane", dst: "Dadar", trainId: "CR_1001" },
  { line: "Central", src: "Thane", dst: "CSMT", trainId: "CR_1003" },
  { line: "Central", src: "Ghatkopar", dst: "Dadar", trainId: "CR_1005" },
  { line: "Central", src: "Ghatkopar", dst: "CSMT", trainId: "CR_1007" },
  { line: "Central", src: "CSMT", dst: "Thane", trainId: "CR_1002" },
  { line: "Central", src: "Kalyan", dst: "CSMT", trainId: "CR_1009" },

  { line: "Western", src: "Andheri", dst: "Borivali", trainId: "WR_2001" },
  { line: "Western", src: "Borivali", dst: "Churchgate", trainId: "WR_2003" },
  { line: "Western", src: "Churchgate", dst: "Andheri", trainId: "WR_2002" },
  { line: "Western", src: "Bandra", dst: "Andheri", trainId: "WR_2005" },
  { line: "Western", src: "Andheri", dst: "Churchgate", trainId: "WR_2007" },

  { line: "Harbour", src: "CSMT", dst: "Vashi", trainId: "HR_3001" },
  { line: "Harbour", src: "Vashi", dst: "CSMT", trainId: "HR_3002" },
  { line: "Harbour", src: "CSMT", dst: "Panvel", trainId: "HR_3003" },
  { line: "Harbour", src: "Panvel", dst: "CSMT", trainId: "HR_3004" },

  { line: "Cross-Line", src: "Bandra", dst: "Thane", trainId: "WR_2009" },
  { line: "Cross-Line", src: "Thane", dst: "Airoli", trainId: "TH_4001" }
];

const dateMorning = new Date("2026-10-06T08:30:00+05:30");
console.log("=== MORNING PEAK (08:30 IST) RESULTS ===");
testJourneys.forEach(j => {
  const res = calculateCoachOccupancy({ trainId: j.trainId, source: j.src, destination: j.dst, referenceDate: dateMorning });
  console.log(`[${j.line}] ${j.src} -> ${j.dst} (${j.trainId}) | Dir: ${res.direction} | Coaches: ${res.coachCount} | Overall: ${res.overallOccupancyPct}% | Least: ${res.leastCrowded.coach_number} (${res.leastCrowded.occupancyPct}%) | Most: ${res.mostCrowded.coach_number} (${res.mostCrowded.occupancyPct}%) | Rec: ${res.recommendedBoarding}`);
});

const dateEvening = new Date("2026-10-06T18:30:00+05:30");
console.log("\n=== EVENING PEAK (18:30 IST) RESULTS ===");
testJourneys.forEach(j => {
  const res = calculateCoachOccupancy({ trainId: j.trainId, source: j.src, destination: j.dst, referenceDate: dateEvening });
  console.log(`[${j.line}] ${j.src} -> ${j.dst} (${j.trainId}) | Dir: ${res.direction} | Coaches: ${res.coachCount} | Overall: ${res.overallOccupancyPct}% | Least: ${res.leastCrowded.coach_number} (${res.leastCrowded.occupancyPct}%) | Most: ${res.mostCrowded.coach_number} (${res.mostCrowded.occupancyPct}%) | Rec: ${res.recommendedBoarding}`);
});
