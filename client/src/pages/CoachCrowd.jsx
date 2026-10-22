import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import Navbar from "../components/Navbar";
import {
  Train,
  Users,
  AlertCircle,
  RefreshCcw,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Info,
  ChevronRight,
  Filter,
  Calculator,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  allRailwayStationsList,
  localStationCategories,
  getStationDisplayLabel,
  getStationLines,
} from "../utils/stations";
import { searchUpcomingTrains } from "../utils/timetableData";
import { checkJourneyDisruption, fetchActiveDisruptions, triggerSMSNotification, triggerEmailNotification } from "../utils/disruptionService";
import { calculateCoachOccupancy, generateRoutePeakAnalysis } from "../utils/coachOccupancyEngine";

const DEFAULT_PEAK_HOUR_DATA = [
  { period: "Morning Peak", time: "08:00-10:00", avgLoad: 95, incidents: 12 },
  { period: "Mid-Day", time: "11:00-16:00", avgLoad: 65, incidents: 3 },
  { period: "Evening Peak", time: "17:00-20:00", avgLoad: 98, incidents: 18 },
  { period: "Late Night", time: "21:00-23:00", avgLoad: 45, incidents: 1 },
];

const DEFAULT_HOURLY_TRAFFIC_DATA = [
  { time: "05:00", passengers: 2800, capacity: 10000 },
  { time: "06:00", passengers: 8500, capacity: 10000 },
  { time: "07:00", passengers: 15000, capacity: 10000 },
  { time: "08:00", passengers: 18500, capacity: 10000 },
  { time: "09:00", passengers: 19200, capacity: 10000 },
  { time: "10:00", passengers: 12500, capacity: 10000 },
  { time: "11:00", passengers: 9800, capacity: 10000 },
  { time: "12:00", passengers: 8200, capacity: 10000 },
  { time: "13:00", passengers: 7500, capacity: 10000 },
  { time: "14:00", passengers: 6800, capacity: 10000 },
  { time: "15:00", passengers: 8500, capacity: 10000 },
  { time: "16:00", passengers: 11200, capacity: 10000 },
  { time: "17:00", passengers: 16800, capacity: 10000 },
  { time: "18:00", passengers: 19800, capacity: 10000 },
  { time: "19:00", passengers: 18500, capacity: 10000 },
  { time: "20:00", passengers: 14200, capacity: 10000 },
  { time: "21:00", passengers: 10500, capacity: 10000 },
  { time: "22:00", passengers: 6200, capacity: 10000 },
];

const AVAILABLE_TRAINS = [
  { id: "90033", name: "Train 90033 - Fast Local (CSMT - Virar)", departure: "In 5 min", classSupport: ["Second Class", "First Class"] },
  { id: "90025", name: "Train 90025 - Slow Local (Churchgate - Borivali)", departure: "In 12 min", classSupport: ["Second Class", "First Class"] },
  { id: "90013", name: "Train 90013 - AC Local (Churchgate - Virar)", departure: "In 18 min", classSupport: ["AC Local", "First Class"] },
  { id: "90007", name: "Train 90007 - Fast Local (Dadar - Thane)", departure: "In 25 min", classSupport: ["Second Class", "First Class"] },
  { id: "90001", name: "Train 90001 - Slow Local (CSMT - Panvel)", departure: "In 32 min", classSupport: ["Second Class", "First Class"] },
];

const normName = (s) => {
  if (!s) return "";
  return s
    .trim()
    .toLowerCase()
    .replace(/ metro/g, "")
    .replace(/ junction/g, "")
    .replace(/ road/g, "")
    .replace(/ station/g, "");
};

const CoachCrowd = () => {
  const { user } = useUser();
  const [sourceStation, setSourceStation] = useState(() => localStorage.getItem("selected_source") || "Thane");
  const [destStation, setDestStation] = useState(() => localStorage.getItem("selected_destination") || "Juinagar");
  const [selectedClass, setSelectedClass] = useState("Second Class");
  const [selectedTrainId, setSelectedTrainId] = useState(() => localStorage.getItem("selected_train_id") || "TH_4001");
  const [lineCategoryFilter, setLineCategoryFilter] = useState("All");
  const [activeDisruptions, setActiveDisruptions] = useState([]);
  const [disruptionInfo, setDisruptionInfo] = useState(null);
  const [smsSending, setSmsSending] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState(null);

  const handleSendSMSClick = async () => {
    if (!sourceStation || !destStation) return;
    setSmsSending(true);
    try {
      const userPhone = user?.unsafeMetadata?.mobileNumber || user?.unsafeMetadata?.phoneNumber || user?.primaryPhoneNumber?.phoneNumber || "";
      const res = await triggerSMSNotification(sourceStation, destStation, userPhone, user?.id);
      setDisruptionInfo(res);
    } catch (e) {
      console.error("SMS dispatch error:", e);
    } finally {
      setSmsSending(false);
    }
  };

  const handleSendMessageClick = async () => {
    if (!sourceStation || !destStation) return;
    const userEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
    if (!userEmail) return;
    setEmailSending(true);
    try {
      const res = await triggerEmailNotification(sourceStation, destStation, userEmail, user?.id);
      setEmailResult(res);
    } catch (e) {
      console.error("Email dispatch error:", e);
    } finally {
      setEmailSending(false);
    }
  };




  const renderCategorizedOptions = (filterVal) => {
    if (filterVal === "Central") {
      return Object.entries(localStationCategories.Central).map(([branch, stns]) => (
        <optgroup key={`c-${branch}`} label={`Central — ${branch}`}>
          {stns.map((s) => {
            const lines = getStationLines(s);
            return (
              <option key={`c-${s}`} value={s}>
                {s} {lines.length > 1 ? `(${lines.join(" / ")})` : ""}
              </option>
            );
          })}
        </optgroup>
      ));
    }

    if (filterVal === "Harbour") {
      return Object.entries(localStationCategories.Harbour).map(([branch, stns]) => (
        <optgroup key={`h-${branch}`} label={`Harbour — ${branch}`}>
          {stns.map((s) => {
            const lines = getStationLines(s);
            return (
              <option key={`h-${s}`} value={s}>
                {s} {lines.length > 1 ? `(${lines.join(" / ")})` : ""}
              </option>
            );
          })}
        </optgroup>
      ));
    }

    if (filterVal === "Western") {
      return Object.entries(localStationCategories.Western).map(([branch, stns]) => (
        <optgroup key={`w-${branch}`} label={`Western — ${branch}`}>
          {stns.map((s) => {
            const lines = getStationLines(s);
            return (
              <option key={`w-${s}`} value={s}>
                {s} {lines.length > 1 ? `(${lines.join(" / ")})` : ""}
              </option>
            );
          })}
        </optgroup>
      ));
    }

    // Default: All Lines (Categorized & Grouped)
    return (
      <>
        <optgroup label="Central Line">
          {Array.from(new Set(Object.values(localStationCategories.Central).flat())).map((s) => (
            <option key={`all-c-${s}`} value={s}>
              {getStationDisplayLabel(s)}
            </option>
          ))}
        </optgroup>
        <optgroup label="Harbour Line">
          {Array.from(new Set(Object.values(localStationCategories.Harbour).flat())).map((s) => (
            <option key={`all-h-${s}`} value={s}>
              {getStationDisplayLabel(s)}
            </option>
          ))}
        </optgroup>
        <optgroup label="Western Line">
          {Array.from(new Set(Object.values(localStationCategories.Western).flat())).map((s) => (
            <option key={`all-w-${s}`} value={s}>
              {getStationDisplayLabel(s)}
            </option>
          ))}
        </optgroup>
      </>
    );
  };

  const [coaches, setCoaches] = useState([]);
  const [occupancyData, setOccupancyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCoachModal, setSelectedCoachModal] = useState(null);
  const [peakPeriods, setPeakPeriods] = useState(DEFAULT_PEAK_HOUR_DATA);
  const [hourlyTrend, setHourlyTrend] = useState(DEFAULT_HOURLY_TRAFFIC_DATA);
  const [loadingPeak, setLoadingPeak] = useState(true);

  // Fetch Peak Analysis data from API or calculate dynamically per route
  useEffect(() => {
    let isMounted = true;
    async function loadPeakData() {
      try {
        const res = await fetch(`http://localhost:5000/api/peak-analysis?source=${encodeURIComponent(sourceStation)}&destination=${encodeURIComponent(destStation)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data.peakHourData && Array.isArray(data.peakHourData)) {
              setPeakPeriods(data.peakHourData);
            }
            if (data.hourlyTrafficData && Array.isArray(data.hourlyTrafficData)) {
              setHourlyTrend(data.hourlyTrafficData);
            }
          }
        } else {
          const { peakHourData, hourlyTrafficData } = generateRoutePeakAnalysis(sourceStation, destStation);
          if (isMounted) {
            setPeakPeriods(peakHourData);
            setHourlyTrend(hourlyTrafficData);
          }
        }
      } catch (e) {
        const { peakHourData, hourlyTrafficData } = generateRoutePeakAnalysis(sourceStation, destStation);
        if (isMounted) {
          setPeakPeriods(peakHourData);
          setHourlyTrend(hourlyTrafficData);
        }
      } finally {
        if (isMounted) setLoadingPeak(false);
      }
    }
    loadPeakData();
    return () => {
      isMounted = false;
    };
  }, [sourceStation, destStation]);

  // Fetch active disruptions & check if current journey is affected
  useEffect(() => {
    let isMounted = true;
    async function loadDisruptionData() {
      const active = await fetchActiveDisruptions();
      const journeyCheck = await checkJourneyDisruption(sourceStation, destStation);
      if (isMounted) {
        setActiveDisruptions(active);
        setDisruptionInfo(journeyCheck);
      }
    }
    loadDisruptionData();
    return () => {
      isMounted = false;
    };
  }, [sourceStation, destStation]);

  // Requirement 13: Exclude cancelled / disrupted trains and recalculate next 3 applicable trains for same journey
  const applicableTrains = searchUpcomingTrains(
    sourceStation,
    destStation,
    new Date(),
    disruptionInfo?.isAffected && disruptionInfo?.affectedDisruption ? [disruptionInfo.affectedDisruption] : activeDisruptions
  );
  const next3Trains = applicableTrains.slice(0, 3);

  // Sync selected train when Source or Destination changes
  useEffect(() => {
    localStorage.setItem("selected_source", sourceStation);
    localStorage.setItem("selected_destination", destStation);

    if (applicableTrains.length > 0) {
      const exists = applicableTrains.some((t) => t.train_id === selectedTrainId);
      if (!exists) {
        const nextId = applicableTrains[0].train_id;
        setSelectedTrainId(nextId);
        localStorage.setItem("selected_train_id", nextId);
      }
    }
  }, [sourceStation, destStation, applicableTrains]);

  useEffect(() => {
    if (selectedTrainId) {
      localStorage.setItem("selected_train_id", selectedTrainId);
      fetchCoachData(selectedTrainId);
    }
    const interval = setInterval(() => {
      if (selectedTrainId) fetchCoachData(selectedTrainId);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedTrainId, selectedClass, sourceStation, destStation]);

  const fetchCoachData = async (trainId) => {
    if (!trainId) return;
    try {
      const url = `http://localhost:5000/api/coach-occupancy/${trainId}?source=${encodeURIComponent(sourceStation)}&destination=${encodeURIComponent(destStation)}&class=${encodeURIComponent(selectedClass)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCoaches(data.coaches || []);
        setOccupancyData(data);
      } else {
        const fallback = calculateCoachOccupancy({ trainId, source: sourceStation, destination: destStation, travelClass: selectedClass });
        setCoaches(fallback.coaches || []);
        setOccupancyData(fallback);
      }
    } catch (err) {
      console.warn("Using client deterministic occupancy fallback:", err.message);
      const fallback = calculateCoachOccupancy({ trainId, source: sourceStation, destination: destStation, travelClass: selectedClass });
      setCoaches(fallback.coaches || []);
      setOccupancyData(fallback);
    } finally {
      setLoading(false);
    }
  };

  // Compute summary stats dynamically
  const totalPassengers = coaches.reduce((acc, c) => acc + (c.passengers || 0), 0);
  const totalCapacity = coaches.reduce((acc, c) => acc + (c.capacity || 150), 0);
  const overallOccupancyPct = totalCapacity > 0 ? Math.round((totalPassengers / totalCapacity) * 100) : 0;

  // Least and most crowded
  const sortedCoaches = [...coaches].sort((a, b) => a.occupancyPct - b.occupancyPct);
  const leastCrowded = sortedCoaches[0];
  const mostCrowded = sortedCoaches[sortedCoaches.length - 1];

  // Dynamic boarding recommendation
  let boardingRecommendation = "Front Coaches (C1–C3)";
  if (leastCrowded) {
    const coachNum = parseInt(leastCrowded.coach_number.replace(/\D/g, "")) || 1;
    if (coachNum <= 4) boardingRecommendation = "Front Platform Area (Coaches C1–C4)";
    else if (coachNum <= 8) boardingRecommendation = "Middle Platform Area (Coaches C5–C8)";
    else boardingRecommendation = "Rear Platform Area (Coaches C9–C12)";
  }

  const getCrowdBadgeStyle = (pct) => {
    if (pct <= 50) return { bg: "bg-green-500", text: "text-green-700", border: "border-green-300", lightBg: "bg-green-50", label: "LOW" };
    if (pct <= 75) return { bg: "bg-yellow-500", text: "text-yellow-700", border: "border-yellow-300", lightBg: "bg-yellow-50", label: "MEDIUM" };
    return { bg: "bg-red-500", text: "text-red-700", border: "border-red-300", lightBg: "bg-red-50", label: "HIGH" };
  };

  // Precompute coach-wise crowd metrics for each of the Next 3 Trains dynamically
  const trainOccupancyMap = React.useMemo(() => {
    const map = {};
    next3Trains.forEach((t) => {
      const res = calculateCoachOccupancy({
        trainId: t.train_id,
        source: sourceStation,
        destination: destStation,
        travelClass: selectedClass,
        trainService: t,
      });
      map[t.train_id] = res;
    });
    return map;
  }, [next3Trains, sourceStation, destStation, selectedClass]);

  const activeTrainObj = applicableTrains.find((t) => t.train_id === selectedTrainId) || applicableTrains[0];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 border border-purple-200 text-purple-800 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              Live Coach-Wise Crowd Estimation
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              Coach Occupancy & Boarding Guide
            </h1>
            <p className="text-gray-600 text-base mt-1">
              Compare occupancy across coaches and next 3 trains for your route.
            </p>
          </div>

          <button
            onClick={() => fetchCoachData(selectedTrainId)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-semibold text-sm hover:border-purple-500 transition-colors shadow-sm"
          >
            <RefreshCcw className="w-4 h-4 text-purple-600" /> Refresh Data
          </button>
        </div>

        {/* Route & Class Selector */}
        <div className="mb-8 p-6 bg-white rounded-2xl shadow-md border border-gray-200 grid md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Source Station</label>
            <select
              value={sourceStation}
              onChange={(e) => {
                setSourceStation(e.target.value);
                localStorage.setItem("selected_source", e.target.value);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-300 font-bold text-gray-900 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            >
              {renderCategorizedOptions(lineCategoryFilter)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Destination Station</label>
            <select
              value={destStation}
              onChange={(e) => {
                setDestStation(e.target.value);
                localStorage.setItem("selected_destination", e.target.value);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-300 font-bold text-gray-900 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            >
              {renderCategorizedOptions(lineCategoryFilter)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Travel Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-300 font-bold text-gray-900 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="Second Class">Second Class</option>
              <option value="First Class">First Class</option>
              <option value="AC Local">AC Local</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Active Train</label>
            <select
              value={selectedTrainId}
              onChange={(e) => {
                setLoading(true);
                setSelectedTrainId(e.target.value);
                localStorage.setItem("selected_train_id", e.target.value);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-300 font-bold text-gray-900 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            >
              {applicableTrains.length > 0 ? (
                applicableTrains.map((t) => (
                  <option key={t.train_id} value={t.train_id}>
                    {t.name} (Dep: {t.departureTime})
                  </option>
                ))
              ) : (
                <option value={selectedTrainId || "TH_4001"}>
                  {selectedTrainId || "No direct train available"}
                </option>
              )}
            </select>
          </div>
        </div>

        {/* Next 3 Available Trains Comparison for Route */}
        <div className="mb-8 p-6 bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold flex items-center gap-2">
                <Train className="w-5 h-5 text-purple-300" />
                Next 3 Trains for {sourceStation} → {destStation} ({selectedClass})
              </h3>
              <p className="text-xs text-purple-200">Comparative crowd levels across upcoming services</p>
            </div>
            <span className="px-3 py-1 bg-purple-800 text-purple-200 text-xs font-bold rounded-full">
              Live Schedule
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {next3Trains.length > 0 ? (
              next3Trains.map((train, idx) => {
                const isSelected = train.train_id === selectedTrainId;
                const isEmptiest = idx === 0;
                return (
                  <div
                    key={`next-${train.train_id}`}
                    onClick={() => {
                      setLoading(true);
                      setSelectedTrainId(train.train_id);
                      localStorage.setItem("selected_train_id", train.train_id);
                    }}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white/20 border-purple-400 shadow-lg"
                        : "bg-white/10 border-white/10 hover:bg-white/15"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-extrabold text-purple-200">{train.departureTime} (In {train.eta})</span>
                      {isEmptiest && (
                        <span className="px-2 py-0.5 bg-green-500 text-white font-bold text-[10px] rounded uppercase">
                          Earliest Service
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-white mb-1 line-clamp-1">{train.name}</h4>
                    <p className="text-[11px] text-purple-200">
                      Line: {train.line} • Class: {selectedClass} • Est. Occupancy: {trainOccupancyMap[train.train_id]?.overallOccupancyPct || 0}%
                    </p>
                    <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-white/10">
                      <span className="font-semibold text-purple-300">
                        {isSelected ? "Active Selected Train" : "Select & View Layout"}
                      </span>
                      <ChevronRight className="w-4 h-4 text-purple-300" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-3 text-center py-4 text-purple-200 text-sm">
                No direct upcoming trains found for {sourceStation} → {destStation}. Try adjusting your stations.
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Boarding Station Occupancy ({sourceStation})</p>
            <p className="text-3xl font-black text-purple-900">{overallOccupancyPct}%</p>
            <p className="text-[11px] text-gray-500 mt-1">{totalPassengers} / {totalCapacity} passengers</p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-green-200 shadow-sm">
            <p className="text-xs text-green-700 font-bold uppercase mb-1">Least Crowded Coach</p>
            <p className="text-2xl font-extrabold text-green-700">
              {leastCrowded ? leastCrowded.coach_number : "C1"}
            </p>
            <p className="text-xs font-semibold text-gray-600 mt-1">
              {leastCrowded ? `${leastCrowded.occupancyPct}% (Low Crowd)` : "0%"}
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-red-200 shadow-sm">
            <p className="text-xs text-red-700 font-bold uppercase mb-1">Most Crowded Coach</p>
            <p className="text-2xl font-extrabold text-red-700">
              {mostCrowded ? mostCrowded.coach_number : "C12"}
            </p>
            <p className="text-xs font-semibold text-gray-600 mt-1">
              {mostCrowded ? `${mostCrowded.occupancyPct}% (High Crowd)` : "0%"}
            </p>
          </div>

          <div className="p-5 bg-gradient-to-br from-purple-700 to-indigo-800 text-white rounded-2xl shadow-md">
            <p className="text-xs text-purple-200 font-bold uppercase mb-1">Recommended Boarding</p>
            <p className="text-sm font-bold leading-snug mt-1">{boardingRecommendation}</p>
            <p className="text-[10px] text-purple-200 mt-2">Board here for maximum comfort</p>
          </div>
        </div>

        {/* Station-by-Station Route Direction & Dynamic Accumulation Progression */}
        {occupancyData && occupancyData.routeStationSim && occupancyData.routeStationSim.length > 0 && (
          <div className="mb-8 p-6 bg-white rounded-3xl shadow-lg border border-purple-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5 ${
                  occupancyData.direction === "UP" ? "bg-blue-100 text-blue-900 border border-blue-300" : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                }`}>
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                  {occupancyData.direction} Direction ({occupancyData.direction === "UP" ? "Toward City Center" : "Toward Suburban Terminus"})
                </div>
                <span className="text-xs font-bold text-gray-600">
                  Line: <strong className="text-gray-900">{occupancyData.line}</strong> • Terminus: <strong className="text-gray-900">{occupancyData.destinationTerminus}</strong>
                </span>
              </div>
              <span className="text-xs font-extrabold text-purple-700 bg-purple-50 px-3 py-1 rounded-lg border border-purple-100">
                {occupancyData.periodName || "Station-by-Station Trend"}
              </span>
            </div>

            <h4 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-3">
              Station-by-Station Occupancy Accumulation Across Route ({sourceStation} ➔ {destStation})
            </h4>

            <div className="overflow-x-auto pb-2">
              <div className="flex items-center gap-2 min-w-max">
                {occupancyData.routeStationSim.map((step, idx) => {
                  const isUserSource = normName(step.station) === normName(sourceStation);
                  const isUserDest = normName(step.station) === normName(destStation);
                  const isHighlight = isUserSource || isUserDest;

                  return (
                    <React.Fragment key={`stn-step-${idx}`}>
                      {idx > 0 && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                      <div className={`px-3 py-2 rounded-xl text-center border flex-shrink-0 transition-all ${
                        isUserSource
                          ? "bg-purple-600 text-white border-purple-700 shadow-md scale-105"
                          : isUserDest
                            ? "bg-indigo-600 text-white border-indigo-700 shadow-md scale-105"
                            : "bg-gray-50 border-gray-200 text-gray-800"
                      }`}>
                        <p className="text-[11px] font-extrabold truncate max-w-[110px]">{step.station}</p>
                        <p className={`text-base font-black mt-0.5 ${
                          isHighlight ? "text-white" : step.overallOccupancyPct > 75 ? "text-red-600" : step.overallOccupancyPct > 50 ? "text-amber-600" : "text-green-600"
                        }`}>
                          {step.overallOccupancyPct}%
                        </p>
                        {isUserSource && <span className="text-[9px] font-bold block text-purple-200 uppercase">Boarding</span>}
                        {isUserDest && <span className="text-[9px] font-bold block text-indigo-200 uppercase">Alighting</span>}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-6 mb-6 px-2 text-xs font-bold text-gray-700">
          <span className="text-gray-400 uppercase tracking-wider">Crowd Legend:</span>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-green-500"></span>
            <span>Low (0% – 50%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-yellow-500"></span>
            <span>Medium (51% – 75%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500"></span>
            <span>High (&gt;75%)</span>
          </div>
        </div>

        {/* TRAIN COACHES VISUAL REPRESENTATION */}
        {loading ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-gray-200 shadow-md">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold">Loading coach occupancy data...</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-200 relative overflow-hidden">
            {/* Train Engine Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-navy text-white rounded-2xl shadow-md">
                  <Train className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {activeTrainObj?.name || selectedTrainId}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">{coaches.length}-Coach Configuration ({selectedClass} Estimated Occupancy)</p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                Front ← Engine
              </span>
            </div>

            {/* Scrollable Horizontal Train Coach Layout */}
            <div className="overflow-x-auto pb-4">
              <div className="flex items-stretch gap-3 min-w-max">
                {coaches.map((coach) => {
                  const style = getCrowdBadgeStyle(coach.occupancyPct);
                  return (
                    <div
                      key={coach.coach_number}
                      onClick={() => setSelectedCoachModal(coach)}
                      className={`w-28 sm:w-32 p-4 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between ${style.lightBg} ${style.border}`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-base font-black text-gray-900">
                            {coach.coach_number}
                          </span>
                          <span className={`w-3 h-3 rounded-full ${style.bg}`}></span>
                        </div>
                        <div className="mb-2">
                          <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100/90 text-purple-900 uppercase tracking-tight truncate max-w-full">
                            {coach.coach_type || "General"}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-3">
                          <div
                            className={`h-full ${style.bg} transition-all duration-500`}
                            style={{ width: `${Math.min(100, coach.occupancyPct)}%` }}
                          ></div>
                        </div>

                        <div className="text-center">
                          <p className="text-2xl font-black text-gray-900">{coach.occupancyPct}%</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">Occupancy</p>
                        </div>
                      </div>

                      <div className="mt-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase text-white ${style.bg}`}>
                          {style.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Platform Zone Markers */}
            <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-gray-200 text-center text-xs font-bold text-gray-500 uppercase">
              <div className="p-2 bg-gray-50 rounded-xl border border-gray-200">
                {coaches.length === 15 ? "START Zone (Coaches C1–C5)" : "START Zone (Coaches C1–C4)"}
              </div>
              <div className="p-2 bg-gray-50 rounded-xl border border-gray-200">
                {coaches.length === 15 ? "MIDDLE Zone (Coaches C6–C10)" : "MIDDLE Zone (Coaches C5–C8)"}
              </div>
              <div className="p-2 bg-gray-50 rounded-xl border border-gray-200">
                {coaches.length === 15 ? "END Zone (Coaches C11–C15)" : "END Zone (Coaches C9–C12)"}
              </div>
            </div>
          </div>
        )}

        {/* PEAK HOURS ANALYSIS SECTION */}
        <div className="mt-8 bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 border border-purple-200 text-purple-800 text-xs font-bold uppercase tracking-wider mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                Network Crowd Analytics
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Peak Hours Analysis
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Busiest travel periods & hourly crowd distribution based on actual network travel data.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 self-start md:self-auto">
              <Clock className="w-4 h-4 text-purple-600" />
              <span>Synced with Network Peak Calculation</span>
            </div>
          </div>

          {peakPeriods && peakPeriods.length > 0 ? (
            <>
              {/* Peak Hours Cards */}
              <div className="mb-8">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                  Busiest Travel Periods
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {peakPeriods.map((period, idx) => {
                    const isHighLoad = period.avgLoad > 90;
                    return (
                      <div
                        key={`peak-period-${idx}`}
                        className={`rounded-2xl p-5 border-2 transition-all ${
                          isHighLoad
                            ? "bg-red-50/80 border-red-300 text-red-950"
                            : "bg-green-50/80 border-green-300 text-green-950"
                        } hover:shadow-md`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-extrabold text-base text-gray-900">{period.period}</h4>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                              isHighLoad ? "bg-red-200 text-red-800" : "bg-green-200 text-green-800"
                            }`}
                          >
                            {isHighLoad ? "Rush Peak" : "Normal"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 font-semibold mb-3">{period.time}</p>

                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-gray-700">Avg Load:</span>
                          <span
                            className={`text-2xl font-black ${
                              isHighLoad ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {period.avgLoad}%
                          </span>
                        </div>

                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isHighLoad ? "bg-red-600" : "bg-green-600"
                            }`}
                            style={{ width: `${period.avgLoad}%` }}
                          ></div>
                        </div>

                        {period.incidents !== undefined && (
                          <div className="mt-3 pt-2 border-t border-gray-200/60 flex justify-between items-center text-[11px] font-medium text-gray-600">
                            <span>Recorded Incidents:</span>
                            <span className="font-bold text-gray-900">{period.incidents}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 24-Hour Trend Chart */}
              {hourlyTrend && hourlyTrend.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    24-Hour Network Crowd Trend
                  </h3>
                  <div className="h-72 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={hourlyTrend}
                        margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="userColorPassengers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="time" tick={{ fill: "#6b7280", fontSize: 11 }} />
                        <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            border: "2px solid #7c3aed",
                            borderRadius: "12px",
                            fontWeight: "bold",
                            fontSize: "12px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="passengers"
                          stroke="#7c3aed"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#userColorPassengers)"
                          name="Passenger Count"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-2xl">
              <p className="text-gray-600 font-semibold text-sm">No peak hour data available.</p>
            </div>
          )}
        </div>

        {/* Coach Details Modal */}
        {selectedCoachModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6">
              <div className="flex justify-between items-start border-b border-gray-200 pb-4">
                <div>
                  <h3 className="text-2xl font-black text-gray-900">
                    Coach {selectedCoachModal.coach_number}
                  </h3>
                  <p className="text-xs text-purple-700 font-bold uppercase tracking-wide">
                    Category: {selectedCoachModal.coach_type || "Second Class"}
                  </p>
                  <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
                    Detailed Occupancy Breakdown ({selectedClass})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCoachModal(null)}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-xs text-gray-500 font-bold uppercase">Estimated Passengers</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">
                    {selectedCoachModal.passengers}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-xs text-gray-500 font-bold uppercase">Model Capacity</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">
                    {selectedCoachModal.capacity}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-900 font-bold uppercase">Estimated Occupancy</p>
                  <p className="text-3xl font-black text-purple-900 mt-0.5">
                    {selectedCoachModal.occupancyPct}%
                  </p>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase text-white ${getCrowdBadgeStyle(selectedCoachModal.occupancyPct).bg}`}>
                  {getCrowdBadgeStyle(selectedCoachModal.occupancyPct).label} CROWD
                </span>
              </div>

              <button
                onClick={() => setSelectedCoachModal(null)}
                className="w-full py-3 bg-brand-navy text-white font-bold rounded-xl shadow-lg hover:bg-brand-navy/90 transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CoachCrowd;
