import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import {
  Train,
  Search,
  Bell,
  Calendar,
  ArrowRight,
  Plus,
  Minus,
  Navigation as MyLocationIcon,
  MapPin,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Navbar from "../components/Navbar";
import { westernLineStations, allRailwayStationsList } from "../utils/stations";
import { calculateFare } from "../utils/fareCalculator";
import { getAvailableRoutes, calculateJourneyRouteOptions } from "../utils/routeUtils";
import {
  railwayStations,
  getAllStations,
  getLineCoordinates,
  lineColors,
  getStationDisplayLabel,
} from "../utils/allStations";
import { searchUpcomingTrains, normalizeStationName } from "../utils/timetableData";
import { checkJourneyDisruption, fetchActiveDisruptions, triggerSMSNotification } from "../utils/disruptionService";

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Mumbai Railway Stations Data (All Lines - Western, Central, Harbour)
const stations = getAllStations().map((station) => ({
  ...station,
  platform: `Platform ${Math.floor(Math.random() * 5) + 1}`,
  status: "On Time",
}));


// Create custom icons for stations with line colors and name labels
const createStationIcon = (
  isHighlight,
  color = "#2EC4B6",
  stationName = "",
) => {
  return L.divIcon({
    className: "custom-station-marker",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="
          width: ${isHighlight ? "14px" : "10px"};
          height: ${isHighlight ? "14px" : "10px"};
          background-color: ${isHighlight ? "#5700d1" : color};
          border: ${isHighlight ? "3px" : "2px"} solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        "></div>
        ${
          stationName
            ? `
          <div style="
            position: absolute;
            top: ${isHighlight ? "18px" : "14px"};
            white-space: nowrap;
            background-color: rgba(255, 255, 255, 0.95);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            color: #1f2937;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            border: 1px solid ${color};
          ">${stationName}</div>
        `
            : ""
        }
      </div>
    `,
    iconSize: [isHighlight ? 14 : 10, isHighlight ? 14 : 10],
    iconAnchor: [isHighlight ? 7 : 5, isHighlight ? 7 : 5],
  });
};

// Create source station icon (green)
const createSourceIcon = () => {
  return L.divIcon({
    className: "custom-station-marker",
    html: `<div style="
            width: 24px;
            height: 24px;
            background-color: #10b981;
            border: 4px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
        ">📍</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Create destination station icon (red)
const createDestinationIcon = () => {
  return L.divIcon({
    className: "custom-station-marker",
    html: `<div style="
            width: 24px;
            height: 24px;
            background-color: #ef4444;
            border: 4px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
        ">🎯</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Create train icon
const createTrainIcon = () => {
  return L.divIcon({
    className: "custom-train-marker",
    html: `<div style="
            width: 32px;
            height: 32px;
            background-color: #8b5cf6;
            border: 3px solid white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            animation: trainPulse 2s infinite;
        ">🚆</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Map Controller to handle zoom
const MapController = ({ onZoomIn, onZoomOut, onLocate, onZoomChange }) => {
  const map = useMap();

  useEffect(() => {
    // Track zoom changes
    const handleZoom = () => {
      if (onZoomChange) {
        onZoomChange(map.getZoom());
      }
    };

    map.on("zoomend", handleZoom);
    // Set initial zoom
    if (onZoomChange) {
      onZoomChange(map.getZoom());
    }

    return () => {
      map.off("zoomend", handleZoom);
    };
  }, [map, onZoomChange]);

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  const handleLocate = () => {
    map.setView([19.0176, 72.8432], 12); // Center on Dadar
  };

  return (
    <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-[1000]">
      <div className="bg-white rounded-lg shadow-lg flex flex-col overflow-hidden">
        <button
          onClick={handleZoomIn}
          className="p-3 hover:bg-gray-100 transition-colors border-b border-gray-100"
        >
          <Plus className="w-5 h-5 text-gray-900" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-3 hover:bg-gray-100 transition-colors"
        >
          <Minus className="w-5 h-5 text-gray-900" />
        </button>
      </div>
      <button
        onClick={handleLocate}
        className="bg-white p-3 rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
      >
        <MyLocationIcon className="w-5 h-5 text-gray-900" />
      </button>
    </div>
  );
};

const LiveMap = () => {
  const { user } = useUser();
  const [source, setSource] = useState(() => localStorage.getItem("selected_source") || "Thane");
  const [destination, setDestination] = useState(() => localStorage.getItem("selected_destination") || "Juinagar");
  const [activeFilter, setActiveFilter] = useState("all");
  const [routes, setRoutes] = useState([]);
  const [showRoutes, setShowRoutes] = useState(true);
  const [trains, setTrains] = useState([]);
  const [selectedTrainId, setSelectedTrainId] = useState(() => localStorage.getItem("selected_train_id") || "");
  const [zoomLevel, setZoomLevel] = useState(12);
  const [disruptionInfo, setDisruptionInfo] = useState(null);
  const [smsSending, setSmsSending] = useState(false);
  const [selectedStations, setSelectedStations] = useState({
    source: null,
    destination: null,
  });

  const handleSendSMSClick = async () => {
    if (!source || !destination) return;
    setSmsSending(true);
    try {
      const userPhone = user?.primaryPhoneNumber?.phoneNumber || user?.phoneNumbers?.[0]?.phoneNumber || user?.unsafeMetadata?.phone || "";
      const res = await triggerSMSNotification(source, destination, userPhone);
      setDisruptionInfo(res);
    } catch (e) {
      console.error("SMS dispatch error:", e);
    } finally {
      setSmsSending(false);
    }
  };



  const renderStationSelectOptions = () => (
    <>
      <optgroup label="Central Line">
        {railwayStations.central.map((s) => (
          <option key={`c-${s.id}`} value={s.name}>
            {getStationDisplayLabel(s.name)}
          </option>
        ))}
      </optgroup>
      <optgroup label="Western Line">
        {railwayStations.western.map((s) => (
          <option key={`w-${s.id}`} value={s.name}>
            {getStationDisplayLabel(s.name)}
          </option>
        ))}
      </optgroup>
      <optgroup label="Harbour Line">
        {railwayStations.harbour.map((s) => (
          <option key={`h-${s.id}`} value={s.name}>
            {getStationDisplayLabel(s.name)}
          </option>
        ))}
      </optgroup>
      <optgroup label="Trans-Harbour Line">
        {(railwayStations.transharbour || []).map((s) => (
          <option key={`th-${s.id}`} value={s.name}>
            {getStationDisplayLabel(s.name)}
          </option>
        ))}
      </optgroup>
      <optgroup label="Metro Line 1">
        {railwayStations.metro1.map((s) => (
          <option key={`m1-${s.id}`} value={s.name}>
            {s.name} (Metro 1)
          </option>
        ))}
      </optgroup>
      <optgroup label="Metro Line 3">
        {railwayStations.metro3.map((s) => (
          <option key={`m3-${s.id}`} value={s.name}>
            {s.name} (Metro 3)
          </option>
        ))}
      </optgroup>
    </>
  );

  // Calculate routes & train positions when source and destination are selected
  useEffect(() => {
    let isMounted = true;

    async function loadJourneyData() {
      if (source && destination && source !== destination) {
        localStorage.setItem("selected_source", source);
        localStorage.setItem("selected_destination", destination);

        const allStns = getAllStations();
        const sourceStation = allStns.find((s) => normalizeStationName(s.name) === normalizeStationName(source));
        const destStation = allStns.find((s) => normalizeStationName(s.name) === normalizeStationName(destination));

        if (isMounted) {
          setSelectedStations({
            source: sourceStation || null,
            destination: destStation || null,
          });
        }

        // Check for verified journey disruption affecting source -> destination
        const disruptionCheck = await checkJourneyDisruption(source, destination);

        if (isMounted) {
          setDisruptionInfo(disruptionCheck);
        }

        const activeDisruption = disruptionCheck?.isAffected ? disruptionCheck.affectedDisruption : null;
        const activeDisruptionsList = activeDisruption ? [activeDisruption] : (disruptionCheck?.allMatchingDisruptions || []);

        // Find actual upcoming trains from common timetable service layer, excluding disrupted ones
        const upcoming = searchUpcomingTrains(source, destination, new Date(), activeDisruptionsList);

        // Map upcoming services to map markers
        const trainMarkers = upcoming.map((t) => {
          const curStnName = t.currentStation || t.sourceStation;
          const stnObj = allStns.find((s) => normalizeStationName(s.name) === normalizeStationName(curStnName)) || sourceStation || { lat: 19.0176, lng: 72.8432 };

          return {
            id: t.train_id,
            name: t.name,
            type: t.type,
            line: t.line,
            lat: stnObj.lat,
            lng: stnObj.lng,
            currentStation: curStnName,
            nextStation: t.destStation,
            departureTime: t.departureTime,
            arrivalTime: t.arrivalTime,
            status: activeDisruption && activeDisruption.affectedTrains?.includes(t.train_id) ? "DISRUPTED / DELAYED" : "Scheduled Operational",
            isDirect: t.isDirect,
            allStops: t.allStops,
          };
        });

        if (isMounted) {
          setTrains(trainMarkers);
        }

        // Calculate dynamic journey route options (evaluating baseline, crowd, disruptions, alternatives)
        const routeAnalysis = calculateJourneyRouteOptions({
          source,
          destination,
          referenceDate: new Date(),
          activeDisruptions: activeDisruptionsList,
        });

        if (isMounted) {
          setRoutes(routeAnalysis.routes || []);
          setShowRoutes(true);
        }
      } else {
        if (isMounted) {
          setRoutes([]);
          setShowRoutes(false);
          setTrains([]);
          setDisruptionInfo(null);
          setSelectedStations({ source: null, destination: null });
        }
      }
    }

    loadJourneyData();

    return () => {
      isMounted = false;
    };
  }, [source, destination]);


  // Filter routes based on active filter
  const filteredRoutes = routes.filter((route) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "fastest") return route.isBest || route.badge === "Fastest Option" || route.badge === "Bypass Recommended";
    if (activeFilter === "direct") return route.isDirect !== false && !route.type.toLowerCase().includes("switch") && !route.type.toLowerCase().includes("via trans-harbour");
    if (activeFilter === "ac") return route.class === "AC Local" || route.type.includes("AC") || (route.class && route.class.includes("Metro"));
    return true;
  });

  const handleFindRoutes = () => {
    if (source && destination && source !== destination) {
      setShowRoutes(true);
    }
  };

  return (
    <>
      <style>{`
                .custom-station-marker, .custom-train-marker {
                    background: transparent !important;
                    border: none !important;
                }
                .leaflet-popup-content-wrapper {
                    border-radius: 0.75rem;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                }
                .leaflet-popup-tip {
                    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
                }
                .leaflet-container {
                    font-family: inherit;
                }
                @keyframes trainPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
            `}</style>
      <div className="min-h-screen overflow-hidden h-screen flex flex-col font-sans">
        <Navbar />

        {/* Main Layout: Split Screen */}
        <main className="flex flex-1 overflow-hidden relative">
          {/* LEFT PANEL: Route List */}
          <aside className="w-full lg:w-[480px] xl:w-[520px] flex flex-col bg-white/60 backdrop-blur-xl border-r border-purple-100 z-10 shadow-xl shrink-0 h-full">
            {/* Station Selection */}
            <div className="px-6 pt-6 pb-4 shrink-0 bg-gradient-to-br from-purple-50 to-white border-b border-purple-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-700" />
                Plan Your Journey
              </h2>

              {/* Source Selection */}
              <div className="mb-3">
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                  From
                </label>
                <select
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value);
                    localStorage.setItem("selected_source", e.target.value);
                  }}
                  className="w-full px-4 py-2.5 rounded-lg bg-white border-2 border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none font-semibold text-gray-800 transition-all"
                >
                  <option value="">Select Source Station</option>
                  {renderStationSelectOptions()}
                </select>
              </div>

              {/* Destination Selection */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                  To
                </label>
                <select
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    localStorage.setItem("selected_destination", e.target.value);
                  }}
                  className="w-full px-4 py-2.5 rounded-lg bg-white border-2 border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none font-semibold text-gray-800 transition-all"
                >
                  <option value="">Select Destination Station</option>
                  {renderStationSelectOptions()}
                </select>
              </div>

              {/* Find Routes Button */}
              <button
                onClick={handleFindRoutes}
                disabled={!source || !destination || source === destination}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                Find Optimized Routes
              </button>
            </div>

            {/* Route Header Summary */}
            {showRoutes && (
              <div className="px-6 pt-4 pb-2 shrink-0">

                <div className="flex flex-col gap-1 mb-4">
                  <div className="flex items-center gap-2 text-purple-600 text-sm font-medium">
                    <Calendar className="w-4 h-4" />
                    <span>Today, Departs Now</span>
                  </div>
                  <h1 className="text-gray-900 tracking-tight text-2xl font-bold leading-tight">
                    {source} <span className="text-purple-700 mx-1">→</span>{" "}
                    {destination}
                  </h1>
                  <p className="text-purple-600 text-sm">
                    {filteredRoutes.length} {disruptionInfo?.isAffected ? "alternative routes calculated" : "optimized routes found"}
                  </p>
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setActiveFilter("all")}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium shadow-sm whitespace-nowrap transition-colors ${
                      activeFilter === "all"
                        ? "bg-purple-700 text-white"
                        : "bg-white border border-purple-200 text-gray-900 hover:bg-purple-50"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveFilter("fastest")}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium shadow-sm whitespace-nowrap transition-colors ${
                      activeFilter === "fastest"
                        ? "bg-purple-700 text-white"
                        : "bg-white border border-purple-200 text-gray-900 hover:bg-purple-50"
                    }`}
                  >
                    Fastest
                  </button>
                  <button
                    onClick={() => setActiveFilter("direct")}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium shadow-sm whitespace-nowrap transition-colors ${
                      activeFilter === "direct"
                        ? "bg-purple-700 text-white"
                        : "bg-white border border-purple-200 text-gray-900 hover:bg-purple-50"
                    }`}
                  >
                    Direct
                  </button>
                  <button
                    onClick={() => setActiveFilter("ac")}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium shadow-sm whitespace-nowrap transition-colors ${
                      activeFilter === "ac"
                        ? "bg-purple-700 text-white"
                        : "bg-white border border-purple-200 text-gray-900 hover:bg-purple-50"
                    }`}
                  >
                    AC Local
                  </button>
                </div>
              </div>
            )}

            {/* Route Cards Container */}
            <div
              className="flex-1 overflow-y-auto p-6 pt-2 flex flex-col gap-4 min-h-0"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#cbd5e1 transparent",
              }}
            >
              {!showRoutes ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-10 h-10 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Select Your Journey
                  </h3>
                  <p className="text-gray-600 max-w-xs">
                    Choose your source and destination stations to discover the
                    best routes for your trip.
                  </p>
                </div>
              ) : filteredRoutes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Train className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    No Routes Found
                  </h3>
                  <p className="text-gray-600 max-w-xs">
                    Try adjusting your filters or selecting different stations.
                  </p>
                </div>
              ) : (
                <>
                  {filteredRoutes.map((route) => (
                    <RouteCard
                      key={route.id}
                      badge={route.badge}
                      badgeColor={route.badgeColor}
                      badgeIcon={route.badgeIcon}
                      badgeSubtext={route.badgeSubtext}
                      duration={route.duration}
                      departTime={new Date().toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      arriveTime={new Date(
                        Date.now() + parseInt(route.duration) * 60000,
                      ).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      fare={route.fare}
                      route={[
                        {
                          type: "train",
                          name: route.type,
                          color: "purple",
                          direct: true,
                        },
                      ]}
                      crowdLevel={route.crowdLevel}
                      crowdPercent={route.crowdPercent}
                      isBest={route.isBest}
                      source={source}
                      destination={destination}
                    />
                  ))}
                </>
              )}
            </div>
          </aside>

          {/* RIGHT PANEL: Map View */}
          <section className="hidden lg:block flex-1 relative bg-gray-200 h-full">
            {/* Leaflet Map Container */}
            <MapContainer
              center={[19.0176, 72.8432]}
              zoom={12}
              className="w-full h-full z-0"
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Polylines for all railway and metro lines - Background */}
              <Polyline
                positions={getLineCoordinates("western")}
                color={lineColors.western}
                weight={4}
                opacity={0.7}
              />
              <Polyline
                positions={getLineCoordinates("central")}
                color={lineColors.central}
                weight={4}
                opacity={0.7}
              />
              <Polyline
                positions={getLineCoordinates("harbour")}
                color={lineColors.harbour}
                weight={4}
                opacity={0.7}
              />
              <Polyline
                positions={getLineCoordinates("metro1")}
                color={lineColors.metro1}
                weight={4}
                opacity={0.8}
              />
              <Polyline
                positions={getLineCoordinates("metro3")}
                color={lineColors.metro3}
                weight={4}
                opacity={0.8}
              />

              {/* Highlighted Route between selected stations */}
              {selectedStations.source &&
                selectedStations.destination &&
                (() => {
                  const allStns = getAllStations();
                  const activeTrain = trains.find((t) => t.id === selectedTrainId) || trains[0];

                  if (activeTrain && activeTrain.allStops && activeTrain.allStops.length > 0) {
                    const stopPositions = activeTrain.allStops
                      .map((st) => {
                        const found = allStns.find((s) => normalizeStationName(s.name) === normalizeStationName(st.station));
                        return found ? [found.lat, found.lng] : null;
                      })
                      .filter(Boolean);

                    if (stopPositions.length > 1) {
                      return (
                        <Polyline
                          positions={stopPositions}
                          color="#8b5cf6"
                          weight={6}
                          opacity={0.9}
                        />
                      );
                    }
                  }

                  if (selectedStations.source && selectedStations.destination) {
                    return (
                      <Polyline
                        positions={[
                          [selectedStations.source.lat, selectedStations.source.lng],
                          [selectedStations.destination.lat, selectedStations.destination.lng],
                        ]}
                        color="#8b5cf6"
                        weight={6}
                        opacity={0.9}
                      />
                    );
                  }
                  return null;
                })()}

              {/* Station Markers */}
              {stations.map((station, idx) => {
                const isSource = normalizeStationName(station.name) === normalizeStationName(source);
                const isDestination = normalizeStationName(station.name) === normalizeStationName(destination);
                const isOnRoute =
                  selectedStations.source &&
                  selectedStations.destination &&
                  (isSource || isDestination);

                return (
                  <Marker
                    key={station.id}
                    position={[station.lat, station.lng]}
                    icon={
                      isSource
                        ? createSourceIcon()
                        : isDestination
                          ? createDestinationIcon()
                          : createStationIcon(
                              isOnRoute,
                              station.color,
                              zoomLevel >= 13 ? station.name : "",
                            )
                    }
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold text-gray-900">
                          {station.name}
                        </p>
                        <p
                          className="text-xs font-semibold"
                          style={{ color: station.color }}
                        >
                          {station.line} Line
                        </p>
                        {station.distance !== undefined && (
                          <p className="text-xs text-gray-600">
                            Distance: {station.distance} km
                          </p>
                        )}
                        {isSource && (
                          <p className="text-xs text-green-600 font-bold">
                            📍 Source Station
                          </p>
                        )}
                        {isDestination && (
                          <p className="text-xs text-red-600 font-bold">
                            🎯 Destination Station
                          </p>
                        )}
                        <p className="text-xs text-gray-600">
                          {station.platform}
                        </p>
                        <p className="text-xs font-medium text-green-600">
                          Scheduled Operational
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Train Markers (Scheduled / Actual train locations) */}
              {trains.map((train) => (
                <Marker
                  key={train.id}
                  position={[train.lat, train.lng]}
                  icon={createTrainIcon()}
                >
                  <Popup>
                    <div className="text-sm space-y-1">
                      <p className="font-bold text-purple-700">
                        🚆 {train.name}
                      </p>
                      <p className="text-xs text-gray-700 font-semibold">
                        Service ID: <span className="font-mono">{train.id}</span>
                      </p>
                      <p className="text-xs text-gray-600">
                        Line: {train.line} • Type: {train.type}
                      </p>
                      <p className="text-xs text-gray-600">
                        At/From Station: <strong className="text-gray-900">{train.currentStation}</strong>
                      </p>
                      <p className="text-xs text-purple-600 font-medium">
                        Source Dep: {train.departureTime} ➔ Dest Arr: {train.arrivalTime}
                      </p>
                      <p className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {train.status}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Map Controls */}
              <MapController onZoomChange={setZoomLevel} />
            </MapContainer>

            {/* Railway Lines Legend */}
            <div className="absolute top-6 left-6 z-[1000] bg-white p-4 rounded-xl shadow-lg border border-gray-200 max-h-[90vh] overflow-y-auto">
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                Transit Lines
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-1 rounded"
                    style={{ backgroundColor: lineColors.western }}
                  ></div>
                  <span className="text-xs font-medium text-gray-700">
                    Western Line
                  </span>
                  <span className="text-xs text-gray-500">(29)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-1 rounded"
                    style={{ backgroundColor: lineColors.central }}
                  ></div>
                  <span className="text-xs font-medium text-gray-700">
                    Central Line
                  </span>
                  <span className="text-xs text-gray-500">(26)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-1 rounded"
                    style={{ backgroundColor: lineColors.harbour }}
                  ></div>
                  <span className="text-xs font-medium text-gray-700">
                    Harbour Line
                  </span>
                  <span className="text-xs text-gray-500">(24)</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-1 rounded"
                      style={{ backgroundColor: lineColors.metro1 }}
                    ></div>
                    <span className="text-xs font-medium text-gray-700">
                      Metro Line 1
                    </span>
                    <span className="text-xs text-gray-500">(12)</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div
                      className="w-6 h-1 rounded"
                      style={{ backgroundColor: lineColors.metro3 }}
                    ></div>
                    <span className="text-xs font-medium text-gray-700">
                      Metro Line 3
                    </span>
                    <span className="text-xs text-gray-500">(27)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Floating Info Card (Route Summary on Map) */}
            {showRoutes && source && destination && (
              <div className="absolute top-6 right-6 z-[1000] bg-white p-4 rounded-xl shadow-xl max-w-xs border border-purple-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-900">Route Preview</h3>
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded font-medium">
                    Live
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <div className="size-2.5 rounded-full bg-purple-700"></div>
                    <div className="w-0.5 h-8 bg-gray-200"></div>
                    <div className="size-2.5 rounded-full border-2 border-purple-700 bg-white"></div>
                  </div>
                  <div className="flex flex-col gap-4 w-full">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {source}
                      </p>
                      <p className="text-xs text-gray-500">
                        Platform 4 • On Time
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {destination}
                      </p>
                      <p className="text-xs text-gray-500">
                        Est. Arrival{" "}
                        {new Date(
                          Date.now() +
                            parseInt(routes[0]?.duration || 0) * 60000,
                        ).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
};

// Route Card Component
const RouteCard = ({
  badge,
  badgeColor,
  badgeIcon,
  badgeSubtext,
  duration,
  departTime,
  arriveTime,
  fare,
  route,
  crowdLevel,
  crowdPercent,
  isBest,
  source,
  destination,
}) => {
  const badgeColors = {
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    green: "bg-gray-50 border-gray-200 text-green-700",
    teal: "bg-teal-50 border-teal-200 text-teal-600",
  };

  const crowdColors = {
    low: { text: "text-teal-600", bg: "bg-teal-500", icon: "😊" },
    moderate: { text: "text-yellow-700", bg: "bg-yellow-500", icon: "👥" },
    high: { text: "text-red-700", bg: "bg-red-500", icon: "🚶" },
  };

  const borderClass = isBest
    ? "border-2 border-purple-700"
    : "border border-purple-200";

  return (
    <div
      className={`group relative flex flex-col gap-0 rounded-xl bg-white shadow-md ${borderClass} transition-all hover:shadow-lg cursor-pointer min-h-[200px]`}
    >
      {/* Badge */}
      <div
        className={`${badgeColors[badgeColor]} px-4 py-1.5 flex justify-between items-center border-b ${badgeColor === "purple" ? "border-purple-200" : badgeColor === "teal" ? "border-teal-200" : "border-gray-200"}`}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[18px]">{badgeIcon}</span>
          <span className="text-xs font-bold uppercase tracking-wider">
            {badge}
          </span>
        </div>
        {badgeSubtext && (
          <span className="text-xs font-semibold">{badgeSubtext}</span>
        )}
      </div>

      <div className="p-5 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-3xl font-bold text-gray-900">{duration}</span>
            <div className="flex items-center gap-1 text-purple-600 text-sm mt-1">
              <span>{departTime}</span>
              <ArrowRight className="w-4 h-4" />
              <span>{arriveTime}</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span
              className={`text-xl font-bold ${badgeColor === "green" ? "text-green-600" : "text-gray-900"}`}
            >
              {fare}
            </span>
            <span className="text-xs text-purple-600">Total fare</span>
          </div>
        </div>

        {/* Route visualizer */}
        <div className="flex items-center gap-2 text-sm text-gray-900 bg-purple-50 p-2.5 rounded-lg border border-purple-100">
          {route.map((segment, idx) => (
            <React.Fragment key={idx}>
              {segment.type === "train" && (
                <>
                  <Train
                    className={`w-5 h-5 ${segment.color === "purple" ? "text-purple-700" : "text-teal-600"}`}
                  />
                  <span className="font-medium">{segment.name}</span>
                </>
              )}
              {segment.type === "metro" && (
                <>
                  <Train className="w-5 h-5 text-teal-600" />
                  <span className="font-medium">{segment.name}</span>
                </>
              )}
              {segment.type === "ac" && (
                <>
                  <span className="text-teal-600">❄️</span>
                  <span className="font-medium">{segment.name}</span>
                </>
              )}
              {segment.type === "switch" && (
                <>
                  <span className="text-gray-400">›</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">
                    Switch
                  </span>
                  <span className="text-gray-400">›</span>
                </>
              )}
              {segment.direct && (
                <span className="ml-auto text-xs text-gray-500">Direct</span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Crowd & Action */}
        <div className="flex items-center justify-between pt-2 border-t border-purple-100 mt-1">
          <div className="flex flex-col gap-1 w-1/2">
            <div className="flex items-center gap-2">
              <span className="text-[18px]">
                {crowdColors[crowdLevel].icon}
              </span>
              <span
                className={`text-xs font-medium ${crowdColors[crowdLevel].text}`}
              >
                {crowdLevel === "low"
                  ? "Low Crowd"
                  : crowdLevel === "moderate"
                    ? "Moderate Crowd"
                    : "High Density"}
              </span>
            </div>
            <div className="h-1.5 w-full bg-purple-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${crowdColors[crowdLevel].bg}`}
                style={{ width: `${crowdPercent}%` }}
              ></div>
            </div>
          </div>
          <button
            className={`${isBest ? "bg-purple-700 hover:bg-purple-800 text-white" : "bg-purple-100 hover:bg-purple-200 text-purple-700"} text-sm font-medium px-5 py-2 rounded-lg transition-colors flex items-center gap-2`}
          >
            Select {isBest && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
