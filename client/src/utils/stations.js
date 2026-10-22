import {
  railwayStations,
  allRailwayStationsList,
  allMetroStationsList,
  localStationCategories,
  getStationLines,
  getStationDisplayLabel,
} from "./allStations.js";

// Export station lists for each corridor directly from centralized railwayStations
export const westernLineStations = railwayStations.western.map((s) => s.name);
export const centralLineStations = railwayStations.central.map((s) => s.name);
export const harbourLineStations = railwayStations.harbour.map((s) => s.name);
export const transHarbourLineStations = (railwayStations.transharbour || []).map((s) => s.name);

export {
  allRailwayStationsList,
  allMetroStationsList,
  localStationCategories,
  getStationLines,
  getStationDisplayLabel,
};

