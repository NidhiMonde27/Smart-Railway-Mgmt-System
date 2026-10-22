/**
 * Comprehensive Timetable Dataset & Search Engine for Mumbai Suburban Railway & Metro
 * Lines Covered: Central, Western, Harbour, Trans-Harbour, Metro Line 1, Metro Line 3
 * Timezone: Asia/Kolkata
 */

import { getKolkataDateParts } from "./ticketUtils.js";
import { getAllStations } from "./allStations.js";

/**
 * Normalizes station names for flexible matching (e.g. "Andheri" matches "Andheri Metro")
 */
export const normalizeStationName = (name) => {
  if (!name) return "";
  let s = name.trim().toLowerCase();
  s = s
    .replace(/ metro/g, "")
    .replace(/ junction/g, "")
    .replace(/ m3/g, "")
    .replace(/ road/g, "")
    .replace(/ station/g, "");
  if (s === "seawood") return "seawoods-darave";
  if (s === "diva") return "diva junction";
  if (s === "cstm" || s === "csmt") return "csmt";
  return s;
};

// Generated Schedule Services Template spanning 04:00 to 23:55 IST
const generateTimetableData = () => {
  const services = [];

  // 1. Central Line Services (CSMT <-> Kalyan / Kasara / Khopoli)
  const centralMainStns = [
    "CSMT", "Masjid", "Sandhurst Road", "Byculla", "Chinchpokli", "Currey Road",
    "Parel", "Dadar", "Matunga", "Sion", "Kurla", "Vidyavihar", "Ghatkopar",
    "Vikhroli", "Kanjurmarg", "Bhandup", "Nahur", "Mulund", "Thane", "Kalwa",
    "Mumbra", "Diva Junction", "Kopar", "Dombivli", "Thakurli", "Kalyan"
  ];

  const centralKasaraStns = [
    ...centralMainStns, "Shahad", "Ambivli", "Titwala", "Khadavli", "Vasind",
    "Asangaon", "Atgaon", "Tanshet", "Khardi", "Umbermali", "Kasara"
  ];

  const centralKhopoliStns = [
    ...centralMainStns, "Vitthalwadi", "Ulhasnagar", "Ambernath", "Chikhloli",
    "Badlapur", "Vangani", "Shelu", "Neral Junction", "Bhivpuri Road", "Karjat",
    "Palasdari", "Kelavli", "Dolavli", "Lowjee", "Khopoli"
  ];

  // Generate Central Down (CSMT -> Kasara/Khopoli/Kalyan) every 15 mins
  let cId = 1000;
  for (let hour = 4; hour <= 23; hour++) {
    for (let min of [5, 20, 35, 50]) {
      cId++;
      const isFast = min % 30 === 0;
      const isKasara = min === 20;
      const isKhopoli = min === 50;
      const routeStns = isKasara ? centralKasaraStns : isKhopoli ? centralKhopoliStns : centralMainStns;

      const stops = [];
      let currentMinutes = hour * 60 + min;

      routeStns.forEach((stn) => {
        if (isFast && ["Chinchpokli", "Currey Road", "Parel", "Matunga", "Vidyavihar", "Kanjurmarg", "Nahur", "Kalwa", "Mumbra", "Kopar", "Thakurli"].includes(stn)) {
          return;
        }

        const h = Math.floor(currentMinutes / 60) % 24;
        const m = currentMinutes % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        stops.push({ station: stn, time: timeStr });
        currentMinutes += isFast ? 2 : 3;
      });

      services.push({
        train_id: `CR_${cId}`,
        name: `Train CR-${cId} (${isKasara ? "CSMT - Kasara" : isKhopoli ? "CSMT - Khopoli" : "CSMT - Kalyan"} ${isFast ? "Fast" : "Slow"})`,
        line: "Central",
        type: isFast ? "Fast Local" : "Slow Local",
        classSupport: ["Second Class", "First Class"],
        stops,
      });
    }
  }

  // Generate Central Up (Kasara/Khopoli/Kalyan -> CSMT) every 15 mins
  for (let hour = 4; hour <= 23; hour++) {
    for (let min of [10, 25, 40, 55]) {
      cId++;
      const isFast = min % 30 === 0;
      const isKasara = min === 25;
      const isKhopoli = min === 55;
      const routeStns = [...(isKasara ? centralKasaraStns : isKhopoli ? centralKhopoliStns : centralMainStns)].reverse();

      const stops = [];
      let currentMinutes = hour * 60 + min;

      routeStns.forEach((stn) => {
        if (isFast && ["Chinchpokli", "Currey Road", "Parel", "Matunga", "Vidyavihar", "Kanjurmarg", "Nahur", "Kalwa", "Mumbra", "Kopar", "Thakurli"].includes(stn)) {
          return;
        }

        const h = Math.floor(currentMinutes / 60) % 24;
        const m = currentMinutes % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        stops.push({ station: stn, time: timeStr });
        currentMinutes += isFast ? 2 : 3;
      });

      services.push({
        train_id: `CR_${cId}`,
        name: `Train CR-${cId} (${isKasara ? "Kasara - CSMT" : isKhopoli ? "Khopoli - CSMT" : "Kalyan - CSMT"} ${isFast ? "Fast" : "Slow"})`,
        line: "Central",
        type: isFast ? "Fast Local" : "Slow Local",
        classSupport: ["Second Class", "First Class"],
        stops,
      });
    }
  }

  // 2. Western Line Services (Churchgate <-> Virar / Dahanu Road)
  const westernStns = [
    "Churchgate", "Marine Lines", "Charni Road", "Grant Road", "Mumbai Central",
    "Mahalaxmi", "Lower Parel", "Prabhadevi", "Dadar", "Matunga Road", "Mahim",
    "Bandra", "Khar Road", "Santacruz", "Vile Parle", "Andheri", "Jogeshwari",
    "Ram Mandir", "Goregaon", "Malad", "Kandivali", "Borivali", "Dahisar",
    "Mira Road", "Bhayandar", "Naigaon", "Vasai Road", "Nallasopara", "Virar",
    "Vaitarna", "Saphale", "Kelve Road", "Palghar", "Umroli", "Boisar", "Vangaon", "Dahanu Road"
  ];

  let wId = 2000;
  // Western Down (Churchgate -> Virar/Dahanu Road)
  for (let hour = 4; hour <= 23; hour++) {
    for (let min of [0, 15, 30, 45]) {
      wId++;
      const isFast = min === 15 || min === 45;
      const isAC = min === 30;
      const isDahanu = min === 45;
      const endIdx = isDahanu ? westernStns.length : 29; // Virar = 29
      const routeStns = westernStns.slice(0, endIdx);

      const stops = [];
      let currentMinutes = hour * 60 + min;

      routeStns.forEach((stn) => {
        if (isFast && ["Marine Lines", "Charni Road", "Grant Road", "Mahalaxmi", "Lower Parel", "Matunga Road", "Mahim", "Khar Road", "Santacruz", "Vile Parle", "Jogeshwari", "Ram Mandir"].includes(stn)) {
          return;
        }

        const h = Math.floor(currentMinutes / 60) % 24;
        const m = currentMinutes % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        stops.push({ station: stn, time: timeStr });
        currentMinutes += isFast ? 2 : 3;
      });

      services.push({
        train_id: `WR_${wId}`,
        name: `Train WR-${wId} (${isDahanu ? "Churchgate - Dahanu" : "Churchgate - Virar"} ${isAC ? "AC" : isFast ? "Fast" : "Slow"})`,
        line: "Western",
        type: isAC ? "AC Local" : isFast ? "Fast Local" : "Slow Local",
        classSupport: isAC ? ["AC Local", "First Class"] : ["Second Class", "First Class"],
        stops,
      });
    }
  }

  // Western Up (Virar/Dahanu -> Churchgate)
  for (let hour = 4; hour <= 23; hour++) {
    for (let min of [8, 23, 38, 53]) {
      wId++;
      const isFast = min === 23 || min === 53;
      const isAC = min === 38;
      const routeStns = [...westernStns.slice(0, 29)].reverse();

      const stops = [];
      let currentMinutes = hour * 60 + min;

      routeStns.forEach((stn) => {
        if (isFast && ["Marine Lines", "Charni Road", "Grant Road", "Mahalaxmi", "Lower Parel", "Matunga Road", "Mahim", "Khar Road", "Santacruz", "Vile Parle", "Jogeshwari", "Ram Mandir"].includes(stn)) {
          return;
        }

        const h = Math.floor(currentMinutes / 60) % 24;
        const m = currentMinutes % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        stops.push({ station: stn, time: timeStr });
        currentMinutes += isFast ? 2 : 3;
      });

      services.push({
        train_id: `WR_${wId}`,
        name: `Train WR-${wId} (Virar - Churchgate ${isAC ? "AC" : isFast ? "Fast" : "Slow"})`,
        line: "Western",
        type: isAC ? "AC Local" : isFast ? "Fast Local" : "Slow Local",
        classSupport: isAC ? ["AC Local", "First Class"] : ["Second Class", "First Class"],
        stops,
      });
    }
  }

  // 3. Harbour Line Services (CSMT <-> Panvel & CSMT <-> Goregaon)
  const harbourPanvelStns = [
    "CSMT", "Masjid", "Sandhurst Road", "Dockyard Road", "Reay Road", "Cotton Green",
    "Sewri", "Wadala Road", "GTB Nagar", "Chunabhatti", "Kurla", "Tilak Nagar",
    "Chembur", "Govandi", "Mankhurd", "Vashi", "Sanpada", "Juinagar", "Nerul",
    "Seawoods-Darave", "CBD Belapur", "Kharghar", "Mansarovar", "Khandeshwar", "Panvel"
  ];

  let hId = 3000;
  for (let hour = 4; hour <= 23; hour++) {
    for (let min of [12, 32, 52]) {
      hId++;
      const stops = [];
      let currentMinutes = hour * 60 + min;

      harbourPanvelStns.forEach((stn) => {
        const h = Math.floor(currentMinutes / 60) % 24;
        const m = currentMinutes % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        stops.push({ station: stn, time: timeStr });
        currentMinutes += 2.5;
      });

      services.push({
        train_id: `HR_${hId}`,
        name: `Train HR-${hId} (CSMT - Panvel Local)`,
        line: "Harbour",
        type: "Slow Local",
        classSupport: ["Second Class", "First Class"],
        stops,
      });
    }
  }

  // Harbour Goregaon Branch (CSMT <-> Goregaon via Wadala Road & Mahim)
  const harbourGoregaonStns = [
    "CSMT", "Masjid", "Sandhurst Road", "Dockyard Road", "Reay Road", "Cotton Green",
    "Sewri", "Wadala Road", "Kings Circle", "Mahim", "Bandra", "Khar Road",
    "Santacruz", "Vile Parle", "Andheri", "Jogeshwari", "Ram Mandir", "Goregaon"
  ];

  for (let hour = 5; hour <= 22; hour++) {
    for (let min of [18, 48]) {
      hId++;
      const stops = [];
      let currentMinutes = hour * 60 + min;

      harbourGoregaonStns.forEach((stn) => {
        const h = Math.floor(currentMinutes / 60) % 24;
        const m = currentMinutes % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        stops.push({ station: stn, time: timeStr });
        currentMinutes += 2.5;
      });

      services.push({
        train_id: `HR_${hId}`,
        name: `Train HR-${hId} (CSMT - Goregaon Harbour)`,
        line: "Harbour",
        type: "Slow Local",
        classSupport: ["Second Class", "First Class"],
        stops,
      });
    }
  }

  // 4. Trans-Harbour Line Services (Thane <-> Panvel / Vashi / Juinagar)
  const transHarbourStns = [
    "Thane", "Digha Gaon", "Airoli", "Rabale", "Ghansoli", "Koparkhairane",
    "Turbhe", "Sanpada", "Vashi", "Juinagar", "Nerul", "Seawoods-Darave",
    "CBD Belapur", "Kharghar", "Mansarovar", "Khandeshwar", "Panvel"
  ];

  let thId = 4000;
  // Trans-Harbour Down (Thane -> Panvel / Vashi)
  for (let hour = 5; hour <= 23; hour++) {
    for (let min of [10, 30, 50]) {
      thId++;
      const stops = [];
      let currentMinutes = hour * 60 + min;

      transHarbourStns.forEach((stn) => {
        const h = Math.floor(currentMinutes / 60) % 24;
        const m = currentMinutes % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        stops.push({ station: stn, time: timeStr });
        currentMinutes += 2.5;
      });

      services.push({
        train_id: `TH_${thId}`,
        name: `Train TH-${thId} (Thane - Panvel Trans-Harbour)`,
        line: "Trans-Harbour",
        type: "Slow Local",
        classSupport: ["Second Class", "First Class"],
        stops,
      });
    }
  }

  // Trans-Harbour Up (Panvel / Vashi / Airoli -> Thane)
  for (let hour = 5; hour <= 23; hour++) {
    for (let min of [5, 25, 45]) {
      thId++;
      const stops = [];
      let currentMinutes = hour * 60 + min;
      const revStns = [...transHarbourStns].reverse();

      revStns.forEach((stn) => {
        const h = Math.floor(currentMinutes / 60) % 24;
        const m = currentMinutes % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        stops.push({ station: stn, time: timeStr });
        currentMinutes += 2.5;
      });

      services.push({
        train_id: `TH_${thId}`,
        name: `Train TH-${thId} (Panvel - Thane Trans-Harbour)`,
        line: "Trans-Harbour",
        type: "Slow Local",
        classSupport: ["Second Class", "First Class"],
        stops,
      });
    }
  }

  // 5. Metro Line 1 Services (Versova <-> Ghatkopar)
  const metro1Stns = [
    "Versova", "D.N. Nagar", "Azad Nagar", "Andheri Metro", "Western Express Highway",
    "Chakala", "Airport Road", "Marol Naka", "Saki Naka", "Asalpha", "Jagruti Nagar", "Ghatkopar Metro"
  ];

  let m1Id = 5000;
  // Metro Line 1 (Versova -> Ghatkopar) every 8 minutes
  for (let hour = 5; hour <= 23; hour++) {
    for (let min of [0, 8, 16, 24, 32, 40, 48, 56]) {
      m1Id++;
      const stops = [];
      let currentMinutes = hour * 60 + min;

      metro1Stns.forEach((stn) => {
        const h = Math.floor(currentMinutes / 60) % 24;
        const m = currentMinutes % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        stops.push({ station: stn, time: timeStr });
        currentMinutes += 2;
      });

      services.push({
        train_id: `M1_${m1Id}`,
        name: `Metro M1-${m1Id} (Versova - Ghatkopar)`,
        line: "Metro Line 1",
        type: "AC Metro",
        classSupport: ["AC Local"],
        stops,
      });
    }
  }

  // Metro Line 1 (Ghatkopar -> Versova)
  for (let hour = 5; hour <= 23; hour++) {
    for (let min of [4, 12, 20, 28, 36, 44, 52]) {
      m1Id++;
      const stops = [];
      let currentMinutes = hour * 60 + min;
      const revStns = [...metro1Stns].reverse();

      revStns.forEach((stn) => {
        const h = Math.floor(currentMinutes / 60) % 24;
        const m = currentMinutes % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        stops.push({ station: stn, time: timeStr });
        currentMinutes += 2;
      });

      services.push({
        train_id: `M1_${m1Id}`,
        name: `Metro M1-${m1Id} (Ghatkopar - Versova)`,
        line: "Metro Line 1",
        type: "AC Metro",
        classSupport: ["AC Local"],
        stops,
      });
    }
  }

  // 6. Metro Line 3 Services (Aarey Colony <-> Cuffe Parade)
  const metro3Stns = [
    "Aarey Colony", "SEEPZ", "MIDC", "Marol Naka M3", "CSMIA T2", "Sahar Road", "CSMIA T1",
    "Santacruz Metro", "Vidyanagari", "BKC", "Dharavi", "Sheetaladevi", "Dadar Metro",
    "Siddhivinayak", "Worli", "Acharya Atre Chowk", "Science Museum", "Mahalaxmi Metro",
    "Mumbai Central Metro", "Grant Road Metro", "Girgaon", "Kalbadevi", "CSMT Metro",
    "Hutatma Chowk", "Churchgate Metro", "Vidhan Bhavan", "Cuffe Parade"
  ];

  let m3Id = 6000;
  for (let hour = 6; hour <= 22; hour++) {
    for (let min of [0, 15, 30, 45]) {
      m3Id++;
      const stops = [];
      let currentMinutes = hour * 60 + min;

      metro3Stns.forEach((stn) => {
        const h = Math.floor(currentMinutes / 60) % 24;
        const m = currentMinutes % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        stops.push({ station: stn, time: timeStr });
        currentMinutes += 2;
      });

      services.push({
        train_id: `M3_${m3Id}`,
        name: `Metro M3-${m3Id} (Aarey - Cuffe Parade)`,
        line: "Metro Line 3",
        type: "AC Metro",
        classSupport: ["AC Local"],
        stops,
      });
    }
  }

  return services.map((s) => {
    const trainNum = parseInt((s.train_id || "").replace(/\D/g, "")) || 0;
    const { coachCount, formation } = buildTrainCoachFormation(s.line, s.type, trainNum);
    return {
      ...s,
      coachCount,
      coachFormation: formation,
    };
  });
};

export const buildTrainCoachFormation = (line, type, trainIdNum = 0) => {
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
};

export const ALL_TRAIN_SERVICES = generateTimetableData();

/**
 * Get train service by exact train_id
 */
export const getServiceById = (trainId) => {
  if (!trainId) return null;
  return ALL_TRAIN_SERVICES.find((s) => s.train_id === trainId) || null;
};

/**
 * Searches timetable services for actual matching trains for Source -> Destination journey
 * Verifies station stop sequence (sourceStopIndex < destStopIndex)
 * Filters out departed trains and sorts chronologically by departure time from source station in Asia/Kolkata
 * Handles interchange routing fallback if no direct train exists
 * @param {string} source 
 * @param {string} destination 
 * @param {Date} [referenceDate] 
 * @returns {Array<Object>} List of actual matching upcoming trains
 */
export const searchUpcomingTrains = (source, destination, referenceDate = new Date(), activeDisruptions = [], viaStation = null) => {
  if (!source || !destination || source.trim().toLowerCase() === destination.trim().toLowerCase()) {
    return [];
  }

  const sNorm = normalizeStationName(source);
  const dNorm = normalizeStationName(destination);
  const vNorm = viaStation && viaStation !== "Direct" ? normalizeStationName(viaStation.replace(/^Via\s+/i, "")) : null;

  // Extract set of affected train IDs & lines from active disruptions
  const cancelledTrainIds = new Set();
  const suspendedLines = new Set();

  if (Array.isArray(activeDisruptions)) {
    activeDisruptions.forEach((d) => {
      if (d.affectedTrains && Array.isArray(d.affectedTrains)) {
        d.affectedTrains.forEach((id) => cancelledTrainIds.add(id));
      }
      if (d.type === "service_suspension" || d.type === "train_cancellation") {
        if (d.line) suspendedLines.add(d.line.toLowerCase());
      }
    });
  }

  // Get current time in Asia/Kolkata timezone
  const dateParts = getKolkataDateParts(referenceDate) || {
    hour: referenceDate.getHours(),
    minute: referenceDate.getMinutes(),
  };
  const currentMinutesIST = dateParts.hour * 60 + dateParts.minute;

  const matches = [];

  ALL_TRAIN_SERVICES.forEach((service) => {
    // Exclude cancelled / suspended services
    if (cancelledTrainIds.has(service.train_id)) return;
    if (service.line && suspendedLines.has(service.line.toLowerCase())) return;

    const sIdx = service.stops.findIndex((st) => normalizeStationName(st.station) === sNorm);
    const dIdx = service.stops.findIndex((st) => normalizeStationName(st.station) === dNorm);
    const vIdx = vNorm ? service.stops.findIndex((st) => normalizeStationName(st.station) === vNorm) : -1;

    // If viaStation specified, ensure train stops at viaStation in correct order (sIdx < vIdx && vIdx < dIdx)
    const validViaOrder = !vNorm || (vIdx !== -1 && sIdx < vIdx && vIdx < dIdx);

    // Verify train serves both stations AND in correct direction (sIdx < dIdx)
    if (sIdx !== -1 && dIdx !== -1 && sIdx < dIdx && validViaOrder) {
      const departureStop = service.stops[sIdx];
      const arrivalStop = service.stops[dIdx];

      const [dH, dM] = departureStop.time.split(":").map(Number);
      const [aH, aM] = arrivalStop.time.split(":").map(Number);

      const depMinutes = dH * 60 + dM;
      const arrMinutes = aH * 60 + aM;

      let diffMinutes = depMinutes - currentMinutesIST;
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60;
      }

      let etaStr = `${diffMinutes} min`;
      if (diffMinutes >= 60) {
        const hrs = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        etaStr = `${hrs}h ${mins}m`;
      }

      const travelTimeMins = arrMinutes >= depMinutes ? arrMinutes - depMinutes : (arrMinutes + 24 * 60) - depMinutes;

      // Determine current location of train based on current time IST
      let currentStn = service.stops[0].station;
      for (const st of service.stops) {
        const [sH, sM] = st.time.split(":").map(Number);
        if (sH * 60 + sM <= currentMinutesIST) {
          currentStn = st.station;
        }
      }

      matches.push({
        train_id: service.train_id,
        name: service.name,
        type: service.type,
        line: service.line,
        departureTime: departureStop.time,
        arrivalTime: arrivalStop.time,
        sourceStation: departureStop.station,
        destStation: arrivalStop.station,
        diffMinutes,
        eta: etaStr,
        travelTimeMins,
        classSupport: service.classSupport,
        stopCount: dIdx - sIdx,
        allStops: service.stops.slice(sIdx, dIdx + 1),
        currentStation: currentStn,
        isDirect: true,
      });
    }
  });

  if (matches.length > 0 && (!vNorm || vNorm === "direct")) {
    return matches.sort((a, b) => a.diffMinutes - b.diffMinutes);
  }

  // Multi-segment Cross-Line / Interchange-Aware Train Search
  // Determine interchange nodes based on viaStation or source/destination line relationships
  let interchangeNodes = [];

  if (vNorm && vNorm !== "direct") {
    const vLower = vNorm.toLowerCase();
    if (vLower.includes("dadar") && vLower.includes("thane")) {
      const dIdx = vLower.indexOf("dadar");
      const tIdx = vLower.indexOf("thane");
      interchangeNodes = dIdx < tIdx ? ["Dadar", "Thane"] : ["Thane", "Dadar"];
    } else if (vLower.includes("dadar") && vLower.includes("kurla")) {
      const dIdx = vLower.indexOf("dadar");
      const kIdx = vLower.indexOf("kurla");
      interchangeNodes = dIdx < kIdx ? ["Dadar", "Kurla"] : ["Kurla", "Dadar"];
    } else if (vLower.includes("dadar")) {
      interchangeNodes = ["Dadar"];
    } else if (vLower.includes("thane")) {
      interchangeNodes = ["Thane"];
    } else if (vLower.includes("kurla")) {
      interchangeNodes = ["Kurla"];
    } else if (vLower.includes("mahim")) {
      interchangeNodes = ["Mahim"];
    } else if (vLower.includes("sanpada")) {
      interchangeNodes = ["Sanpada"];
    }
  }

  if (interchangeNodes.length === 0) {
    // Auto-detect based on cross-line pattern using authentic station line dataset
    const allStns = getAllStations();
    const sLines = new Set(allStns.filter(s => normalizeStationName(s.name) === sNorm).map(s => s.line));
    const dLines = new Set(allStns.filter(s => normalizeStationName(s.name) === dNorm).map(s => s.line));

    const transHarbourStnNames = [
      "vashi", "sanpada", "juinagar", "nerul", "seawoods-darave", "cbd belapur", "belapur",
      "kharghar", "mansarovar", "khandeshwar", "panvel", "airoli", "digha gaon", "rabale",
      "ghansoli", "koparkhairane", "turbhe"
    ];

    const isSrcW = sLines.has("Western");
    const isDstW = dLines.has("Western");
    const isSrcC = sLines.has("Central");
    const isDstC = dLines.has("Central");
    const isSrcH = sLines.has("Harbour");
    const isDstH = dLines.has("Harbour");
    const isSrcTH = sLines.has("Trans-Harbour") || transHarbourStnNames.includes(sNorm);
    const isDstTH = dLines.has("Trans-Harbour") || transHarbourStnNames.includes(dNorm);

    if (isSrcW && isDstTH) {
      interchangeNodes = ["Dadar", "Thane"];
    } else if (isSrcTH && isDstW) {
      interchangeNodes = ["Thane", "Dadar"];
    } else if ((isSrcW && isDstC) || (isSrcC && isDstW)) {
      interchangeNodes = ["Dadar"];
    } else if ((isSrcC && isDstTH) || (isSrcTH && isDstC)) {
      interchangeNodes = ["Thane"];
    } else if ((isSrcC && isDstH) || (isSrcH && isDstC)) {
      interchangeNodes = ["Kurla"];
    } else if (isSrcW && isDstH) {
      interchangeNodes = ["Mahim"];
    } else if (isSrcH && isDstW) {
      interchangeNodes = ["Mahim"];
    } else if ((isSrcH && isDstTH) || (isSrcTH && isDstH)) {
      interchangeNodes = ["Sanpada"];
    } else {
      interchangeNodes = ["Dadar"];
    }
  }

  const connectingMatches = [];

  const timeToMins = (tStr) => {
    if (!tStr) return 0;
    const [h, m] = tStr.split(":").map(Number);
    return h * 60 + m;
  };

  if (interchangeNodes.length === 1) {
    const inter = interchangeNodes[0];
    const interNorm = normalizeStationName(inter);

    const leg1Services = ALL_TRAIN_SERVICES.filter((service) => {
      if (cancelledTrainIds.has(service.train_id)) return false;
      const sIdx = service.stops.findIndex((st) => normalizeStationName(st.station) === sNorm);
      const iIdx = service.stops.findIndex((st) => normalizeStationName(st.station) === interNorm);
      return sIdx !== -1 && iIdx !== -1 && sIdx < iIdx;
    });

    if (leg1Services.length > 0) {
      // Pick upcoming Leg 1 service
      const leg1 = leg1Services.find((s) => {
        const st = s.stops.find((st) => normalizeStationName(st.station) === sNorm);
        return timeToMins(st.time) >= currentMinutesIST;
      }) || leg1Services[0];

      const sIdx1 = leg1.stops.findIndex((st) => normalizeStationName(st.station) === sNorm);
      const iIdx1 = leg1.stops.findIndex((st) => normalizeStationName(st.station) === interNorm);
      const depStop1 = leg1.stops[sIdx1];
      const arrStop1 = leg1.stops[iIdx1];
      const leg1ArrMins = timeToMins(arrStop1.time);

      const leg2Services = ALL_TRAIN_SERVICES.filter((service) => {
        if (cancelledTrainIds.has(service.train_id)) return false;
        const iIdx = service.stops.findIndex((st) => normalizeStationName(st.station) === interNorm);
        const dIdx = service.stops.findIndex((st) => normalizeStationName(st.station) === dNorm);
        return iIdx !== -1 && dIdx !== -1 && iIdx < dIdx;
      });

      if (leg2Services.length > 0) {
        // Pick Leg 2 service departing after Leg 1 arrival + 3 mins buffer
        const leg2 = leg2Services.find((s) => {
          const st = s.stops.find((st) => normalizeStationName(st.station) === interNorm);
          return timeToMins(st.time) >= leg1ArrMins + 3;
        }) || leg2Services[0];

        const iIdx2 = leg2.stops.findIndex((st) => normalizeStationName(st.station) === interNorm);
        const dIdx2 = leg2.stops.findIndex((st) => normalizeStationName(st.station) === dNorm);

        const depStop2 = leg2.stops[iIdx2];
        const arrStop2 = leg2.stops[dIdx2];

        const [dH, dM] = depStop1.time.split(":").map(Number);
        const depMinutes = dH * 60 + dM;
        let diffMinutes = depMinutes - currentMinutesIST;
        if (diffMinutes < 0) diffMinutes += 24 * 60;

        connectingMatches.push({
          train_id: `${leg1.train_id}_${leg2.train_id}`,
          name: `${leg1.line} ➔ Switch at ${inter} ➔ ${leg2.line}`,
          type: `Interchange Service (${leg1.type} + ${leg2.type})`,
          line: `${leg1.line} / ${leg2.line}`,
          departureTime: depStop1.time,
          arrivalTime: arrStop2.time,
          sourceStation: depStop1.station,
          destStation: arrStop2.station,
          interchangeStation: inter,
          diffMinutes,
          eta: `${diffMinutes} min`,
          travelTimeMins: 45,
          classSupport: leg1.classSupport,
          stopCount: (iIdx1 - sIdx1) + (dIdx2 - iIdx2),
          allStops: [...leg1.stops.slice(sIdx1, iIdx1 + 1), ...leg2.stops.slice(iIdx2, dIdx2 + 1)],
          currentStation: depStop1.station,
          isDirect: false,
          interchanges: [inter],
          transfers: [`CHANGE TRAIN AT ${inter}`],
          segments: [
            {
              segmentNumber: 1,
              source: depStop1.station,
              destination: inter,
              line: leg1.line,
              train_id: leg1.train_id,
              train_name: leg1.name,
              departureTime: depStop1.time,
              arrivalTime: arrStop1.time,
            },
            {
              segmentNumber: 2,
              source: inter,
              destination: arrStop2.station,
              line: leg2.line,
              train_id: leg2.train_id,
              train_name: leg2.name,
              departureTime: depStop2.time,
              arrivalTime: arrStop2.time,
            },
          ],
        });
      }
    }
  } else if (interchangeNodes.length === 2) {
    const inter1 = interchangeNodes[0];
    const inter2 = interchangeNodes[1];
    const i1Norm = normalizeStationName(inter1);
    const i2Norm = normalizeStationName(inter2);

    const leg1Services = ALL_TRAIN_SERVICES.filter((s) => {
      const sIdx = s.stops.findIndex((st) => normalizeStationName(st.station) === sNorm);
      const iIdx = s.stops.findIndex((st) => normalizeStationName(st.station) === i1Norm);
      return sIdx !== -1 && iIdx !== -1 && sIdx < iIdx;
    });

    if (leg1Services.length > 0) {
      const leg1 = leg1Services.find((s) => {
        const st = s.stops.find((st) => normalizeStationName(st.station) === sNorm);
        return timeToMins(st.time) >= currentMinutesIST;
      }) || leg1Services[0];

      const sIdx1 = leg1.stops.findIndex((st) => normalizeStationName(st.station) === sNorm);
      const iIdx1 = leg1.stops.findIndex((st) => normalizeStationName(st.station) === i1Norm);
      const depStop1 = leg1.stops[sIdx1];
      const arrStop1 = leg1.stops[iIdx1];
      const leg1ArrMins = timeToMins(arrStop1.time);

      const leg2Services = ALL_TRAIN_SERVICES.filter((s) => {
        const i1Idx = s.stops.findIndex((st) => normalizeStationName(st.station) === i1Norm);
        const i2Idx = s.stops.findIndex((st) => normalizeStationName(st.station) === i2Norm);
        return i1Idx !== -1 && i2Idx !== -1 && i1Idx < i2Idx;
      });

      if (leg2Services.length > 0) {
        const leg2 = leg2Services.find((s) => {
          const st = s.stops.find((st) => normalizeStationName(st.station) === i1Norm);
          return timeToMins(st.time) >= leg1ArrMins + 3;
        }) || leg2Services[0];

        const i1Idx2 = leg2.stops.findIndex((st) => normalizeStationName(st.station) === i1Norm);
        const i2Idx2 = leg2.stops.findIndex((st) => normalizeStationName(st.station) === i2Norm);
        const depStop2 = leg2.stops[i1Idx2];
        const arrStop2 = leg2.stops[i2Idx2];
        const leg2ArrMins = timeToMins(arrStop2.time);

        const leg3Services = ALL_TRAIN_SERVICES.filter((s) => {
          const i2Idx = s.stops.findIndex((st) => normalizeStationName(st.station) === i2Norm);
          const dIdx = s.stops.findIndex((st) => normalizeStationName(st.station) === dNorm);
          return i2Idx !== -1 && dIdx !== -1 && i2Idx < dIdx;
        });

        if (leg3Services.length > 0) {
          const leg3 = leg3Services.find((s) => {
            const st = s.stops.find((st) => normalizeStationName(st.station) === i2Norm);
            return timeToMins(st.time) >= leg2ArrMins + 3;
          }) || leg3Services[0];

          const i2Idx3 = leg3.stops.findIndex((st) => normalizeStationName(st.station) === i2Norm);
          const dIdx3 = leg3.stops.findIndex((st) => normalizeStationName(st.station) === dNorm);
          const depStop3 = leg3.stops[i2Idx3];
          const arrStop3 = leg3.stops[dIdx3];

          const [dH, dM] = depStop1.time.split(":").map(Number);
          const depMinutes = dH * 60 + dM;
          let diffMinutes = depMinutes - currentMinutesIST;
          if (diffMinutes < 0) diffMinutes += 24 * 60;

          connectingMatches.push({
            train_id: `${leg1.train_id}_${leg2.train_id}_${leg3.train_id}`,
            name: `${leg1.line} ➔ Switch at ${inter1} ➔ ${leg2.line} ➔ Switch at ${inter2} ➔ ${leg3.line}`,
            type: "Multi-Interchange Service",
            line: `${leg1.line} / ${leg2.line} / ${leg3.line}`,
            departureTime: depStop1.time,
            arrivalTime: arrStop3.time,
            sourceStation: depStop1.station,
            destStation: arrStop3.station,
            diffMinutes,
            eta: `${diffMinutes} min`,
            travelTimeMins: 65,
            classSupport: leg1.classSupport,
            stopCount: (iIdx1 - sIdx1) + (i2Idx2 - i1Idx2) + (dIdx3 - i2Idx3),
            allStops: [...leg1.stops.slice(sIdx1, iIdx1 + 1), ...leg2.stops.slice(i1Idx2, i2Idx2 + 1), ...leg3.stops.slice(i2Idx3, dIdx3 + 1)],
            currentStation: depStop1.station,
            isDirect: false,
            interchanges: [inter1, inter2],
            transfers: [`CHANGE TRAIN AT ${inter1}`, `CHANGE TRAIN AT ${inter2}`],
            segments: [
              {
                segmentNumber: 1,
                source: depStop1.station,
                destination: inter1,
                line: leg1.line,
                train_id: leg1.train_id,
                train_name: leg1.name,
                departureTime: depStop1.time,
                arrivalTime: arrStop1.time,
              },
              {
                segmentNumber: 2,
                source: inter1,
                destination: inter2,
                line: leg2.line,
                train_id: leg2.train_id,
                train_name: leg2.name,
                departureTime: depStop2.time,
                arrivalTime: arrStop2.time,
              },
              {
                segmentNumber: 3,
                source: inter2,
                destination: arrStop3.station,
                line: leg3.line,
                train_id: leg3.train_id,
                train_name: leg3.name,
                departureTime: depStop3.time,
                arrivalTime: arrStop3.time,
              },
            ],
          });
        }
      }
    }
  }

  return connectingMatches.sort((a, b) => a.diffMinutes - b.diffMinutes);
};


