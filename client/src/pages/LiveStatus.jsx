import React, { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import { Search, Train, MapPin, AlertTriangle, RefreshCw, Loader } from "lucide-react";
import { fetchActiveDisruptions } from "../utils/disruptionService";
import { railwayStations } from "../utils/allStations";
import { ALL_TRAIN_SERVICES, normalizeStationName, searchUpcomingTrains } from "../utils/timetableData";

// Helper function to get platform number based on train ID
const getTrainPlatform = (id) => {
  let seed = 0;
  for (let i = 0; i < (id || "").length; i++) seed += id.charCodeAt(i);
  return (seed % 4) + 1;
};

// Helper function to get crowd level model
const getTrainCrowd = (id) => {
  let seed = 0;
  for (let i = 0; i < (id || "").length; i++) seed += id.charCodeAt(i);
  const val = seed % 3;
  return val === 0 ? "Low" : val === 1 ? "Medium" : "High";
};

// Haversine distance formula to find nearest station to user GPS coordinates
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
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

const LiveStatus = () => {
  const [selectedStation, setSelectedStation] = useState(
    () => localStorage.getItem("selected_source") || "Dadar"
  );
  const [isManualStation, setIsManualStation] = useState(false);
  const [locationDetecting, setLocationDetecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [trains, setTrains] = useState([]);
  const [disruptions, setDisruptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Flatten all railway stations into a single list
  const allStationsList = useMemo(() => {
    const list = [
      ...railwayStations.western,
      ...railwayStations.central,
      ...railwayStations.harbour,
      ...(railwayStations.transharbour || []),
    ];
    // De-duplicate by station name
    const map = new Map();
    list.forEach((stn) => {
      if (!map.has(stn.name)) map.set(stn.name, stn);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // 1. Detect user geolocation on mount
  useEffect(() => {
    if (isManualStation) return;
    if ("geolocation" in navigator) {
      setLocationDetecting(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const uLat = pos.coords.latitude;
          const uLng = pos.coords.longitude;
          let minDist = Infinity;
          let nearest = null;

          allStationsList.forEach((stn) => {
            if (stn.lat && stn.lng) {
              const dist = getHaversineDistance(uLat, uLng, stn.lat, stn.lng);
              if (dist < minDist) {
                minDist = dist;
                nearest = stn;
              }
            }
          });

          if (nearest && minDist <= 50) {
            setSelectedStation(nearest.name);
          }
          setLocationDetecting(false);
        },
        (err) => {
          console.warn("Geolocation warning:", err.message);
          setLocationDetecting(false);
        },
        { timeout: 8000 }
      );
    }
  }, [allStationsList, isManualStation]);

  // 2. Fetch disruptions and calculate live trains
  useEffect(() => {
    fetchTrainStatus();

    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const statusInterval = setInterval(() => {
      fetchTrainStatus();
    }, 30000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(statusInterval);
    };
  }, [selectedStation, searchQuery]);

  const fetchTrainStatus = async () => {
    try {
      setLoading(true);
      const activeDisruptions = await fetchActiveDisruptions().catch(() => []);
      setDisruptions(activeDisruptions);
      processTrains(selectedStation, searchQuery, activeDisruptions);
      setError(null);
    } catch (err) {
      console.error("Error fetching train status:", err);
      setError("Failed to load train data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const processTrains = (station, query, activeDisruptions = []) => {
    const now = new Date();
    const currentMinutesIST = now.getHours() * 60 + now.getMinutes();

    const affectedTrainIds = new Set();
    const suspendedLines = new Set();
    (activeDisruptions || []).forEach((d) => {
      if (d.affectedTrains && Array.isArray(d.affectedTrains)) {
        d.affectedTrains.forEach((id) => affectedTrainIds.add(id));
      }
      if (d.type === "service_suspension" || d.type === "train_cancellation") {
        if (d.line) suspendedLines.add(d.line.toLowerCase());
      }
    });

    const trimmedQuery = (query || "").trim();

    // Check if query is a Route search (e.g., "Churchgate to Virar", "Andheri - Borivali", "Dadar → Thane")
    const routeParts = trimmedQuery.split(/\s*(?:to|-|→|->)\s*/i);
    let isRouteSearch = false;
    let routeOrigin = "";
    let routeDest = "";

    if (routeParts.length === 2 && routeParts[0].trim() && routeParts[1].trim()) {
      isRouteSearch = true;
      routeOrigin = routeParts[0].trim();
      routeDest = routeParts[1].trim();
    }

    if (isRouteSearch) {
      // Execute Route Search using timetable search engine
      const routeMatches = searchUpcomingTrains(routeOrigin, routeDest, now, activeDisruptions);
      const formattedRouteTrains = routeMatches.map((t) => {
        const isDisrupted = affectedTrainIds.has(t.train_id) || (t.line && suspendedLines.has(t.line.toLowerCase()));
        return {
          id: t.train_id,
          name: t.name,
          type: t.type || "Local",
          platform: getTrainPlatform(t.train_id),
          crowd: getTrainCrowd(t.train_id),
          status: isDisrupted
            ? { label: "Delayed (Disruption)", color: "text-red-600" }
            : { label: "On Time", color: "text-green-600" },
          arrivalTime: t.departureTime,
          eta: t.eta,
          diffMinutes: t.diffMinutes,
        };
      });
      setTrains(formattedRouteTrains);
      return;
    }

    // Standard Station Schedule Search / Filter
    const sNorm = normalizeStationName(station);
    const stationTrains = [];

    ALL_TRAIN_SERVICES.forEach((service) => {
      if (affectedTrainIds.has(service.train_id)) return;
      if (service.line && suspendedLines.has(service.line.toLowerCase())) return;

      const stopIdx = service.stops.findIndex((st) => normalizeStationName(st.station) === sNorm);
      if (stopIdx !== -1) {
        const stop = service.stops[stopIdx];
        const [h, m] = stop.time.split(":").map(Number);
        const stopMins = h * 60 + m;
        let diff = stopMins - currentMinutesIST;

        if (diff < -10) {
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
          const isDisrupted = affectedTrainIds.has(service.train_id);

          stationTrains.push({
            id: service.train_id,
            name: `${origin} - ${destination} ${service.type}`,
            type: service.type,
            line: service.line,
            platform: getTrainPlatform(service.train_id),
            crowd: getTrainCrowd(service.train_id),
            status: isDisrupted
              ? { label: "Delayed (Disruption)", color: "text-red-600" }
              : { label: "On Time", color: "text-green-600" },
            arrivalTime: stop.time,
            eta,
            diffMinutes: diff,
          });
        }
      }
    });

    // Apply Train ID or keyword filter if non-empty query provided
    let finalTrains = stationTrains.sort((a, b) => a.diffMinutes - b.diffMinutes);

    if (trimmedQuery && !isRouteSearch) {
      const qLower = trimmedQuery.toLowerCase();
      finalTrains = finalTrains.filter(
        (t) =>
          t.id.toLowerCase().includes(qLower) ||
          t.name.toLowerCase().includes(qLower) ||
          t.type.toLowerCase().includes(qLower)
      );
    }

    setTrains(finalTrains.slice(0, 25));
  };

  const handleManualStationChange = (newStation) => {
    setSelectedStation(newStation);
    setIsManualStation(true);
    localStorage.setItem("selected_source", newStation);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar />

      <div className="grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-4 relative">
            <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-bold text-blue-700">
              Showing trains arriving at
            </span>
            <select
              value={selectedStation}
              onChange={(e) => handleManualStationChange(e.target.value)}
              className="bg-transparent text-sm font-black text-blue-950 focus:outline-none cursor-pointer border-b border-blue-400 pb-0.5"
            >
              {allStationsList.map((stn) => (
                <option key={stn.name} value={stn.name} className="text-gray-900 bg-white font-medium">
                  {stn.name}
                </option>
              ))}
            </select>
            {locationDetecting && (
              <Loader className="w-3.5 h-3.5 text-blue-600 animate-spin ml-1 flex-shrink-0" />
            )}
          </div>
          <h1 className="text-4xl font-extrabold text-brand-navy mb-4">
            Live Train Status
          </h1>
          <p className="text-gray-600 text-lg">
            Real-time schedule for {selectedStation} Station
          </p>
          <p className="text-sm text-gray-500 mt-2 font-mono">
            Current Time: {currentTime.toLocaleTimeString()}
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12 relative z-10">
          <div className="relative group">
            <div className="absolute -inset-1 bg-linear-to-r from-brand-saffron via-brand-white to-brand-green rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex items-center bg-white rounded-2xl shadow-xl overflow-hidden p-2">
              <Search className="ml-4 w-6 h-6 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search by Train ID or Route (e.g. 90033 or Dadar to Thane)..."
                className="w-full p-4 text-base sm:text-lg outline-none font-medium text-gray-700 placeholder-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                onClick={fetchTrainStatus}
                className="bg-brand-navy text-white px-6 sm:px-8 py-3 rounded-xl font-bold hover:bg-brand-saffron transition-colors flex items-center gap-2 cursor-pointer flex-shrink-0"
                disabled={loading}
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Status List */}
        <div className="grid gap-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-brand-navy mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">
                Loading train status...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 mx-auto text-red-400 mb-4" />
              <p className="text-gray-600 font-medium">{error}</p>
              <button
                onClick={fetchTrainStatus}
                className="mt-4 px-6 py-2 bg-brand-navy text-white rounded-lg font-semibold hover:bg-brand-saffron transition-colors"
              >
                Retry
              </button>
            </div>
          ) : trains.length === 0 ? (
            <div className="text-center py-12">
              <Train className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 font-medium">
                No upcoming trains found matching your query
              </p>
            </div>
          ) : (
            trains.map((train, i) => (
              <div
                key={`${train.id}-${i}`}
                className="glass-card p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group"
              >
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center space-x-4 w-full md:w-auto">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-brand-navy group-hover:bg-brand-navy group-hover:text-white transition-colors flex-shrink-0">
                      <Train className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {train.name}
                      </h3>
                      <p className="text-sm text-gray-500 font-medium">
                        #{train.id} • {train.type} • Platform {train.platform} •
                        Arrives: {train.arrivalTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-8 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-center">
                      <p className="text-xs text-gray-400 uppercase font-bold mb-1">
                        Crowd
                      </p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          train.crowd === "High"
                            ? "bg-red-100 text-red-800"
                            : train.crowd === "Medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                        }`}
                      >
                        {train.crowd}
                      </span>
                    </div>

                    <div className="text-center">
                      <p className="text-xs text-gray-400 uppercase font-bold mb-1">
                        Status
                      </p>
                      <div
                        className={`flex items-center font-bold ${train.status.color}`}
                      >
                        {train.status.label}
                      </div>
                    </div>

                    <div className="text-right pl-4 border-l border-gray-100">
                      <div className="text-xs text-gray-400 uppercase font-bold mb-1">
                        Arriving In
                      </div>
                      <div className="text-2xl font-black text-brand-navy">
                        {train.eta}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveStatus;
