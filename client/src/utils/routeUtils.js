import { getAllStations, railwayStations } from "./allStations.js";
import { calculateCoachOccupancy } from "./coachOccupancyEngine.js";
import { searchUpcomingTrains, normalizeStationName } from "./timetableData.js";
import { calculateFare } from "./fareCalculator.js";

/**
 * Normalizes station names for fuzzy / canonical key matching.
 * Strip parenthetical suffixes (e.g. "(East)", "(West)", "(WEH)"), line indicators ("Metro", "M3"), etc.
 */
export const normalizeStationNameKey = (name) => {
  if (!name) return "";
  let clean = name.trim().toLowerCase();
  clean = clean.replace(/\s*\([^)]*\)/g, ""); // Remove bracketed text
  clean = clean.replace(/\s+metro$/i, "");
  clean = clean.replace(/\s+m3$/i, "");
  clean = clean.replace(/\s+line\s*\d+[a-z]?$/i, "");
  return clean.trim();
};

/**
 * Builds the Local Suburban Railway Graph (Central, Western, Harbour, Trans-Harbour).
 * Edges consist ONLY of suburban railway tracks and railway interchange nodes.
 */
const buildLocalGraph = () => {
  const graph = new Map();

  const addEdge = (u, v) => {
    const uKey = u.trim();
    const vKey = v.trim();
    if (!graph.has(uKey)) graph.set(uKey, new Set());
    if (!graph.has(vKey)) graph.set(vKey, new Set());
    graph.get(uKey).add(vKey);
    graph.get(vKey).add(uKey);
  };

  const addSequentialEdges = (stations) => {
    for (let i = 0; i < stations.length - 1; i++) {
      addEdge(stations[i], stations[i + 1]);
    }
  };

  // Western Line
  const westernStns = (railwayStations.western || []).map((s) => s.name);
  addSequentialEdges(westernStns);

  // Central Main Line
  const centralStns = (railwayStations.central || []).map((s) => s.name);
  addSequentialEdges(centralStns);

  // Harbour Line
  const harbourStns = (railwayStations.harbour || []).map((s) => s.name);
  addSequentialEdges(harbourStns);

  // Trans-Harbour Line
  const transHarbourStns = (railwayStations.transharbour || []).map((s) => s.name);
  addSequentialEdges(transHarbourStns);

  // Railway Interchanges
  addEdge("Dadar", "Dadar"); // Internal node alias
  addEdge("Kurla", "Kurla");
  addEdge("Thane", "Thane");
  addEdge("Sanpada", "Vashi");
  addEdge("Mahim", "Mahim Junction");
  addEdge("Mahim Junction", "Bandra");
  addEdge("Wadala Road", "Kings Circle");

  return graph;
};

/**
 * Builds the Mumbai Metro Graph (Line 1, Line 2A, Line 7/9, Line 3).
 * Edges consist ONLY of actual Metro stations and Metro-to-Metro interchanges.
 */
const buildMetroGraph = () => {
  const graph = new Map();

  const addEdge = (u, v) => {
    const uKey = u.trim();
    const vKey = v.trim();
    if (!graph.has(uKey)) graph.set(uKey, new Set());
    if (!graph.has(vKey)) graph.set(vKey, new Set());
    graph.get(uKey).add(vKey);
    graph.get(vKey).add(uKey);
  };

  const addSequentialEdges = (stations) => {
    for (let i = 0; i < stations.length - 1; i++) {
      addEdge(stations[i], stations[i + 1]);
    }
  };

  // Metro Line 1 (Versova <-> Ghatkopar)
  const line1 = [
    "Versova", "D.N. Nagar", "Azad Nagar", "Andheri", "Western Express Highway",
    "Chakala", "Airport Road", "Marol Naka", "Saki Naka", "Asalpha", "Jagruti Nagar", "Ghatkopar"
  ];
  const line1Full = (railwayStations.metro1 || []).map((s) => s.name);
  addSequentialEdges(line1Full.length > 0 ? line1Full : line1);

  // Metro Line 2A (Dahisar East <-> Andheri West)
  const line2a = [
    "Dahisar East", "Anand Nagar", "Kandarpada", "Mandapeshwar", "Eksar",
    "Borivali West", "Pahadi Eksar", "Kandivali West", "Dahanukarwadi", "Valnai",
    "Malad West", "Lower Malad", "Pahadi Goregaon", "Goregaon West", "Oshiwara",
    "Lower Oshiwara", "Andheri West"
  ];
  const line2aFull = (railwayStations.metro2a || []).map((s) => s.name);
  addSequentialEdges(line2aFull.length > 0 ? line2aFull : line2a);

  // Metro Line 7 (Dahisar East <-> Gundavali)
  const line7 = [
    "Dahisar East", "Ovaripada", "Rashtriya Udyan", "Devipada", "Magathane",
    "Poisar", "Akurli", "Kurar", "Dindoshi", "Aarey", "Goregaon East",
    "Jogeshwari East", "Mogra", "Gundavali"
  ];
  const line7Full = (railwayStations.metro7 || []).map((s) => s.name);
  addSequentialEdges(line7Full.length > 0 ? line7Full : line7);

  // Metro Line 3 (Aqua Line: Cuffe Parade <-> Aarey Colony / SEEPZ)
  const line3 = [
    "Aarey Colony", "SEEPZ", "MIDC", "Marol Naka M3", "CSMIA T2", "Sahar Road",
    "CSMIA T1", "Santacruz Metro", "Vidyanagari", "BKC", "Dharavi", "Sheetaladevi",
    "Dadar Metro", "Siddhivinayak", "Worli", "Acharya Atre Chowk", "Science Museum",
    "Mahalaxmi Metro", "Mumbai Central Metro", "Grant Road Metro", "Girgaon",
    "Kalbadevi", "CSMT Metro", "Hutatma Chowk", "Churchgate Metro", "Vidhan Bhavan", "Cuffe Parade"
  ];
  const line3Full = (railwayStations.metro3 || []).map((s) => s.name);
  addSequentialEdges(line3Full.length > 0 ? line3Full : line3);

  // Metro-to-Metro Interchanges
  addEdge("D.N. Nagar", "Andheri West");
  addEdge("Western Express Highway", "Gundavali");
  addEdge("Marol Naka", "Marol Naka M3");
  addEdge("Marol Naka", "MIDC");

  // Name alias connections within Metro graph
  addEdge("Andheri", "Andheri West");
  addEdge("Marol Naka", "Marol Naka M3");

  return graph;
};

// Cached Graph instances
const localGraph = buildLocalGraph();
const metroGraph = buildMetroGraph();

/**
 * BFS Traversal Helper
 */
const bfsPath = (graph, startNode, endNode) => {
  if (!startNode || !endNode || !graph.has(startNode) || !graph.has(endNode)) {
    return null;
  }
  if (startNode === endNode) return [startNode];

  const queue = [[startNode]];
  const visited = new Set([startNode]);

  while (queue.length > 0) {
    const path = queue.shift();
    const curr = path[path.length - 1];

    if (curr === endNode) {
      return path;
    }

    const neighbors = graph.get(curr) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }

  return null;
};

/**
 * Finds matching node in graph using exact or canonical key matching
 */
const findGraphNode = (graph, stationName) => {
  if (!stationName) return null;
  const sName = stationName.trim();
  if (graph.has(sName)) return sName;

  const targetKey = normalizeStationNameKey(sName);

  for (const node of graph.keys()) {
    if (normalizeStationNameKey(node) === targetKey) {
      return node;
    }
  }
  return null;
};

/**
 * Helper to determine connecting line between two adjacent stations in path
 */
const getConnectingLineBetweenAdjacent = (stnA, stnB) => {
  if (!stnA || !stnB) return null;
  const aNorm = normalizeStationNameKey(stnA);
  const bNorm = normalizeStationNameKey(stnB);

  if (aNorm === bNorm) return "INTERCHANGE_NODE";

  const isAdjacentInList = (list) => {
    if (!list || list.length < 2) return false;
    for (let i = 0; i < list.length - 1; i++) {
      const u = normalizeStationNameKey(list[i].name);
      const v = normalizeStationNameKey(list[i + 1].name);
      if ((u === aNorm && v === bNorm) || (u === bNorm && v === aNorm)) {
        return true;
      }
    }
    return false;
  };

  if (isAdjacentInList(railwayStations.western)) return "Western";
  if (isAdjacentInList(railwayStations.central)) return "Central";
  if (isAdjacentInList(railwayStations.harbour)) return "Harbour";
  if (isAdjacentInList(railwayStations.transharbour)) return "Trans-Harbour";
  if (isAdjacentInList(railwayStations.metro1)) return "Metro Line 1";
  if (isAdjacentInList(railwayStations.metro2a)) return "Metro Line 2A";
  if (isAdjacentInList(railwayStations.metro7)) return "Metro Line 7";
  if (isAdjacentInList(railwayStations.metro3)) return "Metro Line 3";

  return null;
};

/**
 * Calculates genuine transfer/interchange stations along a station path.
 * Returns empty array [] for direct same-line journeys.
 */
export const getActualViaStations = (fullPath) => {
  if (!fullPath || !Array.isArray(fullPath) || fullPath.length <= 2) {
    return [];
  }

  const src = fullPath[0];
  const dst = fullPath[fullPath.length - 1];
  const sNorm = normalizeStationNameKey(src);
  const dNorm = normalizeStationNameKey(dst);

  // Map each segment to its connecting railway/metro line
  const segmentLines = [];
  for (let i = 0; i < fullPath.length - 1; i++) {
    const line = getConnectingLineBetweenAdjacent(fullPath[i], fullPath[i + 1]);
    segmentLines.push(line);
  }

  // Find genuine line changes
  const interchanges = [];
  for (let i = 0; i < segmentLines.length - 1; i++) {
    const l1 = segmentLines[i];
    const l2 = segmentLines[i + 1];

    if (l1 && l2 && l1 !== l2 && l1 !== "INTERCHANGE_NODE" && l2 !== "INTERCHANGE_NODE") {
      const interchangeStn = fullPath[i + 1];
      const iNorm = normalizeStationNameKey(interchangeStn);

      if (iNorm !== sNorm && iNorm !== dNorm) {
        if (!interchanges.some((stn) => normalizeStationNameKey(stn) === iNorm)) {
          interchanges.push(interchangeStn);
        }
      }
    } else if (l1 === "INTERCHANGE_NODE" || l2 === "INTERCHANGE_NODE") {
      const idx = l1 === "INTERCHANGE_NODE" ? i : i + 1;
      const interchangeStn = fullPath[idx];
      const iNorm = normalizeStationNameKey(interchangeStn);

      if (iNorm !== sNorm && iNorm !== dNorm) {
        if (!interchanges.some((stn) => normalizeStationNameKey(stn) === iNorm)) {
          interchanges.push(interchangeStn);
        }
      }
    }
  }

  return interchanges;
};

/**
 * Calculates a valid connected route on the Local Suburban Railway Network ONLY.
 * @param {string} source 
 * @param {string} destination 
 * @returns {Object} { valid: boolean, path: Array, ... }
 */
export const findLocalRoute = (source, destination) => {
  if (!source || !destination || source.trim() === destination.trim()) {
    return { valid: false, message: "No Local Train Route Available" };
  }

  const sNode = findGraphNode(localGraph, source);
  const dNode = findGraphNode(localGraph, destination);

  if (!sNode || !dNode) {
    return { valid: false, message: "No Local Train Route Available" };
  }

  const path = bfsPath(localGraph, sNode, dNode);

  if (!path || path.length === 0) {
    return { valid: false, message: "No Local Train Route Available" };
  }

  const interchanges = getActualViaStations(path);
  const isDirect = interchanges.length === 0;
  const viaLabel = isDirect ? "Direct" : interchanges.join(" → ");

  return {
    valid: true,
    transportType: "local",
    id: isDirect ? "direct" : `via_${interchanges.join("_").toLowerCase() || "interchange"}`,
    via: viaLabel,
    label: isDirect ? "Direct — Recommended" : `Via ${viaLabel} — Recommended`,
    isRecommended: true,
    isAvailable: true,
    path: isDirect ? [source.trim(), destination.trim()] : [source.trim(), ...interchanges, destination.trim()],
    fullPath: path,
    lines: ["Suburban Local Railway"],
    description: isDirect ? "Direct suburban train service" : `Transfer at ${interchanges.join(" & ")}`,
    isAlternative: false,
    interchanges,
    transfers: interchanges.map((stn) => `CHANGE TRAIN AT ${stn}`),
  };
};

/**
 * Calculates a valid connected route on the Mumbai Metro Network ONLY.
 * @param {string} source 
 * @param {string} destination 
 * @returns {Object} { valid: boolean, path: Array, ... }
 */
export const findMetroRoute = (source, destination) => {
  if (!source || !destination || source.trim() === destination.trim()) {
    return { valid: false, message: "No Metro Route Available" };
  }

  const sNode = findGraphNode(metroGraph, source);
  const dNode = findGraphNode(metroGraph, destination);

  if (!sNode || !dNode) {
    return { valid: false, message: "No Metro Route Available" };
  }

  const path = bfsPath(metroGraph, sNode, dNode);

  if (!path || path.length === 0) {
    return { valid: false, message: "No Metro Route Available" };
  }

  const interchanges = getActualViaStations(path);
  const isDirect = interchanges.length === 0;
  const viaLabel = isDirect ? "Direct" : interchanges.join(" → ");

  // Format intermediate stations for Metro path preview
  let intermediateDisplay = path;
  if (path.length > 3) {
    const first = path[0];
    const last = path[path.length - 1];
    const mid1 = path[Math.floor(path.length / 3)];
    const mid2 = path[Math.floor((2 * path.length) / 3)];
    intermediateDisplay = [first, mid1, mid2, last];
  }

  return {
    valid: true,
    transportType: "metro",
    id: `alt_metro_${sNode.toLowerCase()}_${dNode.toLowerCase()}`,
    via: viaLabel,
    label: isDirect ? "Metro — Direct Route" : `Metro via ${viaLabel}`,
    isRecommended: false,
    isAvailable: true,
    path: intermediateDisplay,
    fullPath: path,
    lines: ["Mumbai Metro Network"],
    description: isDirect ? `Direct AC Metro path (${path.length - 1} stops)` : `AC Metro transfer via ${interchanges.join(" & ")}`,
    isAlternative: true,
    rank: 3,
    interchanges,
    transfers: interchanges.map((stn) => `CHANGE METRO AT ${stn}`),
  };
};

/**
 * Reusable network-based route validator
 * Concept: validateRoute(source, destination, transportType)
 */
export const validateRoute = (source, destination, transportType = "rail") => {
  const mode = (transportType || "").toLowerCase();
  if (mode === "metro") {
    return findMetroRoute(source, destination);
  }
  return findLocalRoute(source, destination);
};

/**
 * Centralized Route Engine for Mumbai System
 * Evaluates BOTH Local Train Network and Metro Network independently.
 * Displays ALL valid transport options to the user.
 * 
 * @param {string} source 
 * @param {string} destination 
 * @param {Object} [affectedDisruption]
 * @returns {Array<Object>} List of route option objects
 */
export const getAvailableRoutes = (source, destination, affectedDisruption = null) => {
  if (!source || !destination || source.trim() === destination.trim()) {
    return [];
  }

  const localRes = findLocalRoute(source, destination);
  const metroRes = findMetroRoute(source, destination);

  const routes = [];

  // Local Train Option(s)
  if (localRes.valid) {
    routes.push(localRes);
  } else {
    routes.push({
      id: "no_local_route",
      transportType: "local",
      via: "No Local Train Route Available",
      label: "No Local Train Route Available",
      isRecommended: false,
      isAvailable: false,
      path: [],
      lines: ["Local Train Network"],
      description: "No connected suburban railway route between selected stations",
      isAlternative: false,
    });
  }

  // Metro Option(s)
  if (metroRes.valid) {
    routes.push(metroRes);
  } else {
    routes.push({
      id: "no_metro_route",
      transportType: "metro",
      via: "No Metro Route Available",
      label: "No Metro Route Available",
      isRecommended: false,
      isAvailable: false,
      path: [],
      lines: ["Metro Network"],
      description: "No connected Metro route between selected stations",
      isAlternative: true,
    });
  }

  return routes;
};

/**
 * Dynamically finds valid connected alternative railway paths between Source & Destination.
 * Uses only actual connected railway lines and interchange nodes from the project network dataset.
 */
export const findAlternativeRailwayRoutes = (source, destination) => {
  if (!source || !destination || source.trim().toLowerCase() === destination.trim().toLowerCase()) {
    return [];
  }

  const sNorm = normalizeStationNameKey(source);
  const dNorm = normalizeStationNameKey(destination);
  const allStns = getAllStations();

  const sStns = allStns.filter((s) => normalizeStationNameKey(s.name) === sNorm);
  const dStns = allStns.filter((s) => normalizeStationNameKey(s.name) === dNorm);

  if (sStns.length === 0 || dStns.length === 0) return [];

  const sLines = new Set(sStns.map((s) => s.line));
  const dLines = new Set(dStns.map((s) => s.line));

  const alternatives = [];

  // Case 1: Central Line journey (e.g. Thane -> Dadar, Dombivli -> Dadar, Thane -> CSMT)
  const isCentralDirect = sLines.has("Central") && dLines.has("Central");
  if (isCentralDirect) {
    if ((sNorm === "thane" || sNorm === "dombivli" || sNorm === "kalyan") && (dNorm === "dadar" || dNorm === "csmt" || dNorm === "kurla")) {
      alternatives.push({
        id: "alt_trans_harbour_corridor",
        via: "Sanpada → Wadala Road",
        label: "Alternative 1: Trans-Harbour Connection",
        estimatedTimeMins: sNorm === "thane" ? 42 : 55,
        interchanges: 2,
        lines: ["Trans-Harbour", "Harbour"],
        path: [source.trim(), "Sanpada", "Wadala Road", destination.trim()],
        description: `Bypass Central Line via Trans-Harbour & Harbour Line interchange to ${destination.trim()}.`,
        interchangeStations: ["Sanpada", "Wadala Road"],
        isDirect: false,
      });
    }
  }

  // Case 2: Western Line journey (e.g. Andheri -> Churchgate, Bandra -> CSMT)
  const isWesternDirect = sLines.has("Western") && dLines.has("Western");
  if (isWesternDirect) {
    if ((sNorm === "andheri" || sNorm === "bandra") && (dNorm === "csmt" || dNorm === "wadala road")) {
      alternatives.push({
        id: "alt_harbour_western_link",
        via: "Wadala Road",
        label: "Alternative: Harbour Link Bypass",
        estimatedTimeMins: 40,
        interchanges: 1,
        lines: ["Harbour"],
        path: [source.trim(), "Wadala Road", destination.trim()],
        description: `Alternative Harbour Line path via Wadala Road to ${destination.trim()}.`,
        interchangeStations: ["Wadala Road"],
        isDirect: false,
      });
    }
  }

  // Case 3: Harbour / Trans-Harbour cross journeys (e.g. Vashi -> Dadar, Panvel -> CSMT)
  if ((sLines.has("Harbour") || sLines.has("Trans-Harbour")) && dLines.has("Central")) {
    alternatives.push({
      id: "alt_trans_central_link",
      via: "Thane",
      label: "Alternative: Trans-Harbour to Central Link",
      estimatedTimeMins: 48,
      interchanges: 1,
      lines: ["Trans-Harbour", "Central"],
      path: [source.trim(), "Thane", destination.trim()],
      description: `Connected path changing via Thane interchange to ${destination.trim()}.`,
      interchangeStations: ["Thane"],
      isDirect: false,
    });
  }

  return alternatives;
};

/**
 * Calculates and evaluates all journey route options between Source & Destination.
 * Identifies normal/direct baseline routes, valid alternatives, crowd/occupancy,
 * delays, active disruptions, and determines if BYPASS RECOMMENDED should appear.
 */
export const calculateJourneyRouteOptions = ({
  source,
  destination,
  referenceDate = new Date(),
  activeDisruptions = [],
}) => {
  if (!source || !destination || source.trim().toLowerCase() === destination.trim().toLowerCase()) {
    return { recommendBypass: false, reason: "", routes: [] };
  }

  const sNorm = normalizeStationNameKey(source);
  const dNorm = normalizeStationNameKey(destination);

  // 1. Find upcoming direct/baseline trains
  const upcomingDirect = searchUpcomingTrains(source, destination, referenceDate, activeDisruptions);
  const baselineTrain = upcomingDirect.length > 0 ? upcomingDirect[0] : null;

  const secondClassFare = calculateFare(source, destination, "Second Class", "Single Journey", 1);
  const firstClassFare = calculateFare(source, destination, "First Class", "Single Journey", 1);
  const acFare = calculateFare(source, destination, "AC Local", "Single Journey", 1);

  // 2. Baseline line & travel details
  const baselineLine = baselineTrain?.line || "Central";
  const baselineDuration = baselineTrain?.travelTimeMins || 25;

  // 3. Compute baseline crowd & occupancy
  const baselineOccupancy = calculateCoachOccupancy({
    trainId: baselineTrain?.train_id || "CR_1001",
    source,
    destination,
    travelClass: "Second Class",
    referenceDate,
    trainService: baselineTrain,
  });

  const baselineCrowdPct = baselineOccupancy.overallOccupancyPct || 60;
  const baselineCrowdLevel = baselineCrowdPct <= 50 ? "low" : baselineCrowdPct <= 75 ? "moderate" : "high";

  // 4. Check active disruptions affecting source/destination/line/segment
  const sLower = source.toLowerCase();
  const dLower = destination.toLowerCase();
  const matchingDisruption = (activeDisruptions || []).find((d) => {
    if (!d) return false;
    if (d.affectedStations && d.affectedStations.some((stn) => stn.toLowerCase() === sLower || stn.toLowerCase() === dLower)) {
      return true;
    }
    if (d.affectedSegment && d.affectedSegment.some((stn) => stn.toLowerCase() === sLower || stn.toLowerCase() === dLower)) {
      return true;
    }
    if (d.line && d.line.toLowerCase() === baselineLine.toLowerCase()) {
      return true;
    }
    return false;
  });

  // 5. Calculate valid connected alternative railway routes
  const altRailwayRoutes = findAlternativeRailwayRoutes(source, destination);

  // 6. Evaluate if a bypass is recommended
  let recommendBypass = false;
  let bypassReason = "";

  if (matchingDisruption && altRailwayRoutes.length > 0) {
    recommendBypass = true;
    bypassReason = matchingDisruption.message || `Avoiding active disruption on ${baselineLine} Line`;
  } else if (baselineCrowdPct >= 80 && altRailwayRoutes.length > 0) {
    if (sNorm === "thane" && dNorm === "dadar") {
      recommendBypass = true;
      bypassReason = "Avoiding heavy crowd at Kurla";
    } else if (baselineLine === "Central") {
      recommendBypass = true;
      bypassReason = "Central Line congestion detected";
    } else {
      recommendBypass = true;
      bypassReason = "Alternative route has lower estimated crowd";
    }
  } else if (baselineTrain && baselineTrain.status === "DISRUPT / DELAYED" && altRailwayRoutes.length > 0) {
    recommendBypass = true;
    bypassReason = `Bypassing delayed services on ${baselineLine} Line`;
  }

  // 7. Assemble Route Cards
  const routeCards = [];

  if (recommendBypass && altRailwayRoutes.length > 0) {
    const primaryAlt = altRailwayRoutes[0];
    const altDuration = primaryAlt.estimatedTimeMins || 42;

    // Card 0: Bypass Recommended
    routeCards.push({
      id: primaryAlt.id || "alt-bypass-1",
      trainId: "ALT_BYPASS_1",
      badge: "Bypass Recommended",
      badgeColor: "purple",
      badgeIcon: "🛡️",
      badgeSubtext: bypassReason,
      duration: `${altDuration} min`,
      fare: `₹${secondClassFare + 10}`,
      type: primaryAlt.via,
      crowdLevel: "low",
      crowdPercent: 30,
      class: "Standard / Interchange",
      isBest: true,
      isDirect: false,
      departTime: "Departs Now",
      arriveTime: `+${altDuration} min`,
      recommendationReason: bypassReason,
    });

    // Card 1: Direct Route option
    routeCards.push({
      id: baselineTrain?.train_id || "direct-1",
      trainId: baselineTrain?.train_id || "CR_1001",
      badge: "Direct Route",
      badgeColor: "green",
      badgeIcon: "🚆",
      badgeSubtext: baselineLine,
      duration: `${baselineDuration} min`,
      fare: `₹${secondClassFare}`,
      type: baselineTrain ? baselineTrain.name : `${baselineLine} Line Direct`,
      crowdLevel: baselineCrowdLevel,
      crowdPercent: baselineCrowdPct,
      class: "Second Class",
      isBest: false,
      isDirect: true,
      departTime: baselineTrain?.departureTime || "Departs Now",
      arriveTime: baselineTrain?.arrivalTime || `+${baselineDuration} min`,
    });

    // Card 2: AC Option if available
    routeCards.push({
      id: "ac-1",
      trainId: "AC_LOCAL_1",
      badge: "AC Option",
      badgeColor: "teal",
      badgeIcon: "🪑",
      badgeSubtext: baselineLine,
      duration: `${baselineDuration} min`,
      fare: `₹${acFare}`,
      type: `AC Fast Local - ${baselineLine}`,
      crowdLevel: "low",
      crowdPercent: 35,
      class: "AC Local",
      isBest: false,
      isDirect: true,
      departTime: "Departs Now",
      arriveTime: `+${baselineDuration} min`,
    });
  } else {
    // Normal Conditions: NO Bypass Recommended!
    if (upcomingDirect.length > 0) {
      upcomingDirect.slice(0, 3).forEach((t, idx) => {
        const isAc = t.type.includes("AC") || t.type.includes("Metro");
        const fareVal = isAc ? acFare : idx === 0 ? firstClassFare : secondClassFare;
        const clsName = isAc ? "AC Local" : idx === 0 ? "First Class" : "Second Class";

        routeCards.push({
          id: t.train_id,
          trainId: t.train_id,
          badge: idx === 0 ? "Fastest Option" : isAc ? "AC Option" : "Standard Local",
          badgeColor: idx === 0 ? "purple" : isAc ? "teal" : "green",
          badgeIcon: idx === 0 ? "⭐" : isAc ? "🪑" : "💰",
          badgeSubtext: t.line,
          duration: `${t.travelTimeMins} min`,
          fare: `₹${fareVal}`,
          type: t.name,
          crowdLevel: baselineCrowdLevel,
          crowdPercent: baselineCrowdPct,
          class: clsName,
          isBest: idx === 0,
          isDirect: true,
          departTime: t.departureTime,
          arriveTime: t.arrivalTime,
        });
      });
    } else {
      routeCards.push({
        id: "direct-1",
        trainId: "CR_1001",
        badge: "Fastest Option",
        badgeColor: "purple",
        badgeIcon: "⭐",
        badgeSubtext: baselineLine,
        duration: `${baselineDuration} min`,
        fare: `₹${firstClassFare}`,
        type: `Fast Local - ${baselineLine}`,
        crowdLevel: baselineCrowdLevel,
        crowdPercent: baselineCrowdPct,
        class: "First Class",
        isBest: true,
        isDirect: true,
        departTime: "Departs Now",
        arriveTime: `+${baselineDuration} min`,
      });
      routeCards.push({
        id: "direct-2",
        trainId: "CR_1002",
        badge: "Standard Local",
        badgeColor: "green",
        badgeIcon: "💰",
        badgeSubtext: baselineLine,
        duration: `${baselineDuration + 6} min`,
        fare: `₹${secondClassFare}`,
        type: `Slow Local - ${baselineLine}`,
        crowdLevel: "low",
        crowdPercent: 30,
        class: "Second Class",
        isBest: false,
        isDirect: true,
        departTime: "Departs Now",
        arriveTime: `+${baselineDuration + 6} min`,
      });
    }

    // Add Alternative Route card if an alternative exists, BUT badge is "Alternative Route", NOT "Bypass Recommended"!
    if (altRailwayRoutes.length > 0) {
      const alt = altRailwayRoutes[0];
      routeCards.push({
        id: alt.id || "alt-1",
        trainId: "ALT_1",
        badge: "Alternative Route",
        badgeColor: "teal",
        badgeIcon: "🔄",
        badgeSubtext: alt.via,
        duration: `${alt.estimatedTimeMins || 42} min`,
        fare: `₹${secondClassFare + 10}`,
        type: alt.label || alt.via,
        crowdLevel: "low",
        crowdPercent: 30,
        class: "Standard / Interchange",
        isBest: false,
        isDirect: false,
        departTime: "Departs Now",
        arriveTime: `+${alt.estimatedTimeMins || 42} min`,
      });
    }
  }

  return { recommendBypass, reason: bypassReason, routes: routeCards };
};

