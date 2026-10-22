const { railwayStations } = require('../client/src/utils/allStations.js');
const { ALL_TRAIN_SERVICES, normalizeStationName, searchUpcomingTrains } = require('../client/src/utils/timetableData.js');

const allStationsList = [
  ...railwayStations.western,
  ...railwayStations.central,
  ...railwayStations.harbour,
  ...(railwayStations.transharbour || [])
];

function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findNearestStation(lat, lng) {
  let minDistance = Infinity;
  let nearest = null;

  allStationsList.forEach((stn) => {
    if (stn.lat && stn.lng) {
      const dist = getHaversineDistance(lat, lng, stn.lat, stn.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = stn;
      }
    }
  });

  return { nearest, distanceKm: minDistance };
}

// Test coordinates
console.log("=== 1. TEST NEAREST STATION DETECTION ===");
console.log("Dadar Coords (19.0176, 72.8432) ->", findNearestStation(19.0176, 72.8432).nearest.name);
console.log("Borivali Coords (19.2292, 72.8571) ->", findNearestStation(19.2292, 72.8571).nearest.name);
console.log("Thane Coords (19.1972, 72.9722) ->", findNearestStation(19.1972, 72.9722).nearest.name);

console.log("\n=== 2. TEST STATION TRAIN SCHEDULING ===");
function getTrainsForStation(stationName, now = new Date()) {
  const sNorm = normalizeStationName(stationName);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const results = [];
  ALL_TRAIN_SERVICES.forEach((service) => {
    const stopIdx = service.stops.findIndex((st) => normalizeStationName(st.station) === sNorm);
    if (stopIdx !== -1) {
      const stop = service.stops[stopIdx];
      const [h, m] = stop.time.split(":").map(Number);
      const stopMins = h * 60 + m;
      let diff = stopMins - currentMinutes;

      if (diff < -10) {
        // rollover if overnight
        if (diff + 1440 <= 360) {
          diff += 1440;
        } else {
          return;
        }
      }

      if (diff >= -10 && diff <= 360) {
        let eta = `${diff} min`;
        if (diff <= 0) eta = "Arriving Now";
        else if (diff >= 60) eta = `${Math.floor(diff / 60)}h ${diff % 60}m`;

        const origin = service.stops[0].station;
        const destination = service.stops[service.stops.length - 1].station;

        results.push({
          id: service.train_id,
          name: `${origin} - ${destination} ${service.type}`,
          type: service.type,
          line: service.line,
          arrivalTime: stop.time,
          eta,
          diffMinutes: diff,
        });
      }
    }
  });

  return results.sort((a, b) => a.diffMinutes - b.diffMinutes);
}

const borivaliTrains = getTrainsForStation("Borivali");
console.log("Upcoming trains for Borivali (Count):", borivaliTrains.length);
console.log("First 3 Borivali trains:", borivaliTrains.slice(0, 3));

console.log("\n=== 3. TEST ROUTE SEARCH (Churchgate to Virar) ===");
const routeResults = searchUpcomingTrains("Churchgate", "Virar");
console.log("Route search 'Churchgate to Virar' matches:", routeResults.length);
console.log("First 2 route matches:", routeResults.slice(0, 2));
