import { getAllStations } from "./allStations.js";
import { westernLineStations } from "./stations.js";

// Calculate fare based on distance and class across all railway lines
export const calculateFare = (
  source,
  destination,
  ticketClass = "Second Class",
  ticketType = "Single Journey",
  passengers = 1,
) => {
  if (!source || !destination || source === destination) return 0;

  const allStns = getAllStations();
  const sourceObj = allStns.find(
    (s) => s.name.toLowerCase() === source.toLowerCase(),
  );
  const destObj = allStns.find(
    (s) => s.name.toLowerCase() === destination.toLowerCase(),
  );

  let distance = 5; // Default distance unit

  if (sourceObj && destObj) {
    if (
      sourceObj.line === destObj.line &&
      typeof sourceObj.distance === "number" &&
      typeof destObj.distance === "number"
    ) {
      distance = Math.abs(destObj.distance - sourceObj.distance);
    } else {
      // Calculate distance using coordinates
      const latDiff = Math.abs(destObj.lat - sourceObj.lat) * 111;
      const lngDiff = Math.abs(destObj.lng - sourceObj.lng) * 105;
      distance = Math.max(
        1,
        Math.round(Math.sqrt(latDiff * latDiff + lngDiff * lngDiff)),
      );
    }
  } else {
    // Fallback to westernLineStations index difference
    const sIdx = westernLineStations.indexOf(source);
    const dIdx = westernLineStations.indexOf(destination);
    if (sIdx !== -1 && dIdx !== -1) {
      distance = Math.abs(dIdx - sIdx);
    }
  }

  // Base fare calculation (Second Class)
  let baseFare = 5;
  if (distance <= 2) {
    baseFare = 5;
  } else if (distance <= 6) {
    baseFare = 10;
  } else if (distance <= 12) {
    baseFare = 15;
  } else {
    baseFare = 20;
  }

  // Class multipliers
  let classMultiplier = 1;
  if (ticketClass.includes("First")) {
    classMultiplier = 2;
  } else if (ticketClass.includes("AC")) {
    classMultiplier = 4;
  }

  // Journey type multiplier
  const journeyMultiplier = ticketType.includes("Return") ? 2 : 1;

  // Calculate total fare
  const count = parseInt(passengers) || 1;
  const totalFare = Math.max(5, baseFare * classMultiplier * journeyMultiplier * count);

  return totalFare;
};

// Calculate Season Ticket fare (Monthly, Quarterly, Yearly)
export const calculateSeasonFare = (
  source,
  destination,
  ticketClass = "Second Class",
  seasonType = "Monthly",
  ticketMode = "rail",
) => {
  let singleFare = 0;
  if (ticketMode === "metro") {
    singleFare = calculateFare(source, destination, ticketClass, "Single Journey", 1);
    if (!singleFare) singleFare = 20; // Default Metro single fare fallback
  } else {
    singleFare = calculateFare(source, destination, ticketClass, "Single Journey", 1);
  }
  if (!singleFare) return 0;

  let multiplier = 15; // Monthly ~ 15 single journeys
  const type = (seasonType || "").toLowerCase();
  if (type.includes("quarter")) {
    multiplier = 40; // Quarterly
  } else if (type.includes("year") || type.includes("annual")) {
    multiplier = 140; // Yearly
  }

  return singleFare * multiplier;
};

