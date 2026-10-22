import { INTERCHANGE_STATIONS } from "../client/src/utils/allStations.js";
import { getAvailableRoutes } from "../client/src/utils/routeUtils.js";
import { searchUpcomingTrains } from "../client/src/utils/timetableData.js";

console.log("==================================================");
console.log("TESTING INTERCHANGE-AWARE CROSS-LINE ROUTING");
console.log("==================================================");

// 1. Audit Interchange Dataset
console.log("\n[1] AUDITING INTERCHANGE DATASET...");
const interchangeKeys = Object.keys(INTERCHANGE_STATIONS);
console.log("Total Interchange Nodes defined:", interchangeKeys.length);
interchangeKeys.forEach((key) => {
  const node = INTERCHANGE_STATIONS[key];
  console.log(` - ${node.name}: Lines [${node.lines.join(", ")}] | Train Change Required: ${node.requiresTrainChange}`);
});

// 2. Test Specific Required Journey Pairs
const testJourneys = [
  { source: "Mumbai Central", dest: "Thane", label: "Western → Central" },
  { source: "Thane", dest: "Mumbai Central", label: "Central → Western" },
  { source: "Thane", dest: "Vashi", label: "Central → Harbour" },
  { source: "Vashi", dest: "Thane", label: "Harbour → Central" },
  { source: "Mumbai Central", dest: "Vashi", label: "Western → Harbour" },
  { source: "Vashi", dest: "Mumbai Central", label: "Harbour → Western" },
  { source: "CSMT", dest: "Airoli", label: "Central → Trans-Harbour" },
  { source: "Airoli", dest: "CSMT", label: "Trans-Harbour → Central" },
  { source: "Mumbai Central", dest: "Airoli", label: "Western → Trans-Harbour" },
  { source: "Airoli", dest: "Mumbai Central", label: "Trans-Harbour → Western" },
  { source: "Thane", dest: "Airoli", label: "Trans-Harbour Direct" },
];

console.log("\n[2] TESTING ROUTE CALCULATION & TRAIN CHANGE DETECTION...");
let allPassed = true;

testJourneys.forEach(({ source, dest, label }) => {
  console.log(`\n--------------------------------------------------`);
  console.log(`JOURNEY: ${source} ➔ ${dest} (${label})`);
  
  const routes = getAvailableRoutes(source, dest);
  if (routes.length === 0) {
    console.error(`FAIL: No routes found for ${source} to ${dest}`);
    allPassed = false;
    return;
  }

  const recRoute = routes.find((r) => r.isRecommended) || routes[0];
  console.log(`Recommended Via Option : ${recRoute.via}`);
  console.log(`Path                   : ${recRoute.path.join(" ➔ ")}`);
  console.log(`Interchanges           : ${recRoute.interchanges ? recRoute.interchanges.join(", ") : "None"}`);
  console.log(`Transfers              : ${recRoute.transfers ? recRoute.transfers.join(" | ") : "None"}`);

  // Train selection test
  const trains = searchUpcomingTrains(source, dest, new Date(), [], recRoute.via);
  if (trains.length === 0) {
    console.error(`FAIL: No train services found for ${source} to ${dest}`);
    allPassed = false;
    return;
  }

  const selectedTrain = trains[0];
  console.log(`Selected Train Service : ${selectedTrain.name}`);
  console.log(`Is Direct Train        : ${selectedTrain.isDirect}`);
  if (selectedTrain.segments && selectedTrain.segments.length > 0) {
    console.log(`Segments Breakdown (${selectedTrain.segments.length} segments):`);
    selectedTrain.segments.forEach((seg, idx) => {
      console.log(`  Seg ${seg.segmentNumber}: ${seg.source} ➔ ${seg.destination} (${seg.line}) | Train: ${seg.train_name} (${seg.departureTime})`);
      if (selectedTrain.transfers && selectedTrain.transfers[idx]) {
        console.log(`  >>> ${selectedTrain.transfers[idx]} <<<`);
      }
    });
  }
});

console.log("\n==================================================");
if (allPassed) {
  console.log("SUCCESS: ALL INTERCHANGE & CROSS-LINE ROUTE TESTS PASSED!");
} else {
  console.log("FAILURE: SOME ROUTE TESTS FAILED!");
}
console.log("==================================================");
