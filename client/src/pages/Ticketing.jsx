import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import Navbar from "../components/Navbar";
import {
  Train,
  CreditCard,
  ChevronRight,
  Wallet,
  Plus,
  Loader,
  Zap,
  Calendar,
  Ticket as TicketIcon,
  Tag,
  CheckCircle,
  Route as RouteIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  westernLineStations,
  allRailwayStationsList,
  allMetroStationsList,
  localStationCategories,
  getStationDisplayLabel,
  getStationLines,
} from "../utils/stations";
import { getWalletBalance, addMoney, deductMoney } from "../utils/wallet";
import { calculateFare, calculateSeasonFare } from "../utils/fareCalculator";
import { getTicketExpiryDate, calculateSeasonExpiry, formatTicketDateTime } from "../utils/ticketUtils";
import { getAvailableRoutes, findMetroRoute, findLocalRoute } from "../utils/routeUtils";
import { searchUpcomingTrains } from "../utils/timetableData";

// Metro Lines and Stations Data
const metroLines = {
  "Blue Line (Line 1)": [
    "Versova",
    "D.N. Nagar",
    "Azad Nagar",
    "Andheri",
    "Western Express Highway (WEH)",
    "Chakala (J.B. Nagar)",
    "Airport Road",
    "Marol Naka",
    "Saki Naka",
    "Asalpha",
    "Jagruti Nagar",
    "Ghatkopar",
  ],
  "Yellow Line (Line 2A)": [
    "Dahisar (East)",
    "Anand Nagar",
    "Kandarpada",
    "Mandapeshwar (IC Colony)",
    "Eksar",
    "Borivali (West)",
    "Pahadi Eksar",
    "Kandivali (West)",
    "Dahanukarwadi",
    "Valnai (Meeth Chowky)",
    "Malad (West)",
    "Lower Malad",
    "Pahadi Goregaon",
    "Goregaon (West)",
    "Oshiwara",
    "Lower Oshiwara",
    "Andheri (West)",
  ],
  "Red Line (Line 7)": [
    "Dahisar (East)",
    "Ovaripada",
    "Rashtriya Udyan (National Park)",
    "Devipada",
    "Magathane",
    "Poisar",
    "Akurli",
    "Kurar",
    "Dindoshi",
    "Aarey",
    "Goregaon (East)",
    "Jogeshwari (East)",
    "Mogra",
    "Gundavali",
  ],
  "Aqua Line (Line 3)": [
    "Aarey JVLR",
    "SEEPZ",
    "MIDC Andheri",
    "Marol Naka",
    "CSMIA T2 (International Airport)",
    "Sahar Road",
    "CSMIA T1 (Domestic Airport)",
    "Santacruz",
    "Bandra Colony",
    "BKC (Bandra Kurla Complex)",
    "Dharavi",
    "Shitaladevi Mandir",
    "Dadar",
    "Siddhivinayak",
    "Worli",
    "Acharya Atre Chowk",
    "Science Centre",
    "Mahalaxmi",
    "Jagannath Shankar Sheth (Mumbai Central)",
    "Grant Road",
    "Girgaon",
    "Kalbadevi",
    "CSMT (Chhatrapati Shivaji Maharaj Terminus)",
    "Hutatma Chowk",
    "Churchgate",
    "Vidhan Bhavan",
    "Cuffe Parade",
  ],
};

const Ticketing = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const userId = user?.id || null;
  const [walletError, setWalletError] = useState("");
  const [walletSuccessMsg, setWalletSuccessMsg] = useState("");
  const [isAddingMoney, setIsAddingMoney] = useState(false);

  // Booking category: 'journey' | 'season' | 'counter'
  const [bookingCategory, setBookingCategory] = useState("journey");
  const [ticketMode, setTicketMode] = useState("rail"); // 'rail' or 'metro'
  const [metroLine, setMetroLine] = useState("");

  // Journey Ticket State
  const [formData, setFormData] = useState({
    source: "",
    destination: "",
    ticketType: "Single Journey",
    class: "Second Class",
    passengers: 1,
  });

  // Season Ticket State
  const [seasonData, setSeasonData] = useState({
    source: "",
    destination: "",
    seasonType: "Monthly", // 'Monthly', 'Quarterly', 'Yearly'
    class: "Second Class",
    validFrom: new Date().toISOString().split("T")[0],
    ticketMode: "rail", // 'rail' or 'metro'
  });

  // Counter Ticket State
  const [counterData, setCounterData] = useState({
    utsNumber: "",
    source: "",
    destination: "",
    ticketType: "Single Journey",
    class: "Second Class",
    passengers: 1,
    journeyDate: new Date().toISOString().split("T")[0],
  });

  // Via / Route Recommendation State
  const [availableViaRoutes, setAvailableViaRoutes] = useState([]);
  const [selectedVia, setSelectedVia] = useState("Direct");

  // Train / Service Selection State
  const [availableTrains, setAvailableTrains] = useState([]);
  const [selectedTrainId, setSelectedTrainId] = useState("");

  // Local Station Category Filter: 'All' | 'Central' | 'Harbour' | 'Western' | 'Trans-Harbour'
  const [lineCategoryFilter, setLineCategoryFilter] = useState("All");

  const [walletBalance, setWalletBalance] = useState(0);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState("");
  const [fare, setFare] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const renderLineCategoryPills = () => (
    <div className="flex items-center gap-1 p-1 bg-gray-100/90 rounded-xl mb-2 flex-wrap">
      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider px-2">Line:</span>
      {["All", "Central", "Harbour", "Western", "Trans-Harbour"].map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => setLineCategoryFilter(cat)}
          className={`flex-1 py-1 text-[11px] font-extrabold rounded-lg transition-all ${
            lineCategoryFilter === cat
              ? "bg-white text-brand-navy shadow-sm border border-gray-200"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );

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

    if (filterVal === "Trans-Harbour") {
      return Object.entries(localStationCategories["Trans-Harbour"] || {}).map(([branch, stns]) => (
        <optgroup key={`th-${branch}`} label={`Trans-Harbour — ${branch}`}>
          {stns.map((s) => {
            const lines = getStationLines(s);
            return (
              <option key={`th-${s}`} value={s}>
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
        <optgroup label="Trans-Harbour Line">
          {Array.from(new Set(Object.values(localStationCategories["Trans-Harbour"] || {}).flat())).map((s) => (
            <option key={`all-th-${s}`} value={s}>
              {getStationDisplayLabel(s)}
            </option>
          ))}
        </optgroup>
      </>
    );
  };

  useEffect(() => {
    let isMounted = true;
    async function fetchUserWallet() {
      const bal = await getWalletBalance(userId);
      if (isMounted) setWalletBalance(bal);
    }
    fetchUserWallet();
    const savedSource = localStorage.getItem("selected_source");
    if (savedSource) {
      setFormData((prev) => ({ ...prev, source: savedSource }));
      setSeasonData((prev) => ({ ...prev, source: savedSource }));
      setCounterData((prev) => ({ ...prev, source: savedSource }));
      localStorage.removeItem("selected_source");
    }
    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Update Via routes whenever Source or Destination changes
  useEffect(() => {
    let src = "";
    let dst = "";
    if (bookingCategory === "journey") {
      src = formData.source;
      dst = formData.destination;
    } else if (bookingCategory === "season") {
      src = seasonData.source;
      dst = seasonData.destination;
    } else if (bookingCategory === "counter") {
      src = counterData.source;
      dst = counterData.destination;
    }

    if (src && dst && src !== dst) {
      const computedRoutes = getAvailableRoutes(src, dst);
      setAvailableViaRoutes(computedRoutes);
      if (computedRoutes.length > 0) {
        const rec = computedRoutes.find((r) => r.isRecommended && r.isAvailable !== false) || computedRoutes.find((r) => r.isAvailable !== false) || computedRoutes[0];
        setSelectedVia(rec.via);
      } else {
        setSelectedVia("Direct");
      }
    } else {
      setAvailableViaRoutes([]);
      setSelectedVia("Direct");
    }
  }, [formData.source, formData.destination, seasonData.source, seasonData.destination, counterData.source, counterData.destination, bookingCategory]);

  // Update available train services whenever Source, Destination, or selectedVia changes
  useEffect(() => {
    let src = "";
    let dst = "";
    if (bookingCategory === "journey") {
      src = formData.source;
      dst = formData.destination;
    } else if (bookingCategory === "season") {
      src = seasonData.source;
      dst = seasonData.destination;
    } else if (bookingCategory === "counter") {
      src = counterData.source;
      dst = counterData.destination;
    }

    if (src && dst && src !== dst) {
      const trains = searchUpcomingTrains(src, dst, new Date(), [], selectedVia);
      setAvailableTrains(trains);
      if (trains.length > 0) {
        setSelectedTrainId(trains[0].train_id);
      } else {
        setSelectedTrainId("");
      }
    } else {
      setAvailableTrains([]);
      setSelectedTrainId("");
    }
  }, [formData.source, formData.destination, seasonData.source, seasonData.destination, counterData.source, counterData.destination, selectedVia, bookingCategory]);

  // Calculate fare dynamically
  useEffect(() => {
    if (bookingCategory === "journey") {
      if (formData.source && formData.destination && formData.source !== formData.destination) {
        if (ticketMode === "metro") {
          const metroCheck = findMetroRoute(formData.source, formData.destination);
          if (metroCheck && metroCheck.valid) {
            const numStops = metroCheck.path ? metroCheck.path.length : 2;
            let base = numStops <= 3 ? 10 : numStops <= 6 ? 20 : numStops <= 10 ? 30 : 40;
            if (formData.ticketType === "Return Journey") base *= 2;
            setFare(base * formData.passengers);
          } else {
            setFare(0);
          }
        } else {
          const localCheck = findLocalRoute(formData.source, formData.destination);
          if (localCheck && localCheck.valid) {
            const calc = calculateFare(
              formData.source,
              formData.destination,
              formData.class,
              formData.ticketType,
              formData.passengers,
            );
            setFare(calc);
          } else {
            setFare(0);
          }
        }
      } else {
        setFare(0);
      }
    } else if (bookingCategory === "season") {
      if (seasonData.source && seasonData.destination && seasonData.source !== seasonData.destination) {
        if (seasonData.ticketMode === "metro") {
          const metroCheck = findMetroRoute(seasonData.source, seasonData.destination);
          if (metroCheck && metroCheck.valid) {
            const calc = calculateSeasonFare(
              seasonData.source,
              seasonData.destination,
              seasonData.class,
              seasonData.seasonType,
              "metro"
            );
            setFare(calc);
          } else {
            setFare(0);
          }
        } else {
          const localCheck = findLocalRoute(seasonData.source, seasonData.destination);
          if (localCheck && localCheck.valid) {
            const calc = calculateSeasonFare(
              seasonData.source,
              seasonData.destination,
              seasonData.class,
              seasonData.seasonType,
              "rail"
            );
            setFare(calc);
          } else {
            setFare(0);
          }
        }
      } else {
        setFare(0);
      }
    }
  }, [formData, seasonData, bookingCategory, ticketMode, metroLine]);

  const handleAddMoney = async (e) => {
    if (e) e.preventDefault();
    setWalletError("");
    setWalletSuccessMsg("");
    const amount = parseFloat(addMoneyAmount);

    if (isNaN(amount) || amount <= 0) {
      setWalletError("Please enter a valid amount greater than ₹0.");
      return;
    }

    if (amount > 50000) {
      setWalletError("Maximum transaction limit is ₹50,000.");
      return;
    }

    setIsAddingMoney(true);
    try {
      const newBalance = await addMoney(amount, userId);
      setWalletBalance(newBalance);
      setWalletSuccessMsg(`Successfully credited ₹${amount.toFixed(2)} to wallet!`);
      setAddMoneyAmount("");
      setTimeout(() => {
        setShowWalletModal(false);
        setWalletSuccessMsg("");
      }, 1200);
    } catch (err) {
      setWalletError(err.message || "Failed to add money. Please try again.");
    } finally {
      setIsAddingMoney(false);
    }
  };

  // 1. Handle Journey Ticket Booking
  const handleBooking = async (e) => {
    e.preventDefault();

    if (!formData.source || !formData.destination) {
      alert("Please select both source and destination stations");
      return;
    }
    if (formData.source === formData.destination) {
      alert("Source and destination cannot be the same");
      return;
    }

    if (ticketMode === "metro") {
      const metroCheck = findMetroRoute(formData.source, formData.destination);
      if (!metroCheck || !metroCheck.valid) {
        alert("No Metro Route Available between selected stations.");
        return;
      }
    } else {
      const localCheck = findLocalRoute(formData.source, formData.destination);
      if (!localCheck || !localCheck.valid) {
        alert("No Local Train Route Available between selected stations.");
        return;
      }
    }

    if (walletBalance < fare) {
      alert("Insufficient wallet balance! Please add money.");
      setShowWalletModal(true);
      return;
    }

    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 1200));

    try {
      const newBalance = await deductMoney(fare, userId);
      setWalletBalance(newBalance);

      const ticketId = `TKT_${Date.now()}`;
      const now = new Date();
      const issuedAt = now.toISOString();

      const tempTicket = {
        ticket_type: formData.ticketType,
        issued_at: issuedAt,
      };
      const calculatedExpiry = getTicketExpiryDate(tempTicket);
      const validUntil = calculatedExpiry ? calculatedExpiry.toISOString() : new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const selTrain = availableTrains.find((t) => t.train_id === selectedTrainId) || availableTrains[0];

      const ticketData = {
        ticket_id: ticketId,
        userId: userId,
        category: "journey",
        source_type: "online",
        source: formData.source,
        destination: formData.destination,
        via: selectedVia,
        train_id: selTrain ? selTrain.train_id : "REGULAR_LOCAL",
        train_name: selTrain ? selTrain.name : "Suburban Local Service",
        departure_time: selTrain ? selTrain.departureTime : "N/A",
        class: formData.class,
        ticket_type: formData.ticketType,
        passengers: formData.passengers,
        fare: fare,
        issued_at: issuedAt,
        valid_upto: validUntil,
        date: now.toLocaleDateString("en-IN"),
        used: false,
        status: "Active",
        isDirect: selTrain ? selTrain.isDirect : true,
        interchanges: selTrain ? selTrain.interchanges || [] : [],
        transfers: selTrain ? selTrain.transfers || [] : [],
        segments: selTrain ? selTrain.segments || [] : [],
      };

      await fetch("https://smart-railway-mgmt-system.onrender.com/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketData),
      });

      setIsProcessing(false);
      navigate("/digital-ticket", { state: ticketData });
    } catch (error) {
      setIsProcessing(false);
      alert(error.message);
    }
  };

  // 2. Handle Season Ticket Booking
  const handleSeasonBooking = async (e) => {
    e.preventDefault();

    if (!seasonData.source || !seasonData.destination) {
      alert("Please select both source and destination stations");
      return;
    }
    if (seasonData.source === seasonData.destination) {
      alert("Source and destination cannot be the same");
      return;
    }

    if (seasonData.ticketMode === "metro") {
      const metroCheck = findMetroRoute(seasonData.source, seasonData.destination);
      if (!metroCheck || !metroCheck.valid) {
        alert("No Metro Route Available between selected stations.");
        return;
      }
    } else {
      const localCheck = findLocalRoute(seasonData.source, seasonData.destination);
      if (!localCheck || !localCheck.valid) {
        alert("No Local Train Route Available between selected stations.");
        return;
      }
    }

    if (walletBalance < fare) {
      alert("Insufficient wallet balance! Please add money.");
      setShowWalletModal(true);
      return;
    }

    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 1200));

    try {
      const newBalance = await deductMoney(fare, userId);
      setWalletBalance(newBalance);

      const ticketId = `SEASON_${Date.now()}`;
      const validFromDate = new Date(seasonData.validFrom);
      const issuedAt = new Date().toISOString();
      const calculatedExpiry = calculateSeasonExpiry(validFromDate, seasonData.seasonType);

      const ticketData = {
        ticket_id: ticketId,
        userId: userId,
        category: "season",
        season_type: seasonData.seasonType.toLowerCase(),
        source_type: "online",
        source: seasonData.source,
        destination: seasonData.destination,
        via: selectedVia,
        class: seasonData.class,
        ticket_type: `${seasonData.seasonType} Season Ticket`,
        passengers: 1,
        fare: fare,
        issued_at: issuedAt,
        valid_from: validFromDate.toISOString(),
        valid_upto: calculatedExpiry ? calculatedExpiry.toISOString() : validFromDate.toISOString(),
        date: validFromDate.toLocaleDateString("en-IN"),
        used: false,
        status: "Active",
      };

      await fetch("https://smart-railway-mgmt-system.onrender.com/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketData),
      });

      setIsProcessing(false);
      navigate("/digital-ticket", { state: ticketData });
    } catch (error) {
      setIsProcessing(false);
      alert(error.message);
    }
  };

  // 3. Handle Add Counter Ticket
  const handleAddCounterTicket = async (e) => {
    e.preventDefault();

    const uts = counterData.utsNumber.trim();
    if (!uts) {
      alert("Please enter a valid Ticket / UTS Number");
      return;
    }
    if (!counterData.source || !counterData.destination) {
      alert("Please select source and destination stations");
      return;
    }

    setIsProcessing(true);

    try {
      // Check if ticket with UTS number already exists
      const existingRes = await fetch("https://smart-railway-mgmt-system.onrender.com/api/tickets");
      if (existingRes.ok) {
        const existingList = await existingRes.json();
        const duplicate = existingList.find(
          (t) => (t.ticket_id || "").toLowerCase() === uts.toLowerCase(),
        );
        if (duplicate) {
          setIsProcessing(false);
          alert(`Duplicate Ticket Number! Counter ticket ${uts} has already been added.`);
          return;
        }
      }

      const journeyDateObj = new Date(counterData.journeyDate);
      const calculatedExpiry = getTicketExpiryDate({
        ticket_type: counterData.ticketType,
        issued_at: journeyDateObj.toISOString(),
      });

      const ticketData = {
        ticket_id: uts,
        userId: userId,
        category: "counter",
        source_type: "counter",
        source: counterData.source,
        destination: counterData.destination,
        via: selectedVia,
        class: counterData.class,
        ticket_type: counterData.ticketType,
        passengers: counterData.passengers,
        fare: 0, // Physical ticket fare paid at counter
        issued_at: journeyDateObj.toISOString(),
        valid_upto: calculatedExpiry ? calculatedExpiry.toISOString() : journeyDateObj.toISOString(),
        date: journeyDateObj.toLocaleDateString("en-IN"),
        used: false,
        status: "Active",
      };

      await fetch("https://smart-railway-mgmt-system.onrender.com/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketData),
      });

      setIsProcessing(false);
      alert(`Counter ticket ${uts} successfully added to your dashboard!`);
      navigate("/user-dashboard");
    } catch (error) {
      setIsProcessing(false);
      alert(error.message);
    }
  };

  // Selected route object
  const activeRouteObj = availableViaRoutes.find((r) => r.via === selectedVia) || availableViaRoutes[0];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gradient-to-br from-orange-50 via-white to-green-50">
      <Navbar />

      <div className="flex-grow flex items-center justify-center p-4 sm:p-6 relative">
        <div className="max-w-5xl w-full grid md:grid-cols-12 gap-8 items-start z-10">
          
          {/* Left Column: Category Info & Wallet */}
          <div className="md:col-span-5 space-y-6">
            
            {/* Category Selector */}
            <div className="p-2 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 space-y-2">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 pt-1">
                Booking Category
              </div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => setBookingCategory("journey")}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl font-bold text-xs transition-all ${
                    bookingCategory === "journey"
                      ? "bg-gradient-to-r from-brand-navy to-blue-700 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <TicketIcon className="w-4 h-4 mb-1" />
                  Journey
                </button>

                <button
                  onClick={() => setBookingCategory("season")}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl font-bold text-xs transition-all ${
                    bookingCategory === "season"
                      ? "bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Calendar className="w-4 h-4 mb-1" />
                  Season Pass
                </button>

                <button
                  onClick={() => setBookingCategory("counter")}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl font-bold text-xs transition-all ${
                    bookingCategory === "counter"
                      ? "bg-gradient-to-r from-teal-600 to-emerald-700 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Tag className="w-4 h-4 mb-1" />
                  Add Counter
                </button>
              </div>
            </div>

            {/* Title Header */}
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-navy/10 border border-brand-navy/20 text-brand-navy text-xs font-bold uppercase tracking-wider mb-2">
                <span className="w-2 h-2 bg-brand-saffron rounded-full mr-2 animate-pulse"></span>
                {bookingCategory === "journey"
                  ? "Instant M-Ticket"
                  : bookingCategory === "season"
                    ? "Season Pass Booking"
                    : "Add Physical Ticket"}
              </div>
              <h1 className="text-3xl font-extrabold text-brand-navy leading-tight">
                {bookingCategory === "journey" && "Journey Ticket"}
                {bookingCategory === "season" && "Season Pass"}
                {bookingCategory === "counter" && "Add Counter Ticket"}
              </h1>
              <p className="text-sm text-gray-600 font-medium mt-1">
                {bookingCategory === "journey" && "Select stations, choose recommended via route, and get your digital QR ticket."}
                {bookingCategory === "season" && "Monthly, Quarterly, or Yearly season passes valid for unlimited travel."}
                {bookingCategory === "counter" && "Add your physical UTS railway counter ticket to keep all passes in one app."}
              </p>
            </div>

            {/* Wallet Card */}
            {bookingCategory !== "counter" && (
              <div className="p-5 bg-gradient-to-br from-brand-navy to-blue-800 rounded-2xl shadow-xl text-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    <span className="text-xs font-semibold opacity-90">
                      Wallet Balance
                    </span>
                  </div>
                  <button
                    onClick={() => setShowWalletModal(true)}
                    className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Money
                  </button>
                </div>
                <div className="text-3xl font-black">
                  ₹{walletBalance.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Dynamic Form */}
          <div className="md:col-span-7 glass-card p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden bg-white/90">
            <div
              className={`absolute top-0 left-0 w-full h-2 ${
                bookingCategory === "journey"
                  ? "bg-gradient-to-r from-brand-saffron via-white to-brand-green"
                  : bookingCategory === "season"
                    ? "bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600"
                    : "bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-600"
              }`}
            ></div>

            {/* FORM 1: JOURNEY TICKET */}
            {bookingCategory === "journey" && (
              <form onSubmit={handleBooking} className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <Train className="w-5 h-5 mr-2 text-brand-navy" />
                  Book Journey Ticket
                </h2>

                {/* Mode Select: Rail / Metro */}
                <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTicketMode("rail")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      ticketMode === "rail"
                        ? "bg-white text-brand-navy shadow-sm"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Local Train
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketMode("metro")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      ticketMode === "metro"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Metro
                  </button>
                </div>

                {ticketMode === "metro" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Metro Line
                    </label>
                    <select
                      className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-semibold text-sm outline-none"
                      required
                      value={metroLine}
                      onChange={(e) => setMetroLine(e.target.value)}
                    >
                      <option value="">Choose Metro Line</option>
                      {Object.keys(metroLines).map((line) => (
                        <option key={line} value={line}>
                          {line}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* From / To Selects */}
                {ticketMode === "rail" && renderLineCategoryPills()}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      From Station
                    </label>
                    <select
                      className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-semibold text-sm outline-none"
                      required
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    >
                      <option value="">Select Source Station</option>
                      {ticketMode === "metro" && metroLine
                        ? metroLines[metroLine].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))
                        : renderCategorizedOptions(lineCategoryFilter)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      To Station
                    </label>
                    <select
                      className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-semibold text-sm outline-none"
                      required
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    >
                      <option value="">Select Destination Station</option>
                      {ticketMode === "metro" && metroLine
                        ? metroLines[metroLine].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))
                        : renderCategorizedOptions(lineCategoryFilter)}
                    </select>
                  </div>
                </div>

                {/* VIA ROUTE SELECTION & RECOMMENDATION */}
                {availableViaRoutes.length > 0 && (
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 uppercase flex items-center gap-1">
                        <RouteIcon className="w-3.5 h-3.5" /> Via / Route Selection
                      </span>
                      <span className="text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-semibold">
                        System Recommends, You Choose
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableViaRoutes.map((route) => {
                        const isAvail = route.isAvailable !== false;
                        return (
                          <button
                            key={route.id}
                            type="button"
                            disabled={!isAvail}
                            onClick={() => isAvail && setSelectedVia(route.via)}
                            className={`flex items-start gap-2 p-2 rounded-lg text-left border transition-all text-xs ${
                              selectedVia === route.via && isAvail
                                ? "bg-white border-blue-600 text-blue-900 font-bold shadow-sm"
                                : !isAvail
                                  ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-65"
                                  : "bg-white/60 border-blue-100 text-gray-700 hover:bg-white"
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded-full border-2 mt-0.5 flex items-center justify-center ${selectedVia === route.via && isAvail ? "border-blue-600 bg-blue-600" : "border-gray-400"}`}>
                              {selectedVia === route.via && isAvail && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                            </div>
                            <div>
                              <p className="font-semibold">{route.label || route.via}</p>
                              <p className="text-[10px] text-gray-500">{route.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Route Preview */}
                    {activeRouteObj && activeRouteObj.path && activeRouteObj.isAvailable !== false && (
                      <div className="pt-2 border-t border-blue-200/60 flex items-center gap-2 text-xs font-semibold text-blue-950">
                        <span className="text-gray-500 font-normal">Route Preview:</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {activeRouteObj.path.map((stn, idx) => (
                            <React.Fragment key={idx}>
                              <span className={stn === "Dadar" || stn === "Kurla" || stn === "Mahim Junction" ? "px-1.5 py-0.5 bg-yellow-100 text-yellow-900 rounded font-bold" : ""}>
                                {stn}
                              </span>
                              {idx < activeRouteObj.path.length - 1 && <span className="text-gray-400">→</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Train / Service Choice Selection */}
                {availableTrains.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                      <Train className="w-3.5 h-3.5 text-brand-navy" /> Available Train / Service Choice
                    </label>
                    <select
                      value={selectedTrainId}
                      onChange={(e) => setSelectedTrainId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-semibold text-xs text-brand-navy outline-none"
                    >
                      {availableTrains.map((tr) => (
                        <option key={tr.train_id} value={tr.train_id}>
                          {tr.name} ({tr.departureTime} dep ➔ {tr.arrivalTime} arr) — {tr.type}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Class & Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Journey Type
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {["Single Journey", "Return Journey"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormData({ ...formData, ticketType: t })}
                          className={`py-2 text-xs rounded-lg border font-bold ${formData.ticketType === t ? "bg-brand-navy text-white border-brand-navy" : "bg-gray-50 text-gray-700 border-gray-200"}`}
                        >
                          {t.replace(" Journey", "")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Class
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {["Second", "First", "AC"].map((cls) => (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => setFormData({ ...formData, class: cls + (cls === "AC" ? " Local" : " Class") })}
                          className={`py-2 text-xs rounded-lg border font-bold ${formData.class.includes(cls) ? "bg-brand-navy text-white border-brand-navy" : "bg-gray-50 text-gray-700 border-gray-200"}`}
                        >
                          {cls}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Passengers
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={formData.passengers}
                    onChange={(e) => setFormData({ ...formData, passengers: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 font-semibold text-sm outline-none"
                  />
                </div>

                {fare > 0 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-700">Total Fare:</span>
                    <span className="text-xl font-black text-green-700">₹{fare}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isProcessing || fare === 0}
                  className="w-full py-3 bg-gradient-to-r from-brand-saffron to-orange-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Pay ₹{fare} & Generate Ticket</>
                  )}
                </button>
              </form>
            )}

            {/* FORM 2: SEASON TICKET */}
            {bookingCategory === "season" && (
              <form onSubmit={handleSeasonBooking} className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-purple-600" />
                  Book Season Ticket (Pass)
                </h2>

                {/* Mode Select: Rail / Metro */}
                <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSeasonData({ ...seasonData, ticketMode: "rail", source: "", destination: "" })}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      seasonData.ticketMode === "rail"
                        ? "bg-white text-brand-navy shadow-sm"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Local Train Pass
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeasonData({ ...seasonData, ticketMode: "metro", source: "", destination: "" })}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      seasonData.ticketMode === "metro"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Metro Pass
                  </button>
                </div>

                {/* From / To Selects */}
                {seasonData.ticketMode === "rail" && renderLineCategoryPills()}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      From Station
                    </label>
                    <select
                      className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-semibold text-sm outline-none"
                      required
                      value={seasonData.source}
                      onChange={(e) => setSeasonData({ ...seasonData, source: e.target.value })}
                    >
                      <option value="">Select Source Station</option>
                      {seasonData.ticketMode === "metro"
                        ? allMetroStationsList.map((s) => (
                            <option key={`metro-s-${s}`} value={s}>
                              {s} (Metro)
                            </option>
                          ))
                        : renderCategorizedOptions(lineCategoryFilter)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      To Station
                    </label>
                    <select
                      className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-semibold text-sm outline-none"
                      required
                      value={seasonData.destination}
                      onChange={(e) => setSeasonData({ ...seasonData, destination: e.target.value })}
                    >
                      <option value="">Select Destination Station</option>
                      {seasonData.ticketMode === "metro"
                        ? allMetroStationsList.map((s) => (
                            <option key={`metro-d-${s}`} value={s}>
                              {s} (Metro)
                            </option>
                          ))
                        : renderCategorizedOptions(lineCategoryFilter)}
                    </select>
                  </div>
                </div>

                {seasonData.ticketMode === "metro" && seasonData.source && seasonData.destination && seasonData.source !== seasonData.destination && !findMetroRoute(seasonData.source, seasonData.destination).valid && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center justify-between">
                    <span>⚠️ No Metro Route Available</span>
                    <span className="text-[10px] bg-red-100 px-2 py-0.5 rounded font-normal">Connected Metro path required</span>
                  </div>
                )}

                {/* VIA ROUTE SELECTION & RECOMMENDATION */}
                {availableViaRoutes.length > 0 && (
                  <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-900 uppercase flex items-center gap-1">
                        <RouteIcon className="w-3.5 h-3.5" /> Via / Route Selection
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableViaRoutes.map((route) => (
                        <button
                          key={route.id}
                          type="button"
                          onClick={() => setSelectedVia(route.via)}
                          className={`flex items-start gap-2 p-2 rounded-lg text-left border transition-all text-xs ${
                            selectedVia === route.via
                              ? "bg-white border-purple-600 text-purple-900 font-bold shadow-sm"
                              : "bg-white/60 border-purple-100 text-gray-700 hover:bg-white"
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded-full border-2 mt-0.5 flex items-center justify-center ${selectedVia === route.via ? "border-purple-600 bg-purple-600" : "border-gray-400"}`}>
                            {selectedVia === route.via && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                          </div>
                          <div>
                            <p className="font-semibold">{route.label}</p>
                            <p className="text-[10px] text-gray-500">{route.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Season Duration */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Season Pass Duration
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: "Monthly", label: "Monthly (1 Month)" },
                      { key: "Quarterly", label: "Quarterly (3 Months)" },
                      { key: "Yearly", label: "Yearly (12 Months)" },
                    ].map((dur) => (
                      <button
                        key={dur.key}
                        type="button"
                        onClick={() => setSeasonData({ ...seasonData, seasonType: dur.key })}
                        className={`py-2 text-xs rounded-xl border font-bold transition-all ${
                          seasonData.seasonType === dur.key
                            ? "bg-purple-600 text-white border-purple-600 shadow-md"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {dur.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Class & Valid From */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Class
                    </label>
                    <select
                      value={seasonData.class}
                      onChange={(e) => setSeasonData({ ...seasonData, class: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 font-semibold text-sm outline-none"
                    >
                      <option value="Second Class">Second Class</option>
                      <option value="First Class">First Class</option>
                      <option value="AC Local">AC Local</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Valid From Date
                    </label>
                    <input
                      type="date"
                      value={seasonData.validFrom}
                      onChange={(e) => setSeasonData({ ...seasonData, validFrom: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 font-semibold text-sm outline-none"
                    />
                  </div>
                </div>

                {/* Valid Until Preview */}
                {seasonData.validFrom && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-semibold">Valid From:</span>
                      <span className="font-bold text-gray-900">{formatTicketDateTime(new Date(seasonData.validFrom))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-semibold">Calculated Valid Until:</span>
                      <span className="font-bold text-purple-700">
                        {formatTicketDateTime(calculateSeasonExpiry(new Date(seasonData.validFrom), seasonData.seasonType))}
                      </span>
                    </div>
                  </div>
                )}

                {fare > 0 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-700">Season Pass Fare:</span>
                    <span className="text-xl font-black text-green-700">₹{fare}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isProcessing || fare === 0}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Pay ₹{fare} & Issue Season Pass</>
                  )}
                </button>
              </form>
            )}

            {/* FORM 3: ADD COUNTER TICKET */}
            {bookingCategory === "counter" && (
              <form onSubmit={handleAddCounterTicket} className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <Tag className="w-5 h-5 mr-2 text-teal-600" />
                  Add Physical Counter Ticket
                </h2>
                <p className="text-xs text-gray-500">
                  Enter details from your printed UTS physical counter ticket to sync it with your digital dashboard.
                </p>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Ticket / UTS Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UTS_92810412"
                    value={counterData.utsNumber}
                    onChange={(e) => setCounterData({ ...counterData, utsNumber: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-mono font-semibold text-sm outline-none uppercase"
                  />
                </div>

                {/* From / To Selects */}
                {renderLineCategoryPills()}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      From Station
                    </label>
                    <select
                      className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-semibold text-sm outline-none"
                      required
                      value={counterData.source}
                      onChange={(e) => setCounterData({ ...counterData, source: e.target.value })}
                    >
                      <option value="">Select Source Station</option>
                      {renderCategorizedOptions(lineCategoryFilter)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      To Station
                    </label>
                    <select
                      className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-semibold text-sm outline-none"
                      required
                      value={counterData.destination}
                      onChange={(e) => setCounterData({ ...counterData, destination: e.target.value })}
                    >
                      <option value="">Select Destination Station</option>
                      {renderCategorizedOptions(lineCategoryFilter)}
                    </select>
                  </div>
                </div>

                {/* VIA ROUTE SELECTION */}
                {availableViaRoutes.length > 0 && (
                  <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-teal-900 uppercase flex items-center gap-1">
                        <RouteIcon className="w-3.5 h-3.5" /> Select Via Route
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableViaRoutes.map((route) => (
                        <button
                          key={route.id}
                          type="button"
                          onClick={() => setSelectedVia(route.via)}
                          className={`flex items-start gap-2 p-2 rounded-lg text-left border transition-all text-xs ${
                            selectedVia === route.via
                              ? "bg-white border-teal-600 text-teal-900 font-bold shadow-sm"
                              : "bg-white/60 border-teal-100 text-gray-700 hover:bg-white"
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded-full border-2 mt-0.5 flex items-center justify-center ${selectedVia === route.via ? "border-teal-600 bg-teal-600" : "border-gray-400"}`}>
                            {selectedVia === route.via && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                          </div>
                          <div>
                            <p className="font-semibold">{route.label}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Journey Date
                    </label>
                    <input
                      type="date"
                      value={counterData.journeyDate}
                      onChange={(e) => setCounterData({ ...counterData, journeyDate: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl bg-gray-50 border border-gray-200 font-semibold text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Type
                    </label>
                    <select
                      value={counterData.ticketType}
                      onChange={(e) => setCounterData({ ...counterData, ticketType: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl bg-gray-50 border border-gray-200 font-semibold text-xs outline-none"
                    >
                      <option value="Single Journey">Single</option>
                      <option value="Return Journey">Return</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Class
                    </label>
                    <select
                      value={counterData.class}
                      onChange={(e) => setCounterData({ ...counterData, class: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl bg-gray-50 border border-gray-200 font-semibold text-xs outline-none"
                    >
                      <option value="Second Class">Second</option>
                      <option value="First Class">First</option>
                      <option value="AC Local">AC</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Add Counter Ticket to Dashboard</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* WALLET ADD MONEY MODAL */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-navy text-white rounded-2xl shadow-md">
                  <Wallet className="w-6 h-6 text-brand-saffron" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-brand-navy">Add Money to Wallet</h3>
                  <p className="text-xs text-gray-500 font-medium">Top up your digital railway wallet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowWalletModal(false);
                  setWalletError("");
                  setWalletSuccessMsg("");
                }}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-gradient-to-br from-brand-navy to-blue-900 rounded-2xl text-white shadow-md">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-200 mb-1">Current Wallet Balance</p>
              <p className="text-3xl font-black">₹{walletBalance.toFixed(2)}</p>
            </div>

            <form onSubmit={handleAddMoney} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Enter Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50000"
                  step="1"
                  required
                  placeholder="e.g. 100, 200, 500"
                  value={addMoneyAmount}
                  onChange={(e) => {
                    setAddMoneyAmount(e.target.value);
                    setWalletError("");
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-300 font-black text-lg text-gray-900 outline-none focus:ring-2 focus:ring-brand-navy"
                />
              </div>

              {/* Quick Amount Pills */}
              <div className="flex items-center gap-2">
                {[100, 200, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setAddMoneyAmount(preset.toString());
                      setWalletError("");
                    }}
                    className="flex-1 py-2 bg-gray-100 hover:bg-brand-navy hover:text-white text-gray-800 font-bold text-xs rounded-xl transition-all"
                  >
                    +₹{preset}
                  </button>
                ))}
              </div>

              {walletError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
                  {walletError}
                </div>
              )}

              {walletSuccessMsg && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs font-bold text-green-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>{walletSuccessMsg}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowWalletModal(false);
                    setWalletError("");
                    setWalletSuccessMsg("");
                  }}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingMoney}
                  className="flex-1 py-3 bg-gradient-to-r from-brand-saffron via-brand-white to-brand-green text-brand-navy font-black text-sm rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAddingMoney ? <Loader className="w-4 h-4 animate-spin" /> : "Add Money Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ticketing;
