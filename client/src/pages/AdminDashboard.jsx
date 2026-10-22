import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  Users,
  AlertTriangle,
  TrendingUp,
  Clock,
  Download,
  Filter,
  MapPin,
  Calendar,
  ArrowUpRight,
  Train,
  Radio,
  QrCode,
  Scan,
  Ticket,
  CheckCircle,
  XCircle,
  Loader,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AdminNavbar from "../components/AdminNavbar";
import { formatViaStation } from "../utils/ticketUtils";
import {
  isTicketValid,
  getTicketIssueDate,
  formatTicketDateTime,
} from "../utils/ticketUtils";

// Sample Data
const routeOccupancyData = [
  {
    route: "Churchgate-Borivali",
    current: 8500,
    capacity: 10000,
    percentage: 85,
    status: "critical",
  },
  {
    route: "CST-Thane",
    current: 7200,
    capacity: 9000,
    percentage: 80,
    status: "high",
  },
  {
    route: "Andheri-Virar",
    current: 6800,
    capacity: 10000,
    percentage: 68,
    status: "moderate",
  },
  {
    route: "Dadar-Kalyan",
    current: 5500,
    capacity: 8000,
    percentage: 69,
    status: "moderate",
  },
  {
    route: "Bandra-Churchgate",
    current: 4200,
    capacity: 7000,
    percentage: 60,
    status: "normal",
  },
  {
    route: "Kurla-CST",
    current: 3800,
    capacity: 6000,
    percentage: 63,
    status: "moderate",
  },
];

const hourlyTrafficData = [
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

const peakHourData = [
  { period: "Morning Peak", time: "08:00-10:00", avgLoad: 95, incidents: 12 },
  { period: "Mid-Day", time: "11:00-16:00", avgLoad: 65, incidents: 3 },
  { period: "Evening Peak", time: "17:00-20:00", avgLoad: 98, incidents: 18 },
  { period: "Late Night", time: "21:00-23:00", avgLoad: 45, incidents: 1 },
];

const crowdDistribution = [
  { name: "Critical (>90%)", value: 28, color: "#dc2626" },
  { name: "High (70-90%)", value: 35, color: "#f97316" },
  { name: "Moderate (50-70%)", value: 22, color: "#eab308" },
  { name: "Normal (<50%)", value: 15, color: "#22c55e" },
];

const stationHeatmapData = [
  {
    station: "Churchgate",
    "05:00": 30,
    "06:00": 70,
    "07:00": 95,
    "08:00": 98,
    "09:00": 92,
    "10:00": 65,
  },
  {
    station: "Marine Lines",
    "05:00": 25,
    "06:00": 60,
    "07:00": 85,
    "08:00": 90,
    "09:00": 82,
    "10:00": 55,
  },
  {
    station: "Charni Road",
    "05:00": 28,
    "06:00": 65,
    "07:00": 88,
    "08:00": 93,
    "09:00": 85,
    "10:00": 58,
  },
  {
    station: "Grant Road",
    "05:00": 32,
    "06:00": 72,
    "07:00": 92,
    "08:00": 96,
    "09:00": 88,
    "10:00": 62,
  },
  {
    station: "Mumbai Central",
    "05:00": 35,
    "06:00": 75,
    "07:00": 94,
    "08:00": 97,
    "09:00": 90,
    "10:00": 68,
  },
  {
    station: "Dadar",
    "05:00": 40,
    "06:00": 82,
    "07:00": 98,
    "08:00": 99,
    "09:00": 95,
    "10:00": 75,
  },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState("today");
  const [selectedRoute, setSelectedRoute] = useState("all");
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketFilter, setTicketFilter] = useState("all"); // all, active, expired
  const [dateFilter, setDateFilter] = useState("all"); // all, today, week, month, custom
  const [selectedDateVal, setSelectedDateVal] = useState("");
  const [disruptions, setDisruptions] = useState([]);
  const [smsLogs, setSmsLogs] = useState([]);

  useEffect(() => {
    fetchTickets();
    fetchDisruptionsAndLogs();
  }, []);

  const fetchDisruptionsAndLogs = async () => {
    try {
      const resD = await fetch("http://localhost:5000/api/disruptions");
      if (resD.ok) {
        const data = await resD.json();
        setDisruptions(data.disruptions || []);
      }
      const resS = await fetch("http://localhost:5000/api/disruptions/sms-logs");
      if (resS.ok) {
        const data = await resS.json();
        setSmsLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Error fetching disruption control data:", e);
    }
  };

  const handleCreateTestDisruption = async () => {
    const testDisruption = {
      disruptionId: `DISRUPT_TEST_${Date.now()}`,
      title: "[TEST/MOCK EVENT] Central Line Signal Disruption (Thane - Dadar)",
      type: "route_disruption",
      line: "Central",
      affectedSegment: ["Thane", "Kurla", "Dadar"],
      affectedStations: ["Thane", "Kurla", "Dadar"],
      affectedTrains: ["CR_1001", "CR_1003", "CR_1005"],
      severity: "high",
      delayMinutes: 30,
      status: "Verified Test Disruption Event",
      message: "Central Line service disruption simulated between Thane and Dadar for dev testing.",
      isTestEvent: true,
    };

    try {
      const res = await fetch("http://localhost:5000/api/admin/disruptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testDisruption),
      });
      if (res.ok) {
        fetchDisruptionsAndLogs();
      }
    } catch (e) {
      console.error("Error creating test disruption:", e);
    }
  };

  const handleClearDisruption = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/disruptions/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchDisruptionsAndLogs();
      }
    } catch (e) {
      console.error("Error clearing disruption:", e);
    }
  };

  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const response = await fetch("http://localhost:5000/api/tickets?admin=true", {
        headers: { "x-admin": "true" },
      });
      if (response.ok) {
        const data = await response.json();
        setTickets(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const parseTicketDate = (ticket) => {
    if (!ticket) return null;
    const d = getTicketIssueDate(ticket);
    if (d && !isNaN(d.getTime())) return d;

    const rawStr = ticket.issued_at || ticket.issuedAt || ticket.created_at || ticket.createdAt || ticket.date;
    if (rawStr) {
      const parsed = new Date(rawStr);
      if (!isNaN(parsed.getTime())) return parsed;

      if (typeof rawStr === "string" && rawStr.includes("/")) {
        const parts = rawStr.split("/");
        if (parts.length === 3) {
          const dNum = parseInt(parts[0], 10);
          const mNum = parseInt(parts[1], 10);
          const yNum = parseInt(parts[2], 10);
          if (yNum > 1000) {
            return new Date(yNum, mNum - 1, dNum);
          }
        }
      }
    }
    return null;
  };

  const isToday = (ticketDate) => {
    if (!ticketDate) return false;
    const now = new Date();
    return (
      ticketDate.getFullYear() === now.getFullYear() &&
      ticketDate.getMonth() === now.getMonth() &&
      ticketDate.getDate() === now.getDate()
    );
  };

  const isThisWeek = (ticketDate) => {
    if (!ticketDate) return false;
    const now = new Date();
    const day = now.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return ticketDate >= startOfWeek && ticketDate <= endOfWeek;
  };

  const isThisMonth = (ticketDate) => {
    if (!ticketDate) return false;
    const now = new Date();
    return (
      ticketDate.getFullYear() === now.getFullYear() &&
      ticketDate.getMonth() === now.getMonth()
    );
  };

  const isSpecificDate = (ticketDate, targetDateStr) => {
    if (!ticketDate || !targetDateStr) return false;
    const [tYear, tMonth, tDay] = targetDateStr.split("-").map((n) => parseInt(n, 10));
    return (
      ticketDate.getFullYear() === tYear &&
      ticketDate.getMonth() === tMonth - 1 &&
      ticketDate.getDate() === tDay
    );
  };

  const getFilteredTickets = () => {
    let result = tickets;

    if (ticketFilter === "active") {
      result = result.filter((t) => isTicketValid(t));
    } else if (ticketFilter === "expired") {
      result = result.filter((t) => !isTicketValid(t));
    }

    if (dateFilter === "today") {
      result = result.filter((t) => isToday(parseTicketDate(t)));
    } else if (dateFilter === "week") {
      result = result.filter((t) => isThisWeek(parseTicketDate(t)));
    } else if (dateFilter === "month") {
      result = result.filter((t) => isThisMonth(parseTicketDate(t)));
    } else if (dateFilter === "custom" && selectedDateVal) {
      result = result.filter((t) => isSpecificDate(parseTicketDate(t), selectedDateVal));
    }

    return result;
  };

  const getDateFilteredTicketsForRevenue = () => {
    const eligible = tickets.filter((t) => {
      const st = (t.status || "").toLowerCase();
      return st !== "cancelled" && st !== "revoked" && !t.cancelled && !t.is_cancelled;
    });

    if (dateFilter === "today") {
      return eligible.filter((t) => isToday(parseTicketDate(t)));
    } else if (dateFilter === "week") {
      return eligible.filter((t) => isThisWeek(parseTicketDate(t)));
    } else if (dateFilter === "month") {
      return eligible.filter((t) => isThisMonth(parseTicketDate(t)));
    } else if (dateFilter === "custom" && selectedDateVal) {
      return eligible.filter((t) => isSpecificDate(parseTicketDate(t), selectedDateVal));
    }

    return eligible;
  };

  const activeTicketsCount = tickets.filter((t) => isTicketValid(t)).length;
  const revenueTickets = getDateFilteredTicketsForRevenue();
  const totalRevenue = revenueTickets.reduce((sum, t) => sum + (parseFloat(t.fare) || 0), 0);

  const handleExportReport = () => {
    // Generate CSV data
    const reportData = `
Mumbai Rail Admin Dashboard - Generated on ${new Date().toLocaleString()}

=== ROUTE OCCUPANCY REPORT ===
Route,Current Passengers,Capacity,Occupancy %,Status
${routeOccupancyData.map((r) => `${r.route},${r.current},${r.capacity},${r.percentage}%,${r.status}`).join("\n")}

=== PEAK HOUR ANALYSIS ===
Period,Time Range,Avg Load %,Incidents
${peakHourData.map((p) => `${p.period},${p.time},${p.avgLoad}%,${p.incidents}`).join("\n")}

=== CROWD DISTRIBUTION ===
Category,Percentage
${crowdDistribution.map((c) => `${c.name},${c.value}%`).join("\n")}
        `.trim();

    // Create blob and download
    const blob = new Blob([reportData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Mumbai_Rail_Report_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-green-50/30">
      <AdminNavbar />

      <div className="max-w-[1600px] mx-auto p-4 md:p-8">
        {/* Header Section */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-brand-saffron to-brand-navy rounded-xl shadow-lg">
                  <Activity className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-brand-navy">
                    Admin Control Center
                  </h1>
                  <p className="text-gray-600 font-medium">
                    Real-time Network Intelligence & Analytics
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Time Filter */}
              <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl shadow-md border border-gray-200">
                <Calendar className="w-4 h-4 text-brand-navy" />
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="bg-transparent font-semibold text-sm text-brand-navy outline-none cursor-pointer"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {/* Export Button */}
              <Link
                to="/scan"
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                <QrCode className="w-4 h-4" />
                Verify Tickets
              </Link>

              <button
                onClick={handleExportReport}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-saffron to-orange-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                <Download className="w-4 h-4" />
                Export Report
              </button>

              {/* Live Indicator */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-md border border-green-200">
                <Radio className="w-4 h-4 text-green-600 animate-pulse" />
                <span className="text-sm font-bold text-green-600">LIVE</span>
              </div>
            </div>
          </div>
        </header>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <MetricCard
            icon={<Ticket className="w-6 h-6" />}
            label="Total Tickets Sold"
            value={tickets.length.toString()}
            change={`₹${totalRevenue.toLocaleString("en-IN")} Revenue`}
            trend="up"
            gradient="from-purple-500 to-purple-700"
          />
          <MetricCard
            icon={<Activity className="w-6 h-6" />}
            label="Network Load Average"
            value="87%"
            change="Critical"
            trend="warning"
            gradient="from-orange-500 to-red-600"
          />
          <MetricCard
            icon={<AlertTriangle className="w-6 h-6" />}
            label="Active Alerts"
            value="8"
            change="3 Critical"
            trend="down"
            gradient="from-red-500 to-red-700"
          />
          <MetricCard
            icon={<Train className="w-6 h-6" />}
            label="Active Trains"
            value="342"
            change="98% On-time"
            trend="up"
            gradient="from-green-500 to-green-700"
          />
        </div>

        {/* Live Occupancy Per Route */}
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-brand-navy flex items-center gap-3">
              <MapPin className="w-6 h-6 text-brand-saffron" />
              Live Occupancy Per Route
            </h2>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg font-semibold text-sm outline-none focus:ring-2 focus:ring-brand-navy"
              >
                <option value="all">All Routes</option>
                <option value="western">Western Line</option>
                <option value="central">Central Line</option>
                <option value="harbour">Harbour Line</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {routeOccupancyData.map((route, idx) => (
              <RouteCard key={idx} route={route} />
            ))}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Busiest Routes Chart */}
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-brand-navy mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-saffron" />
              Busiest Routes & Crowd Distribution
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={routeOccupancyData}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="route"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 11, fill: "#4b5563" }}
                  />
                  <YAxis tick={{ fill: "#4b5563" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "2px solid #1e3a8a",
                      borderRadius: "12px",
                      fontWeight: "bold",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="current"
                    fill="#1e40af"
                    name="Current Load"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    dataKey="capacity"
                    fill="#94a3b8"
                    name="Capacity"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Crowd Distribution Pie Chart */}
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-brand-navy mb-6">
              Crowd Density Distribution
            </h2>
            <div className="h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={crowdDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {crowdDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Disruption & SMS Delivery Control Panel */}
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                Train Disruption & SMS Gateway Status Engine
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Manage live service disruptions, trigger test events, and track SMS delivery status.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreateTestDisruption}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow transition-all"
              >
                + Create Dev Test Event
              </button>
              <button
                onClick={fetchDisruptionsAndLogs}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-all"
              >
                Refresh Status
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Active Disruptions Panel */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                Active Disruptions ({disruptions.length})
              </h3>
              {disruptions.length === 0 ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-xs font-semibold">
                  No active disruptions reported. All services running normally.
                </div>
              ) : (
                disruptions.map((d) => (
                  <div key={d.disruptionId} className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-900 text-sm">{d.title}</span>
                      {d.isTestEvent && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded uppercase">
                          [TEST/MOCK DATA]
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-red-700">{d.message}</p>
                    <div className="flex items-center justify-between pt-2 text-[11px] font-bold text-gray-600">
                      <span>Line: {d.line || "All"} • Delay: +{d.delayMinutes || 15}m</span>
                      <button
                        onClick={() => handleClearDisruption(d.disruptionId)}
                        className="text-red-700 hover:text-red-900 underline font-extrabold"
                      >
                        Clear Disruption
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* SMS Delivery Tracking Log */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                SMS Gateway Delivery Log ({smsLogs.length})
              </h3>
              {smsLogs.length === 0 ? (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 text-xs font-medium">
                  No SMS notifications dispatched yet in this session.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {smsLogs.map((log, idx) => (
                    <div key={log.id || idx} className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">To: {log.to}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          log.status === "delivered" ? "bg-green-100 text-green-800" : log.status === "failed" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {log.status || "queued"}
                        </span>
                      </div>
                      <p className="text-gray-600 text-[11px] truncate">{log.message}</p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(log.timestamp).toLocaleTimeString()} • Key: {log.dedupeKey}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hourly Traffic Analysis */}
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-brand-navy mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-saffron" />
            24-Hour Crowd Trend Analysis
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={hourlyTrafficData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="colorPassengers"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#1e40af" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#1e40af" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient
                    id="colorCapacity"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" tick={{ fill: "#4b5563" }} />
                <YAxis tick={{ fill: "#4b5563" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "2px solid #1e3a8a",
                    borderRadius: "12px",
                    fontWeight: "bold",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="passengers"
                  stroke="#1e40af"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorPassengers)"
                  name="Passenger Count"
                />
                <Area
                  type="monotone"
                  dataKey="capacity"
                  stroke="#dc2626"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fillOpacity={1}
                  fill="url(#colorCapacity)"
                  name="Max Capacity"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Hour Analysis */}
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-brand-navy mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-saffron" />
            Peak Hour Analysis & Incidents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {peakHourData.map((period, idx) => (
              <PeakHourCard key={idx} data={period} />
            ))}
          </div>
        </div>

        {/* User Tickets Section */}
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h2 className="text-xl font-bold text-brand-navy flex items-center gap-2">
              <Ticket className="w-5 h-5 text-brand-saffron" />
              User Tickets Management
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-right mr-2">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Revenue</p>
                <p className="text-lg font-black text-green-600">
                  ₹{totalRevenue.toLocaleString("en-IN")}
                </p>
              </div>

              {/* Booking Date Filters */}
              <div className="flex items-center gap-1 bg-gray-100/90 rounded-xl p-1 flex-wrap">
                <button
                  onClick={() => {
                    setDateFilter("all");
                    setSelectedDateVal("");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                    dateFilter === "all"
                      ? "bg-white text-brand-navy shadow-sm border border-gray-200"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  All Tickets
                </button>
                <button
                  onClick={() => {
                    setDateFilter("today");
                    setSelectedDateVal("");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                    dateFilter === "today"
                      ? "bg-white text-brand-navy shadow-sm border border-gray-200"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    setDateFilter("week");
                    setSelectedDateVal("");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                    dateFilter === "week"
                      ? "bg-white text-brand-navy shadow-sm border border-gray-200"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => {
                    setDateFilter("month");
                    setSelectedDateVal("");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                    dateFilter === "month"
                      ? "bg-white text-brand-navy shadow-sm border border-gray-200"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  This Month
                </button>

                <div className="flex items-center gap-1.5 px-2 py-0.5">
                  <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Select Date:</span>
                  <input
                    type="date"
                    value={selectedDateVal}
                    onChange={(e) => {
                      if (e.target.value) {
                        setDateFilter("custom");
                        setSelectedDateVal(e.target.value);
                      } else {
                        setDateFilter("all");
                        setSelectedDateVal("");
                      }
                    }}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold border outline-none transition-all ${
                      dateFilter === "custom"
                        ? "bg-white border-brand-saffron text-brand-navy font-bold shadow-sm"
                        : "bg-white/80 border-gray-200 text-gray-700"
                    }`}
                  />
                </div>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setTicketFilter("all")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    ticketFilter === "all"
                      ? "bg-white text-brand-navy shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  All Status
                </button>
                <button
                  onClick={() => setTicketFilter("active")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    ticketFilter === "active"
                      ? "bg-white text-green-600 shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  Active ({activeTicketsCount})
                </button>
                <button
                  onClick={() => setTicketFilter("expired")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    ticketFilter === "expired"
                      ? "bg-white text-red-600 shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  Expired ({tickets.length - activeTicketsCount})
                </button>
              </div>
            </div>
          </div>

          {loadingTickets ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-brand-navy" />
            </div>
          ) : getFilteredTickets().length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="w-16 h-16 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 font-medium">No tickets found for the selected period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Ticket ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Route
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Passengers
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Fare
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Issued
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getFilteredTickets()
                    .slice(0, 20)
                    .map((ticket, idx) => {
                      const isValid = isTicketValid(ticket);
                      return (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-gray-900">
                              {ticket.ticket_id.substring(0, 16)}...
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900 flex items-center gap-1.5 flex-wrap">
                              <span>{ticket.source} → {ticket.destination}</span>
                               {formatViaStation(ticket.via) && formatViaStation(ticket.via) !== "Direct" && (
                                 <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-800 rounded border border-blue-200">
                                   Via: {formatViaStation(ticket.via)}
                                 </span>
                               )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {ticket.ticket_type}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {ticket.class}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-semibold text-gray-900">
                              {ticket.passengers}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-green-600">
                              ₹{ticket.fare}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">
                              {formatTicketDateTime(getTicketIssueDate(ticket))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                                <CheckCircle className="w-3 h-3" />
                                Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                                <XCircle className="w-3 h-3" />
                                Expired
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() =>
                                navigate("/digital-ticket", { state: ticket })
                              }
                              className="text-brand-navy hover:text-brand-saffron font-semibold text-sm transition-colors"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {getFilteredTickets().length > 20 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    Showing 20 of {getFilteredTickets().length} tickets
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Station Heatmap */}
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-brand-navy mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-saffron" />
            Station Occupancy Heatmap (Morning Hours)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="px-4 py-3 text-left font-bold text-brand-navy">
                    Station
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-brand-navy">
                    05:00
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-brand-navy">
                    06:00
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-brand-navy">
                    07:00
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-brand-navy">
                    08:00
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-brand-navy">
                    09:00
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-brand-navy">
                    10:00
                  </th>
                </tr>
              </thead>
              <tbody>
                {stationHeatmapData.map((station, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {station.station}
                    </td>
                    {["05:00", "06:00", "07:00", "08:00", "09:00", "10:00"].map(
                      (time, i) => (
                        <td key={i} className="px-4 py-3">
                          <HeatmapCell value={station[time]} />
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded"
                style={{ backgroundColor: "#22c55e" }}
              ></div>
              <span className="text-sm font-medium text-gray-600">
                Low (&lt;50%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded"
                style={{ backgroundColor: "#eab308" }}
              ></div>
              <span className="text-sm font-medium text-gray-600">
                Moderate (50-70%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded"
                style={{ backgroundColor: "#f97316" }}
              ></div>
              <span className="text-sm font-medium text-gray-600">
                High (70-90%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded"
                style={{ backgroundColor: "#dc2626" }}
              ></div>
              <span className="text-sm font-medium text-gray-600">
                Critical (&gt;90%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const MetricCard = ({ icon, label, value, change, trend, gradient }) => {
  const trendColors = {
    up: "bg-green-100 text-green-700 border-green-300",
    down: "bg-blue-100 text-blue-700 border-blue-300",
    warning: "bg-red-100 text-red-700 border-red-300",
  };

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div
          className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}
        >
          <div className="text-white">{icon}</div>
        </div>
        <span
          className={`text-xs font-bold px-3 py-1.5 rounded-full border ${trendColors[trend]}`}
        >
          {change}
        </span>
      </div>
      <h3 className="text-4xl font-black text-brand-navy mb-1">{value}</h3>
      <p className="text-gray-600 font-semibold text-sm">{label}</p>
    </div>
  );
};

const RouteCard = ({ route }) => {
  const getStatusColor = (status) => {
    const colors = {
      critical: "from-red-500 to-red-700",
      high: "from-orange-500 to-orange-700",
      moderate: "from-yellow-500 to-yellow-700",
      normal: "from-green-500 to-green-700",
    };
    return colors[status] || colors.normal;
  };

  const getStatusBg = (status) => {
    const colors = {
      critical: "bg-red-100 border-red-300 text-red-800",
      high: "bg-orange-100 border-orange-300 text-orange-800",
      moderate: "bg-yellow-100 border-yellow-300 text-yellow-800",
      normal: "bg-green-100 border-green-300 text-green-800",
    };
    return colors[status] || colors.normal;
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-brand-navy text-sm">{route.route}</h3>
        <span
          className={`text-xs font-bold px-2 py-1 rounded-full border ${getStatusBg(route.status)}`}
        >
          {route.status.toUpperCase()}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
          <span>{route.current.toLocaleString()} passengers</span>
          <span>{route.percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getStatusColor(route.status)} rounded-full transition-all duration-500`}
            style={{ width: `${route.percentage}%` }}
          ></div>
        </div>
      </div>

      <div className="text-xs text-gray-500 font-medium">
        Capacity: {route.capacity.toLocaleString()}
      </div>
    </div>
  );
};

const PeakHourCard = ({ data }) => {
  const isHighLoad = data.avgLoad > 90;

  return (
    <div
      className={`rounded-xl p-5 border-2 ${isHighLoad ? "bg-red-50 border-red-300" : "bg-green-50 border-green-300"} hover:shadow-lg transition-all`}
    >
      <h3 className="font-bold text-brand-navy mb-2">{data.period}</h3>
      <p className="text-sm text-gray-600 mb-3 font-medium">{data.time}</p>

      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">Avg Load:</span>
        <span
          className={`text-2xl font-black ${isHighLoad ? "text-red-600" : "text-green-600"}`}
        >
          {data.avgLoad}%
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">Incidents:</span>
        <span
          className={`text-xl font-bold px-2 py-1 rounded ${isHighLoad ? "bg-red-200 text-red-800" : "bg-green-200 text-green-800"}`}
        >
          {data.incidents}
        </span>
      </div>
    </div>
  );
};

const HeatmapCell = ({ value }) => {
  const getColor = (val) => {
    if (val >= 90) return "#dc2626"; // Critical - Red
    if (val >= 70) return "#f97316"; // High - Orange
    if (val >= 50) return "#eab308"; // Moderate - Yellow
    return "#22c55e"; // Normal - Green
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className="w-16 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-md transition-all hover:scale-110"
        style={{ backgroundColor: getColor(value) }}
      >
        {value}%
      </div>
    </div>
  );
};

export default AdminDashboard;
