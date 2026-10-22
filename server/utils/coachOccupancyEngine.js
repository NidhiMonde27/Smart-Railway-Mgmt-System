/**
 * Complete Station-by-Station, Direction-Aware Coach Occupancy & Dynamic Boarding Engine (Server Version)
 *
 * Simulates passenger accumulation (boarding - alighting) across every station
 * along the train's route based on:
 * - Full station sequences for Central Main Line, Kalyan-Kasara, Kalyan-Khopoli, Western, Harbour, Trans-Harbour
 * - UP vs DOWN travel direction
 * - Time of day in Asia/Kolkata (Morning Peak, Mid-Day, Evening Peak, Late Night)
 * - Service pattern (Slow vs Fast Local stopping patterns)
 * - Coach categories (Second Class, First Class, Ladies, Divyangjan, Vendor)
 * - 12-Coach vs 15-Coach train composition & platform FOB positioning weights
 */

// Centralized Station Demand Weight Registry
const STATION_DEMAND_REGISTRY = {
  // Major City Termini & Hubs
  "csmt": 1.5, "churchgate": 1.5, "dadar": 1.5, "kurla": 1.45, "thane": 1.45,
  "kalyan": 1.4, "andheri": 1.45, "borivali": 1.4, "ghatkopar": 1.35, "bandra": 1.35,
  "vashi": 1.35, "panvel": 1.35, "dombivli": 1.3, "virar": 1.35,
  // Secondary Hubs & Branch Junctions
  "badlapur": 1.25, "titwala": 1.25, "ambernath": 1.25, "asangaon": 1.2,
  "kasara": 1.25, "karjat": 1.25, "khopoli": 1.15, "goregaon": 1.2,
  "chembur": 1.15, "nerul": 1.15, "cbd belapur": 1.15, "seawoods-darave": 1.15,
  "vasai road": 1.25, "nallasopara": 1.25, "bhayandar": 1.2, "mulund": 1.15,
  "bhandup": 1.1, "vikhroli": 1.1, "sion": 1.1, "byculla": 1.15, "mumbai central": 1.2,
  "grant road": 1.1, "charni road": 1.0, "marine lines": 0.95,
  // Intermediate Suburban Stations
  "masjid": 0.9, "sandhurst road": 0.85, "chinchpokli": 0.8, "currey road": 0.8,
  "parel": 0.9, "matunga": 0.85, "vidyavihar": 0.8, "kanjurmarg": 0.85, "nahur": 0.85,
  "kalwa": 0.9, "mumbra": 0.95, "diva junction": 1.0, "kopar": 0.8, "thakurli": 0.85,
  "vithalwadi": 0.9, "ulhasnagar": 0.95, "chikhloli": 0.75, "vangani": 0.7, "shelu": 0.7,
  "neral": 0.85, "bhivpuri road": 0.7, "palasdhari": 0.65, "kelavli": 0.6, "dolavli": 0.6,
  "lowjee": 0.6, "shahad": 0.85, "ambivli": 0.85, "khadavli": 0.8, "vasind": 0.75,
  "atgaon": 0.7, "thansit": 0.6, "khardi": 0.65, "umbermali": 0.6,
};

function getStationDemandScore(stationName) {
  if (!stationName) return 0.85;
  const norm = stationName.trim().toLowerCase()
    .replace(/ metro/g, "").replace(/ junction/g, "").replace(/ road/g, "").replace(/ station/g, "");
  return STATION_DEMAND_REGISTRY[norm] || 0.85;
}

// Full Ordered Station Sequences for all Suburban Corridors
const CORRIDOR_STATION_SEQUENCES = {
  centralMain: [
    "CSMT", "Masjid", "Sandhurst Road", "Byculla", "Chinchpokli", "Currey Road",
    "Parel", "Dadar", "Matunga", "Sion", "Kurla", "Vidyavihar", "Ghatkopar",
    "Vikhroli", "Kanjurmarg", "Bhandup", "Nahur", "Mulund", "Thane", "Kalwa",
    "Mumbra", "Diva Junction", "Kopar", "Dombivli", "Thakurli", "Kalyan"
  ],
  kalyanKasara: [
    "Kalyan", "Shahad", "Ambivli", "Titwala", "Khadavli", "Vasind",
    "Asangaon", "Atgaon", "Thansit", "Khardi", "Umbermali", "Kasara"
  ],
  kalyanKhopoli: [
    "Kalyan", "Vithalwadi", "Ulhasnagar", "Ambernath", "Chikhloli", "Badlapur",
    "Vangani", "Shelu", "Neral", "Bhivpuri Road", "Karjat", "Palasdhari",
    "Kelavli", "Dolavli", "Lowjee", "Khopoli"
  ],
  western: [
    "Churchgate", "Marine Lines", "Charni Road", "Grant Road", "Mumbai Central",
    "Mahalaxmi", "Lower Parel", "Prabhadevi", "Dadar", "Matunga Road", "Mahim",
    "Bandra", "Khar Road", "Santacruz", "Vile Parle", "Andheri", "Jogeshwari",
    "Ram Mandir", "Goregaon", "Malad", "Kandivali", "Borivali", "Dahisar",
    "Mira Road", "Bhayandar", "Naigaon", "Vasai Road", "Nallasopara", "Virar",
    "Vaitarna", "Saphale", "Kelve Road", "Palghar", "Umroli", "Boisar", "Vangaon", "Dahanu Road"
  ],
  harbour: [
    "CSMT", "Masjid", "Sandhurst Road", "Dockyard Road", "Reay Road", "Cotton Green",
    "Sewri", "Wadala Road", "GTB Nagar", "Chunabhatti", "Kurla", "Tilak Nagar",
    "Chembur", "Govandi", "Mankhurd", "Vashi", "Sanpada", "Juinagar", "Nerul",
    "Seawoods-Darave", "CBD Belapur", "Kharghar", "Mansarovar", "Khandeshwar", "Panvel"
  ],
  transHarbour: [
    "Thane", "Digha Gaon", "Airoli", "Rabale", "Ghansoli", "Koparkhairane",
    "Turbhe", "Sanpada", "Vashi", "Juinagar", "Nerul", "CBD Belapur",
    "Seawoods-Darave", "Kharghar", "Panvel"
  ]
};

// Fast Train Skip Rules
const FAST_TRAIN_STOPS = {
  central: ["CSMT", "Byculla", "Dadar", "Kurla", "Ghatkopar", "Vikhroli", "Bhandup", "Mulund", "Thane", "Dombivli", "Kalyan"],
  western: ["Churchgate", "Mumbai Central", "Dadar", "Bandra", "Andheri", "Borivali", "Bhayandar", "Vasai Road", "Virar"],
};

function normName(s) {
  if (!s) return "";
  return s.trim().toLowerCase()
    .replace(/ metro/g, "").replace(/ junction/g, "").replace(/ road/g, "").replace(/ station/g, "");
}

function resolveFullTrainRoute(source, destination, line = "Central", serviceType = "Slow Local") {
  const nSrc = normName(source);
  const nDst = normName(destination);

  let sequence = [];

  if (line === "Central") {
    const isKasaraBranch = CORRIDOR_STATION_SEQUENCES.kalyanKasara.some(s => normName(s) === nSrc || normName(s) === nDst);
    const isKhopoliBranch = CORRIDOR_STATION_SEQUENCES.kalyanKhopoli.some(s => normName(s) === nSrc || normName(s) === nDst);

    let mainSeq = [...CORRIDOR_STATION_SEQUENCES.centralMain];
    if (isKasaraBranch) {
      sequence = [...mainSeq, ...CORRIDOR_STATION_SEQUENCES.kalyanKasara.slice(1)];
    } else if (isKhopoliBranch) {
      sequence = [...mainSeq, ...CORRIDOR_STATION_SEQUENCES.kalyanKhopoli.slice(1)];
    } else {
      sequence = mainSeq;
    }
  } else if (line === "Western") {
    sequence = [...CORRIDOR_STATION_SEQUENCES.western];
  } else if (line === "Harbour") {
    sequence = [...CORRIDOR_STATION_SEQUENCES.harbour];
  } else if (line === "Trans-Harbour") {
    sequence = [...CORRIDOR_STATION_SEQUENCES.transHarbour];
  } else {
    sequence = [...CORRIDOR_STATION_SEQUENCES.centralMain];
  }

  // Handle Fast Local stopping pattern
  const isFast = serviceType && serviceType.toLowerCase().includes("fast");
  if (isFast) {
    const fastList = FAST_TRAIN_STOPS[line.toLowerCase()] || [];
    if (fastList.length > 0) {
      sequence = sequence.filter((stn, idx) => {
        const isFastStop = fastList.some(fs => normName(fs) === normName(stn));
        const isEnd = idx === 0 || idx === sequence.length - 1;
        const isUserStation = normName(stn) === nSrc || normName(stn) === nDst;
        return isFastStop || isEnd || isUserStation;
      });
    }
  }

  // Fallback: Ensure source and destination exist in sequence
  let srcIdx = sequence.findIndex(s => normName(s) === nSrc);
  let dstIdx = sequence.findIndex(s => normName(s) === nDst);

  if (srcIdx === -1 && source) sequence.unshift(source);
  if (dstIdx === -1 && destination) sequence.push(destination);

  return sequence;
}

function buildTrainCoachFormation(line, type, trainIdNum = 0) {
  const isAC = type && type.includes("AC");
  const isFast = type && type.includes("Fast");
  const is15Coach = (line === "Central" || line === "Western") && (trainIdNum % 2 === 1 || (type && type.includes("15")));

  if (isAC) {
    const totalCoaches = 12;
    const formation = [];
    for (let i = 1; i <= totalCoaches; i++) {
      const isLadies = i === 2 || i === 6 || i === 10;
      formation.push({
        coachNumber: `C${i}`,
        category: isLadies ? "AC Ladies" : "AC Local",
        code: isLadies ? "AC-LADIES" : "AC",
        class: "AC Local",
        capacity: 160,
        isRestricted: isLadies,
      });
    }
    return { coachCount: totalCoaches, formation };
  }

  if (is15Coach) {
    const totalCoaches = 15;
    const formation = [];
    for (let i = 1; i <= totalCoaches; i++) {
      let category = "Second Class";
      let code = "SC";
      let coachClass = "Second Class";
      let capacity = 450;
      let isRestricted = false;

      if (i === 1) {
        category = "General / Divyangjan";
        code = "SC/DIV";
        capacity = 430;
      } else if (i === 2 || i === 6 || i === 10 || i === 14) {
        category = "Ladies";
        code = "LADIES";
        isRestricted = true;
      } else if (i === 4 || i === 8 || i === 12) {
        category = "First Class";
        code = "FC";
        coachClass = "First Class";
        capacity = 200;
      } else if (i === 15) {
        category = "Luggage / Vendors";
        code = "VENDOR";
        capacity = 320;
        isRestricted = true;
      }

      formation.push({
        coachNumber: `C${i}`,
        category,
        code,
        class: coachClass,
        capacity,
        isRestricted,
      });
    }
    return { coachCount: totalCoaches, formation };
  }

  // Standard 12-Coach Non-AC Local
  const totalCoaches = 12;
  const formation = [];
  for (let i = 1; i <= totalCoaches; i++) {
    let category = "Second Class";
    let code = "SC";
    let coachClass = "Second Class";
    let capacity = 450;
    let isRestricted = false;

    if (i === 1) {
      category = "General / Divyangjan";
      code = "SC/DIV";
      capacity = 430;
    } else if (i === 2 || i === 6 || i === 10) {
      category = "Ladies";
      code = "LADIES";
      isRestricted = true;
    } else if (i === 4 || i === 8) {
      category = "First Class";
      code = "FC";
      coachClass = "First Class";
      capacity = 200;
    } else if (i === 12) {
      category = "Luggage / Vendors";
      code = "VENDOR";
      capacity = 320;
      isRestricted = true;
    }

    formation.push({
      coachNumber: `C${i}`,
      category,
      code,
      class: coachClass,
      capacity,
      isRestricted,
    });
  }
  return { coachCount: totalCoaches, formation };
}

/**
 * Main Server Coach Occupancy Function
 */
function calculateCoachOccupancy({
  trainId = "CR_1001",
  source = "Thane",
  destination = "Dadar",
  travelClass = "Second Class",
  referenceDate = new Date(),
  trainService = null
}) {
  const serviceType = trainService?.type || (trainId.includes("AC") ? "AC Local" : trainId.includes("Fast") ? "Fast Local" : "Slow Local");

  let line = trainService?.line || "Central";
  if (!trainService?.line) {
    if (trainId.startsWith("WR")) line = "Western";
    else if (trainId.startsWith("HR")) line = "Harbour";
    else if (trainId.startsWith("TH")) line = "Trans-Harbour";
  }

  // 1. Obtain full ordered train route
  const fullRoute = resolveFullTrainRoute(source, destination, line, serviceType);

  const normSrc = normName(source);
  const normDst = normName(destination);

  let srcIdx = fullRoute.findIndex(s => normName(s) === normSrc);
  let dstIdx = fullRoute.findIndex(s => normName(s) === normDst);

  if (srcIdx === -1) srcIdx = 0;
  if (dstIdx === -1) dstIdx = fullRoute.length - 1;

  // 2. Determine UP vs DOWN travel direction
  const isUpDirection = srcIdx > dstIdx;
  const direction = isUpDirection ? "UP" : "DOWN";

  // Sequence of stations in direction of train motion
  const directionalRoute = isUpDirection ? [...fullRoute].reverse() : fullRoute;
  const totalRouteStations = directionalRoute.length;

  const motionSrcIdx = directionalRoute.findIndex(s => normName(s) === normSrc);
  const motionDstIdx = directionalRoute.findIndex(s => normName(s) === normDst);

  // 3. Time of Day in Asia/Kolkata (IST)
  const now = referenceDate ? new Date(referenceDate) : new Date();
  const utcHours = now.getUTCHours();
  const utcMins = now.getUTCMinutes();
  const istTotalMinutes = (utcHours * 60 + utcMins + 330) % 1440;

  let timeFactor = 0.65;
  let periodName = "Mid-Day";

  if (istTotalMinutes >= 420 && istTotalMinutes <= 660) {
    timeFactor = 1.45; // Morning Peak (07:00 - 11:00)
    periodName = "Morning Peak";
  } else if (istTotalMinutes > 660 && istTotalMinutes < 1020) {
    timeFactor = 0.65; // Mid-Day (11:00 - 17:00)
    periodName = "Mid-Day";
  } else if (istTotalMinutes >= 1020 && istTotalMinutes <= 1260) {
    timeFactor = 1.50; // Evening Peak (17:00 - 21:00)
    periodName = "Evening Peak";
  } else {
    timeFactor = 0.40; // Late Night (21:00 - 07:00)
    periodName = "Late Night";
  }

  // 4. Resolve Coach Formation Specs
  let coachSpecs = trainService?.coachFormation;
  const trainNum = parseInt(trainId.replace(/\D/g, "")) || 0;
  if (!coachSpecs || !Array.isArray(coachSpecs) || coachSpecs.length === 0) {
    const { formation } = buildTrainCoachFormation(line, serviceType, trainNum);
    coachSpecs = formation;
  }
  const coachCount = coachSpecs.length;

  // 5. Simulate Station-by-Station Passenger Accumulation
  const routeStationSim = [];

  const coachPassengersCurrent = coachSpecs.map(spec => {
    const baseCap = spec.capacity || 450;
    const isFC = (spec.class || "").includes("First Class");
    const isAC = (spec.class || "").includes("AC Local");

    let classMult = 1.0;
    if (travelClass === "First Class" || isFC) classMult = 0.55;
    if (travelClass === "AC Local" || isAC) classMult = 0.38;

    let initLoadRatio = 0.45;
    if (periodName === "Morning Peak") {
      initLoadRatio = isUpDirection ? 0.70 : 0.35;
    } else if (periodName === "Evening Peak") {
      initLoadRatio = isUpDirection ? 0.35 : 0.75;
    }

    const initPax = Math.round(baseCap * initLoadRatio * classMult);
    return Math.max(12, Math.min(baseCap, initPax));
  });

  for (let sIdx = 0; sIdx < totalRouteStations; sIdx++) {
    const stnName = directionalRoute[sIdx];
    const stnScore = getStationDemandScore(stnName);
    const progress = sIdx / Math.max(1, totalRouteStations - 1);
    const isMajorHub = stnScore >= 1.3;

    let bRate = 0.15;
    let aRate = 0.15;

    if (periodName === "Morning Peak") {
      if (isUpDirection) {
        bRate = Math.max(0.08, (1.0 - progress * 0.7)) * stnScore * 0.30 * timeFactor;
        aRate = (progress * 0.50 + (isMajorHub ? 0.25 : 0.05)) * stnScore * 0.20;
      } else {
        bRate = 0.12 * stnScore * timeFactor * 0.6;
        aRate = 0.15 * stnScore;
      }
    } else if (periodName === "Evening Peak") {
      if (!isUpDirection) {
        bRate = Math.max(0.08, ((1.0 - progress) * 0.5 + (isMajorHub ? 0.30 : 0.05))) * stnScore * 0.32 * timeFactor;
        aRate = (progress * 0.60 + (isMajorHub ? 0.15 : 0.05)) * stnScore * 0.22;
      } else {
        bRate = 0.12 * stnScore * timeFactor * 0.6;
        aRate = 0.15 * stnScore;
      }
    } else {
      bRate = 0.16 * stnScore * timeFactor;
      aRate = 0.14 * stnScore * timeFactor;
    }

    const coachStepMetrics = [];

    for (let c = 0; c < coachCount; c++) {
      const spec = coachSpecs[c];
      const baseCapacity = spec.capacity || 450;
      const coachType = spec.category || "Second Class";

      let platformWeight = 1.0;
      const midPoint = (coachCount + 1) / 2;
      const distFromCenter = Math.abs((c + 1) - midPoint);
      if (distFromCenter <= 1.5) platformWeight = 1.25;
      else if (distFromCenter <= 3.5) platformWeight = 1.05;
      else platformWeight = 0.85;

      let maxCapMult = 1.60;
      let catWeight = 1.0;
      if (coachType.includes("First Class")) {
        catWeight = 0.55;
        maxCapMult = 1.25;
      } else if (coachType.includes("Ladies")) {
        catWeight = 0.85;
        maxCapMult = 1.45;
      } else if (coachType.includes("Divyangjan")) {
        catWeight = 0.40;
        maxCapMult = 1.20;
      } else if (coachType.includes("Vendors")) {
        catWeight = 0.65;
        maxCapMult = 1.35;
      }

      if (sIdx > 0) {
        const boarders = Math.round(baseCapacity * bRate * platformWeight * catWeight);
        const alighters = Math.min(coachPassengersCurrent[c], Math.round(coachPassengersCurrent[c] * aRate));
        coachPassengersCurrent[c] = Math.max(10, Math.min(Math.round(baseCapacity * maxCapMult), coachPassengersCurrent[c] + boarders - alighters));
      }

      const pax = coachPassengersCurrent[c];
      const occPct = Math.max(8, Math.round((pax / baseCapacity) * 100));

      coachStepMetrics.push({
        coach_number: spec.coachNumber || `C${c + 1}`,
        coach_type: coachType,
        coach_code: spec.code || "SC",
        coach_class: spec.class || "Second Class",
        is_restricted: !!spec.isRestricted,
        passengers: pax,
        capacity: baseCapacity,
        occupancyPct: occPct,
        occupancy_level: occPct <= 50 ? "LOW" : occPct <= 75 ? "MEDIUM" : "HIGH"
      });
    }

    const stepTotalPax = coachStepMetrics.reduce((acc, cm) => acc + cm.passengers, 0);
    const stepTotalCap = coachStepMetrics.reduce((acc, cm) => acc + cm.capacity, 0);
    const stepAvgOcc = stepTotalCap > 0 ? Math.round((stepTotalPax / stepTotalCap) * 100) : 0;

    routeStationSim.push({
      station: stnName,
      stationIndex: sIdx,
      overallOccupancyPct: stepAvgOcc,
      totalPassengers: stepTotalPax,
      totalCapacity: stepTotalCap,
      coaches: coachStepMetrics
    });
  }

  // 6. Extract Coach Results at User's Boarding Station (source)
  const boardingSimStep = routeStationSim.find(r => normName(r.station) === normSrc) || routeStationSim[0];
  const coachesAtBoarding = boardingSimStep ? boardingSimStep.coaches : [];

  const totalPassengers = coachesAtBoarding.reduce((acc, c) => acc + c.passengers, 0);
  const totalCapacity = coachesAtBoarding.reduce((acc, c) => acc + c.capacity, 0);
  const overallOccupancyPct = totalCapacity > 0 ? Math.round((totalPassengers / totalCapacity) * 100) : 0;

  const sortedCoaches = [...coachesAtBoarding].sort((a, b) => a.occupancyPct - b.occupancyPct);
  const leastCrowded = sortedCoaches[0];
  const mostCrowded = sortedCoaches[sortedCoaches.length - 1];

  let eligibleCoaches = coachesAtBoarding;
  if (travelClass === "First Class") {
    eligibleCoaches = coachesAtBoarding.filter(c => c.coach_class === "First Class" || c.coach_code === "FC");
  } else if (travelClass === "AC Local") {
    eligibleCoaches = coachesAtBoarding.filter(c => c.coach_class === "AC Local" || c.coach_code.startsWith("AC"));
  } else {
    eligibleCoaches = coachesAtBoarding.filter(c => !c.is_restricted && c.coach_class === "Second Class");
  }

  if (eligibleCoaches.length === 0) {
    eligibleCoaches = coachesAtBoarding.filter(c => !c.is_restricted);
  }
  if (eligibleCoaches.length === 0) {
    eligibleCoaches = coachesAtBoarding;
  }

  const sortedEligible = [...eligibleCoaches].sort((a, b) => a.occupancyPct - b.occupancyPct);
  const recCoach = sortedEligible[0] || coachesAtBoarding[0];
  const recCoachNum = parseInt(recCoach.coach_number.replace(/\D/g, "")) || 1;

  let platformZone = "Front Platform Area";
  if (coachCount === 15) {
    if (recCoachNum <= 5) platformZone = "Front Platform Area (Coaches C1–C5)";
    else if (recCoachNum <= 10) platformZone = "Middle Platform Area (Coaches C6–C10)";
    else platformZone = "Rear Platform Area (Coaches C11–C15)";
  } else {
    if (recCoachNum <= 4) platformZone = "Front Platform Area (Coaches C1–C4)";
    else if (recCoachNum <= 8) platformZone = "Middle Platform Area (Coaches C5–C8)";
    else platformZone = "Rear Platform Area (Coaches C9–C12)";
  }

  const recommendedBoarding = `Coach ${recCoach.coach_number} (${recCoach.coach_type}) • ${platformZone}`;

  const destinationTerminus = isUpDirection
    ? (line === "Western" ? "Churchgate" : "CSMT")
    : (line === "Western" ? "Virar" : line === "Harbour" ? "Panvel" : "Kasara/Khopoli");

  const minJourneyIdx = Math.min(motionSrcIdx, motionDstIdx);
  const maxJourneyIdx = Math.max(motionSrcIdx, motionDstIdx);
  const journeySegmentSim = routeStationSim.slice(
    minJourneyIdx !== -1 ? minJourneyIdx : 0,
    maxJourneyIdx !== -1 ? maxJourneyIdx + 1 : routeStationSim.length
  );

  return {
    trainId,
    source,
    destination,
    travelClass,
    line,
    direction,
    destinationTerminus,
    coachCount,
    coaches: coachesAtBoarding,
    overallOccupancyPct,
    totalPassengers,
    totalCapacity,
    leastCrowded,
    mostCrowded,
    recommendedBoarding,
    fullRoute,
    directionalRoute,
    routeStationSim,
    journeySegmentSim,
    periodName,
    isEstimated: true
  };
}

function generateRoutePeakAnalysis(source = "Thane", destination = "Dadar", referenceDate = new Date()) {
  const srcScore = getStationDemandScore(source);
  const dstScore = getStationDemandScore(destination);
  const nSrc = normName(source);
  const nDst = normName(destination);

  const isUp = nDst.includes("csmt") || nDst.includes("churchgate") || nDst.includes("dadar");
  const routeScale = Math.min(1.25, 0.75 + (srcScore + dstScore) * 0.18);

  const morningLoad = isUp ? Math.min(99, Math.round(94 * routeScale)) : Math.round(68 * routeScale);
  const eveningLoad = !isUp ? Math.min(99, Math.round(96 * routeScale)) : Math.round(72 * routeScale);

  const peakHourData = [
    { period: "Morning Peak", time: "07:00-11:00", avgLoad: morningLoad, incidents: isUp ? 12 : 5 },
    { period: "Mid-Day", time: "11:00-16:30", avgLoad: Math.round(62 * routeScale), incidents: 3 },
    { period: "Evening Peak", time: "17:00-21:00", avgLoad: eveningLoad, incidents: !isUp ? 18 : 7 },
    { period: "Late Night", time: "21:00-07:00", avgLoad: Math.round(42 * routeScale), incidents: 1 },
  ];

  const hourlyTrafficData = [
    { time: "05:00", passengers: Math.round(2800 * routeScale), capacity: 10000 },
    { time: "06:00", passengers: Math.round(8500 * routeScale), capacity: 10000 },
    { time: "07:00", passengers: Math.round(15000 * (morningLoad / 90)), capacity: 10000 },
    { time: "08:00", passengers: Math.round(18500 * (morningLoad / 90)), capacity: 10000 },
    { time: "09:00", passengers: Math.round(19200 * (morningLoad / 90)), capacity: 10000 },
    { time: "10:00", passengers: Math.round(12500 * (morningLoad / 90)), capacity: 10000 },
    { time: "11:00", passengers: Math.round(9800 * routeScale), capacity: 10000 },
    { time: "12:00", passengers: Math.round(8200 * routeScale), capacity: 10000 },
    { time: "13:00", passengers: Math.round(7500 * routeScale), capacity: 10000 },
    { time: "14:00", passengers: Math.round(6800 * routeScale), capacity: 10000 },
    { time: "15:00", passengers: Math.round(8500 * routeScale), capacity: 10000 },
    { time: "16:00", passengers: Math.round(11200 * routeScale), capacity: 10000 },
    { time: "17:00", passengers: Math.round(16800 * (eveningLoad / 90)), capacity: 10000 },
    { time: "18:00", passengers: Math.round(19800 * (eveningLoad / 90)), capacity: 10000 },
    { time: "19:00", passengers: Math.round(18500 * (eveningLoad / 90)), capacity: 10000 },
    { time: "20:00", passengers: Math.round(14200 * (eveningLoad / 90)), capacity: 10000 },
    { time: "21:00", passengers: Math.round(10500 * routeScale), capacity: 10000 },
    { time: "22:00", passengers: Math.round(6200 * routeScale), capacity: 10000 },
  ];

  return { peakHourData, hourlyTrafficData };
}

module.exports = {
  calculateCoachOccupancy,
  generateRoutePeakAnalysis,
  getStationDemandScore,
  resolveFullTrainRoute,
  CORRIDOR_STATION_SEQUENCES,
};
