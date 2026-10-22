import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getAllStations } from "../utils/allStations";
import { fetchActiveDisruptions } from "../utils/disruptionService";
import { calculateCoachOccupancy } from "../utils/coachOccupancyEngine";
import { isTicketValid } from "../utils/ticketUtils";
import {
  Train,
  MapPin,
  Ticket,
  TrendingUp,
  Clock,
  Users,
  AlertCircle,
  Calendar,
  ArrowRight,
  Loader,
} from "lucide-react";

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return "Recently";
  const date = new Date(timestamp);
  const now = new Date();
  const diffSecs = Math.floor((now - date) / 1000);

  if (isNaN(diffSecs) || diffSecs < 30) return "Just now";
  if (diffSecs < 60) return "Just now";
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userLocation, setUserLocation] = useState(null);
  const [nearestStations, setNearestStations] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [disruptions, setDisruptions] = useState([]);

  // Dynamic user data states
  const [userTickets, setUserTickets] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  // Dynamic crowd status states
  const [crowdStatusList, setCrowdStatusList] = useState([]);
  const [loadingCrowd, setLoadingCrowd] = useState(true);

  // Dynamic network status states
  const [networkLines, setNetworkLines] = useState([]);
  const [overallNetworkStatus, setOverallNetworkStatus] = useState("Healthy");
  const [loadingNetwork, setLoadingNetwork] = useState(true);

  // Load disruptions
  useEffect(() => {
    let isMounted = true;
    async function loadDisruptions() {
      const active = await fetchActiveDisruptions();
      if (isMounted) setDisruptions(active);
    }
    loadDisruptions();
    return () => {
      isMounted = false;
    };
  }, []);

  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. NEAREST STATIONS — Browser Geolocation & Station Distance Calculation
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    const allStns = getAllStations();

    const computeNearest = (lat, lng) => {
      const stationsWithDist = allStns.map((stn) => ({
        id: stn.id,
        name: stn.name,
        type: stn.line.includes("Metro") ? "Metro" : "Railway",
        lat: stn.lat,
        lng: stn.lng,
        line: stn.line.endsWith("Line") ? stn.line : `${stn.line} Line`,
        distance: calculateDistance(lat, lng, stn.lat, stn.lng),
      }));

      // Remove duplicate station names, picking the closest entry
      const uniqueMap = new Map();
      stationsWithDist.forEach((s) => {
        if (!uniqueMap.has(s.name) || uniqueMap.get(s.name).distance > s.distance) {
          uniqueMap.set(s.name, s);
        }
      });

      return Array.from(uniqueMap.values())
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setNearestStations(computeNearest(latitude, longitude));
          setLocationError(null);
          setLoadingLocation(false);
        },
        (error) => {
          console.warn("Geolocation denied or error:", error.message);
          setUserLocation(null);
          setNearestStations([]);
          setLocationError("Location access denied or unavailable");
          setLoadingLocation(false);
        }
      );
    } else {
      setUserLocation(null);
      setNearestStations([]);
      setLocationError("Location access denied or unavailable");
      setLoadingLocation(false);
    }
  }, []);

  const handleSelectNearestStation = (station) => {
    if (!station || !station.name) return;
    localStorage.setItem("selected_source", station.name);
    navigate("/ticketing");
  };

  // 2. RECENT ACTIVITY & USER TICKETS — Real user ticket actions, purchases, and route searches
  useEffect(() => {
    let isMounted = true;

    async function loadUserActivities() {
      if (!isLoaded) return;
      const currentUserId = user?.id;

      if (!currentUserId) {
        if (isMounted) {
          setUserTickets([]);
          setRecentActivities([]);
          setLoadingActivity(false);
        }
        return;
      }

      setLoadingActivity(true);
      try {
        const res = await fetch(
          `http://localhost:5000/api/tickets?userId=${encodeURIComponent(currentUserId)}`,
          {
            headers: {
              "x-user-id": currentUserId,
            },
          }
        );
        let userTkts = [];
        if (res.ok) {
          const data = await res.json();
          userTkts = Array.isArray(data) ? data : [];
        }

        if (!isMounted) return;

        setUserTickets(userTkts);

        const activities = [];

        // Add ticket creation activities
        userTkts.forEach((t) => {
          const issueTime = t.issued_at || t.valid_from || t.date;
          const cat = (t.category || "").toLowerCase();
          const srcType = (t.source_type || "").toLowerCase();

          let title = "Ticket Booked";
          if (cat.includes("season")) title = "Season Pass Purchased";
          else if (srcType.includes("counter") || cat.includes("counter")) title = "Counter Ticket Added";

          activities.push({
            id: `issue_${t.ticket_id}`,
            icon: <Ticket className="w-5 h-5 text-blue-600" />,
            title: title,
            time: formatRelativeTime(issueTime),
            rawTime: new Date(issueTime).getTime() || Date.now(),
            description: `${t.source} → ${t.destination}${t.class ? ` • ${t.class}` : ""}`,
          });

          if (t.used || t.is_used || t.status === "Consumed") {
            activities.push({
              id: `used_${t.ticket_id}`,
              icon: <Train className="w-5 h-5 text-green-600" />,
              title: "Journey Completed",
              time: formatRelativeTime(t.valid_upto || issueTime),
              rawTime: new Date(t.valid_upto || issueTime).getTime() || Date.now(),
              description: `${t.source} → ${t.destination}`,
            });
          }
        });

        // Add searched routes from localStorage
        const searchKey = "user_recent_searches_" + currentUserId;
        try {
          const searches = JSON.parse(localStorage.getItem(searchKey) || "[]");
          searches.forEach((s, idx) => {
            activities.push({
              id: `search_${s.timestamp || idx}`,
              icon: <MapPin className="w-5 h-5 text-purple-600" />,
              title: "Route Searched",
              time: formatRelativeTime(s.timestamp),
              rawTime: s.timestamp || Date.now() - 3600000,
              description: `Best route: ${s.source} → ${s.destination}`,
            });
          });
        } catch (e) {}

        // Sort by newest activity first (descending timestamp)
        activities.sort((a, b) => b.rawTime - a.rawTime);
        setRecentActivities(activities.slice(0, 3));
      } catch (err) {
        console.error("Error loading user activities:", err);
        if (isMounted) {
          setUserTickets([]);
          setRecentActivities([]);
        }
      } finally {
        if (isMounted) setLoadingActivity(false);
      }
    }

    loadUserActivities();

    // Re-fetch when user refocuses the page (e.g., returning from booking tab)
    const handleFocus = () => {
      loadUserActivities();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleFocus);
    };
  }, [isLoaded, user?.id]);

  // 3. LIVE CROWD STATUS — Dynamic calculation using Coach Occupancy Engine
  useEffect(() => {
    setLoadingCrowd(true);

    const targetStations = nearestStations.length > 0
      ? [nearestStations[0].name, "Dadar", "Bandra", "Andheri", "Ghatkopar"]
      : ["Dadar", "Bandra", "Andheri", "Ghatkopar"];

    // Pick top 4 unique stations
    const uniqueStations = Array.from(new Set(targetStations)).slice(0, 4);

    const crowdList = uniqueStations.map((stnName) => {
      const occ = calculateCoachOccupancy({
        trainId: "CR_1001",
        source: stnName,
        destination: "Dadar",
        travelClass: "Second Class",
        referenceDate: new Date(),
      });
      const pct = occ?.overallOccupancyPct || 30;
      let crowd = "Low";
      if (pct > 75) crowd = "High";
      else if (pct > 40) crowd = "Moderate";
      return { station: stnName, crowd, percentage: pct };
    });

    setCrowdStatusList(crowdList);
    setLoadingCrowd(false);
  }, [nearestStations, currentTime.getMinutes()]);

  // 4. NETWORK STATUS — Dynamic operational status based on live disruptions & schedules
  useEffect(() => {
    setLoadingNetwork(true);
    const lines = [
      { label: "Western Line", key: "Western", color: "bg-blue-500" },
      { label: "Central Line", key: "Central", color: "bg-green-500" },
      { label: "Harbour Line", key: "Harbour", color: "bg-purple-500" },
    ];

    const statuses = lines.map((lineObj) => {
      const matching = disruptions.filter((d) => {
        const l = (d.line || "").toLowerCase();
        const t = (d.title || "").toLowerCase();
        const target = lineObj.key.toLowerCase();
        return l.includes(target) || t.includes(target);
      });

      let delaySum = 0;
      matching.forEach((m) => {
        delaySum += m.delayMinutes || 15;
      });

      let value = 98;
      if (delaySum > 0) {
        value = Math.max(50, Math.round(100 - delaySum * 1.5));
      } else {
        value = lineObj.key === "Western" ? 95 : lineObj.key === "Central" ? 92 : 96;
      }
      return { label: lineObj.label, value, color: lineObj.color };
    });

    const minVal = Math.min(...statuses.map((s) => s.value));
    let overall = "Healthy";
    if (minVal < 70) overall = "Disrupted";
    else if (minVal < 90) overall = "Moderate";

    setNetworkLines(statuses);
    setOverallNetworkStatus(overall);
    setLoadingNetwork(false);
  }, [disruptions]);

  const activeTicketCount = userTickets.filter((t) => isTicketValid(t)).length;
  const totalTicketCount = userTickets.length;

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/40 via-white to-green-50/40">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Welcome Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                {formatDate(currentTime)}
              </p>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
                Welcome back,{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-saffron via-brand-navy to-brand-green">
                  {user?.firstName || "Traveler"}
                </span>
              </h1>
              <p className="text-gray-500 text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {formatTime(currentTime)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2.5 rounded-xl bg-green-50 border border-green-100 flex items-center gap-2 shadow-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700 font-semibold text-sm">
                  {overallNetworkStatus === "Healthy"
                    ? "All Systems Operational"
                    : `${overallNetworkStatus} Network Status`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-10">
          <StatCard
            icon={<Train className="w-6 h-6" />}
            label="Active Trains"
            value="2,847"
            change="+12%"
            color="blue"
          />
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Daily Passengers"
            value="100K+"
            change="+8%"
            color="purple"
          />
          <StatCard
            icon={<Ticket className="w-6 h-6" />}
            label="Your Tickets"
            value={`${totalTicketCount}`}
            change={activeTicketCount > 0 ? "Active" : "None"}
            color="green"
          />
          <StatCard
            icon={<Clock className="w-6 h-6" />}
            label="On-Time Rate"
            value="94%"
            change="+2%"
            color="orange"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Quick Actions & Recent Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-brand-saffron" />
                  </div>
                  Quick Actions
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ActionCard
                  to="/map"
                  icon={<MapPin className="w-8 h-8" />}
                  title="Live Map"
                  description="Track trains in real-time"
                  color="purple"
                />
                <ActionCard
                  to="/ticketing"
                  icon={<Ticket className="w-8 h-8" />}
                  title="Book Ticket"
                  description="Quick ticket booking"
                  color="blue"
                />
                <ActionCard
                  to="/live-status"
                  icon={<Train className="w-8 h-8" />}
                  title="Live Status"
                  description="Check train schedules"
                  color="green"
                />
                <ActionCard
                  to="/user-dashboard"
                  icon={<Ticket className="w-8 h-8" />}
                  title="My Tickets"
                  description="View all your tickets"
                  color="orange"
                />
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  Recent Activity
                </h2>
                <button
                  onClick={() => navigate("/user-dashboard")}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {loadingActivity ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-gray-500">
                    <Loader className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-sm font-medium">Loading recent activity...</span>
                  </div>
                ) : recentActivities.length > 0 ? (
                  recentActivities.map((act) => (
                    <ActivityItem
                      key={act.id}
                      icon={act.icon}
                      title={act.title}
                      time={act.time}
                      description={act.description}
                    />
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium">No recent activity.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Live Crowd Status */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  Live Crowd Status
                </h3>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  Live
                </span>
              </div>
              <div className="space-y-3">
                {loadingCrowd ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-gray-500">
                    <Loader className="w-5 h-5 animate-spin text-purple-600" />
                    <span className="text-sm font-medium">Loading crowd data...</span>
                  </div>
                ) : crowdStatusList.length > 0 ? (
                  crowdStatusList.map((item) => (
                    <CrowdStatusItem
                      key={item.station}
                      station={item.station}
                      crowd={item.crowd}
                      percentage={item.percentage}
                    />
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium">No crowd data available.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Nearest Stations & Network Status */}
          <div className="space-y-6">
            {/* Nearest Stations */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  Nearest Stations
                </h2>
                <Link
                  to="/map"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Map
                </Link>
              </div>

              {loadingLocation ? (
                <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
                  <Loader className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-sm font-medium">Getting your location...</span>
                </div>
              ) : nearestStations.length > 0 ? (
                <div className="space-y-3">
                  {nearestStations.map((station) => (
                    <div
                      key={station.id}
                      onClick={() => handleSelectNearestStation(station)}
                      className="p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-xl ${
                            station.type === "Metro" ? "bg-purple-50" : "bg-blue-50"
                          } group-hover:scale-105 transition-transform duration-200`}
                        >
                          {station.type === "Metro" ? (
                            <Train className="w-5 h-5 text-purple-600" />
                          ) : (
                            <Train className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <h4 className="font-medium text-gray-900 truncate">
                              {station.name}
                            </h4>
                            <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-green-50 text-green-700 flex-shrink-0">
                              {station.distance < 1
                                ? `${Math.round(station.distance * 1000)}m`
                                : `${station.distance.toFixed(1)}km`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-md ${
                                station.type === "Metro"
                                  ? "bg-purple-50 text-purple-600"
                                  : "bg-blue-50 text-blue-600"
                              }`}
                            >
                              {station.type}
                            </span>
                            <span className="text-xs text-gray-400">
                              {station.line}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm font-medium">
                    {locationError || "Unable to fetch nearest stations"}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Please enable location access to view nearby stations
                  </p>
                </div>
              )}
            </div>


            {/* Network Status */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  Network Status
                </h3>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    overallNetworkStatus === "Healthy"
                      ? "text-green-600 bg-green-50"
                      : overallNetworkStatus === "Moderate"
                      ? "text-yellow-600 bg-yellow-50"
                      : "text-red-600 bg-red-50"
                  }`}
                >
                  {overallNetworkStatus}
                </span>
              </div>
              <div className="space-y-3">
                {loadingNetwork ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-gray-500">
                    <Loader className="w-5 h-5 animate-spin text-green-600" />
                    <span className="text-sm font-medium">Loading network status...</span>
                  </div>
                ) : (
                  networkLines.map((line) => (
                    <StatusBar
                      key={line.label}
                      label={line.label}
                      value={line.value}
                      color={line.color}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon, label, value, change, color }) => {
  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-600",
      badge: "bg-blue-100 text-blue-700",
    },
    purple: {
      bg: "bg-purple-50",
      text: "text-purple-600",
      badge: "bg-purple-100 text-purple-700",
    },
    green: {
      bg: "bg-green-50",
      text: "text-green-600",
      badge: "bg-green-100 text-green-700",
    },
    orange: {
      bg: "bg-orange-50",
      text: "text-orange-600",
      badge: "bg-orange-100 text-orange-700",
    },
  };

  const colors = colorClasses[color];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`p-2.5 rounded-xl ${colors.bg} ${colors.text} group-hover:scale-110 transition-transform duration-300`}
        >
          {icon}
        </div>
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-lg ${colors.badge}`}
        >
          {change}
        </span>
      </div>
      <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-0.5">
        {value}
      </h3>
      <p className="text-gray-500 font-medium text-sm">{label}</p>
    </div>
  );
};

// Action Card Component
const ActionCard = ({ to, icon, title, description, color }) => {
  const colorClasses = {
    purple: {
      bg: "bg-purple-50",
      hover: "hover:bg-purple-100",
      icon: "text-purple-600",
      border: "hover:border-purple-200",
    },
    blue: {
      bg: "bg-blue-50",
      hover: "hover:bg-blue-100",
      icon: "text-blue-600",
      border: "hover:border-blue-200",
    },
    green: {
      bg: "bg-green-50",
      hover: "hover:bg-green-100",
      icon: "text-green-600",
      border: "hover:border-green-200",
    },
    orange: {
      bg: "bg-orange-50",
      hover: "hover:bg-orange-100",
      icon: "text-orange-600",
      border: "hover:border-orange-200",
    },
  };

  const colors = colorClasses[color];

  return (
    <Link
      to={to}
      className={`p-4 rounded-xl border border-transparent ${colors.bg} ${colors.hover} ${colors.border} transition-all duration-300 cursor-pointer group`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-2.5 bg-white rounded-xl shadow-sm ${colors.icon} group-hover:scale-105 transition-transform duration-300`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-0.5">{title}</h3>
          <p className="text-sm text-gray-500 truncate">{description}</p>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 group-hover:text-gray-600 transition-all duration-300 flex-shrink-0" />
      </div>
    </Link>
  );
};

// Activity Item Component
const ActivityItem = ({ icon, title, time, description }) => {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors duration-200 group">
      <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-white group-hover:shadow-sm transition-all duration-200">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <h4 className="font-medium text-gray-900 truncate">{title}</h4>
          <span className="text-xs text-gray-400 flex-shrink-0">{time}</span>
        </div>
        <p className="text-sm text-gray-500 truncate">{description}</p>
      </div>
    </div>
  );
};

// Alert Card Component
const AlertCard = ({ type, title, description, time }) => {
  const typeStyles = {
    warning: "bg-yellow-50 border-yellow-200 text-yellow-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
    success: "bg-green-50 border-green-200 text-green-700",
  };

  return (
    <div className={`p-3 rounded-lg border-2 ${typeStyles[type]}`}>
      <div className="flex items-start justify-between mb-1">
        <h4 className="font-semibold text-sm">{title}</h4>
        <span className="text-xs opacity-70">{time}</span>
      </div>
      <p className="text-xs opacity-80">{description}</p>
    </div>
  );
};

// Status Bar Component
const StatusBar = ({ label, value, color }) => {
  return (
    <div className="py-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{value}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${value}%` }}
        ></div>
      </div>
    </div>
  );
};

// Crowd Status Item Component
const CrowdStatusItem = ({ station, crowd, percentage }) => {
  const crowdColors = {
    Low: {
      bg: "bg-green-50",
      text: "text-green-700",
      bar: "bg-green-500",
      dot: "bg-green-500",
    },
    Medium: {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      bar: "bg-yellow-500",
      dot: "bg-yellow-500",
    },
    Moderate: {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      bar: "bg-yellow-500",
      dot: "bg-yellow-500",
    },
    High: {
      bg: "bg-red-50",
      text: "text-red-700",
      bar: "bg-red-500",
      dot: "bg-red-500",
    },
  };

  const colors = crowdColors[crowd] || crowdColors.Low;

  return (
    <div className="py-1">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>
          <span className="text-sm font-medium text-gray-700">{station}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-md font-medium ${colors.bg} ${colors.text}`}
          >
            {crowd}
          </span>
        </div>
        <span className="text-xs font-semibold text-gray-600">
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full ${colors.bar} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default Dashboard;
