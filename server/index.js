const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const supabase = require("./db");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const fs = require("fs");
const path = require("path");
const TICKETS_FILE = path.join(__dirname, "tickets.json");

function loadTickets() {
  try {
    if (fs.existsSync(TICKETS_FILE)) {
      return JSON.parse(fs.readFileSync(TICKETS_FILE, "utf-8")) || [];
    }
  } catch (e) {
    console.error("Error loading tickets.json:", e);
  }
  return [];
}

function saveTickets(list) {
  try {
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving tickets.json:", e);
  }
}

// Persistent ticket storage
let tickets = loadTickets();

const WALLETS_FILE = path.join(__dirname, "wallets.json");

function loadWallets() {
  try {
    if (fs.existsSync(WALLETS_FILE)) {
      return JSON.parse(fs.readFileSync(WALLETS_FILE, "utf-8")) || {};
    }
  } catch (e) {
    console.error("Error loading wallets.json:", e);
  }
  return {};
}

function saveWallets(map) {
  try {
    fs.writeFileSync(WALLETS_FILE, JSON.stringify(map, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving wallets.json:", e);
  }
}

let wallets = loadWallets();

app.get("/", (req, res) => {
  res.send("Apli Mumbai Rail API is Running");
});

const MOCK_TRAIN_STATUS = [
  { train_id: "90001", type: "Fast Local", start_time: "06:00", mahim_arrival: "06:25", end_time: "07:15" },
  { train_id: "90003", type: "Slow Local", start_time: "06:15", mahim_arrival: "06:45", end_time: "07:40" },
  { train_id: "90005", type: "AC Local", start_time: "07:00", mahim_arrival: "07:28", end_time: "08:15" },
  { train_id: "90007", type: "Fast Local", start_time: "07:30", mahim_arrival: "07:55", end_time: "08:45" },
  { train_id: "90009", type: "Slow Local", start_time: "08:00", mahim_arrival: "08:32", end_time: "09:25" },
  { train_id: "90011", type: "Fast Local", start_time: "08:30", mahim_arrival: "08:56", end_time: "09:45" },
  { train_id: "90013", type: "AC Local", start_time: "09:00", mahim_arrival: "09:27", end_time: "10:15" },
  { train_id: "90015", type: "Slow Local", start_time: "09:30", mahim_arrival: "10:02", end_time: "10:55" },
  { train_id: "90017", type: "Fast Local", start_time: "10:15", mahim_arrival: "10:41", end_time: "11:30" },
  { train_id: "90019", type: "Slow Local", start_time: "11:00", mahim_arrival: "11:34", end_time: "12:25" },
  { train_id: "90021", type: "AC Local", start_time: "11:45", mahim_arrival: "12:12", end_time: "13:00" },
  { train_id: "90023", type: "Fast Local", start_time: "12:30", mahim_arrival: "12:55", end_time: "13:45" },
  { train_id: "90025", type: "Slow Local", start_time: "13:15", mahim_arrival: "13:48", end_time: "14:40" },
  { train_id: "90027", type: "Fast Local", start_time: "14:00", mahim_arrival: "14:26", end_time: "15:15" },
  { train_id: "90029", type: "Slow Local", start_time: "14:45", mahim_arrival: "15:19", end_time: "16:10" },
  { train_id: "90031", type: "AC Local", start_time: "15:30", mahim_arrival: "15:58", end_time: "16:45" },
  { train_id: "90033", type: "Fast Local", start_time: "16:15", mahim_arrival: "16:42", end_time: "17:30" },
  { train_id: "90035", type: "Slow Local", start_time: "17:00", mahim_arrival: "17:35", end_time: "18:25" },
  { train_id: "90037", type: "Fast Local", start_time: "17:30", mahim_arrival: "17:56", end_time: "18:45" },
  { train_id: "90039", type: "AC Local", start_time: "18:15", mahim_arrival: "18:43", end_time: "19:30" },
  { train_id: "90041", type: "Fast Local", start_time: "19:00", mahim_arrival: "19:26", end_time: "20:15" },
  { train_id: "90043", type: "Slow Local", start_time: "19:45", mahim_arrival: "20:18", end_time: "21:10" },
  { train_id: "90045", type: "Fast Local", start_time: "20:30", mahim_arrival: "20:56", end_time: "21:45" },
  { train_id: "90047", type: "Slow Local", start_time: "21:15", mahim_arrival: "21:49", end_time: "22:40" },
  { train_id: "90049", type: "AC Local", start_time: "22:00", mahim_arrival: "22:28", end_time: "23:15" },
  { train_id: "90051", type: "Slow Local", start_time: "22:45", mahim_arrival: "23:18", end_time: "00:10" },
  { train_id: "90053", type: "Fast Local", start_time: "23:30", mahim_arrival: "23:54", end_time: "00:45" },
];

// Train Status Route - Fetch from Supabase 'status' table with fallback
app.get("/api/train-status", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("status")
      .select("*")
      .order("mahim_arrival", { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.error("Supabase error (using mock data fallback):", error.message);
      return res.json(MOCK_TRAIN_STATUS);
    }

    // Map database column names to match frontend expectations
    const formattedData = data.map((train) => ({
      train_id: train.Train_ID || train.train_id,
      type: train.Type || train.type,
      start_time: train.Start_Time || train.start_time,
      mahim_arrival: train.Mahim_Arrival || train.mahim_arrival,
      end_time: train.End_Time || train.end_time,
    }));

    res.json(formattedData);
  } catch (err) {
    console.error("Server error, returning mock status:", err.message);
    res.json(MOCK_TRAIN_STATUS);
  }
});

// Ticket Routes
app.post("/api/tickets", (req, res) => {
  const ticketData = req.body;
  tickets.unshift(ticketData); // Add to beginning for newest first
  saveTickets(tickets);
  res
    .status(201)
    .json({ message: "Ticket saved successfully", ticket: ticketData });
});

app.get("/api/tickets", (req, res) => {
  const isAdmin = req.headers["x-admin"] === "true" || req.query.admin === "true";
  const userId = req.query.userId || req.headers["x-user-id"];

  if (isAdmin) {
    return res.json(tickets);
  }

  if (userId) {
    const userTickets = tickets.filter((t) => t.userId === userId);
    return res.json(userTickets);
  }

  // If unauthenticated or no userId supplied and not admin, return empty array
  res.json([]);
});

app.get("/api/tickets/:ticketId", (req, res) => {
  const isAdmin = req.headers["x-admin"] === "true" || req.query.admin === "true";
  const userId = req.query.userId || req.headers["x-user-id"];

  const ticket = tickets.find(
    (t) => t.ticket_id === req.params.ticketId || t.ticketId === req.params.ticketId || t.id === req.params.ticketId
  );

  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  // Check ownership if not admin and ticket has an owner
  if (!isAdmin && userId && ticket.userId && ticket.userId !== userId) {
    return res.status(403).json({ error: "Access denied. You do not own this ticket." });
  }

  res.json(ticket);
});

// Real-Time Ticket Verification & Status Evaluation Endpoint
app.post("/api/tickets/verify", (req, res) => {
  const { ticketId, qrData, action } = req.body;
  let targetId = ticketId;
  let parsedQR = null;

  if (qrData && typeof qrData === "string") {
    const trimmed = qrData.trim();
    if (trimmed.startsWith("{")) {
      try {
        parsedQR = JSON.parse(trimmed);
        if (parsedQR && (parsedQR.ticket_id || parsedQR.ticketId || parsedQR.id)) {
          targetId = parsedQR.ticket_id || parsedQR.ticketId || parsedQR.id;
        }
      } catch (e) {
        targetId = trimmed;
      }
    } else {
      targetId = trimmed;
    }
  }

  if (!targetId && parsedQR && (parsedQR.ticket_id || parsedQR.ticketId || parsedQR.id)) {
    targetId = parsedQR.ticket_id || parsedQR.ticketId || parsedQR.id;
  }

  if (!targetId) {
    return res.status(400).json({
      success: false,
      status: "INVALID",
      message: "Invalid QR payload or missing Ticket ID",
    });
  }

  // Find ticket in server storage
  let ticketIndex = tickets.findIndex(
    (t) => t.ticket_id === targetId || t.ticketId === targetId || t.id === targetId
  );

  // If ticket is not in server store, but valid parsed payload was passed from client, auto-register it
  if (ticketIndex === -1 && parsedQR && (parsedQR.source || parsedQR.destination)) {
    const newTicket = {
      ticket_id: targetId,
      source: parsedQR.source,
      destination: parsedQR.destination,
      via: parsedQR.via || "Direct",
      class: parsedQR.class || "Second Class",
      ticket_type: parsedQR.ticket_type || parsedQR.ticketType || "Single Journey",
      passengers: parsedQR.passengers || 1,
      fare: parsedQR.fare || 10,
      issued_at: parsedQR.issued_at || new Date().toISOString(),
      valid_upto: parsedQR.valid_upto || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      date: parsedQR.date || new Date().toLocaleDateString("en-IN"),
      used: false,
      status: "Active",
      isDirect: parsedQR.isDirect !== false,
      interchanges: parsedQR.interchanges || [],
      transfers: parsedQR.transfers || [],
      segments: parsedQR.segments || [],
    };
    tickets.unshift(newTicket);
    saveTickets(tickets);
    ticketIndex = 0;
  }

  if (ticketIndex === -1) {
    return res.status(404).json({
      success: false,
      status: "INVALID",
      message: `Ticket ID "${targetId}" is invalid or not found`,
    });
  }

  const ticket = tickets[ticketIndex];

  // 1. Check Cancelled / Revoked
  const rawStatus = (ticket.status || "").toLowerCase();
  if (rawStatus === "cancelled" || rawStatus === "revoked" || ticket.cancelled || ticket.is_cancelled) {
    return res.json({
      success: false,
      status: "CANCELLED",
      message: "Ticket is Cancelled / Revoked",
      ticket,
    });
  }

  // 2. Check Ticket Type & Already Used / Consumed
  const category = (ticket.category || "").toLowerCase();
  const ticketType = (ticket.ticket_type || ticket.ticketType || "").toLowerCase();
  const isSeason =
    category.includes("season") ||
    ticketType.includes("season") ||
    ticketType.includes("monthly") ||
    ticketType.includes("quarterly") ||
    ticketType.includes("yearly") ||
    ticketType.includes("pass");

  if (!isSeason && (ticket.used || ticket.is_used || ticket.status === "Consumed" || ticket.consumed)) {
    return res.json({
      success: false,
      status: "ALREADY_USED",
      message: "Ticket has already been used / scanned",
      ticket,
    });
  }

  // 3. Check Expiry Date / Time
  const now = new Date();
  const validUntil = ticket.valid_upto || ticket.validUntil || ticket.expiryDate;
  if (validUntil) {
    const expDate = new Date(validUntil);
    if (!isNaN(expDate.getTime()) && now > expDate) {
      return res.json({
        success: false,
        status: "EXPIRED",
        message: "Ticket has Expired",
        ticket,
      });
    }
  }

  // 4. Ticket is VALID! If single/return and action !== 'verify_only', consume ticket
  if (!isSeason && action !== "verify_only") {
    tickets[ticketIndex].used = true;
    tickets[ticketIndex].is_used = true;
    tickets[ticketIndex].status = "Consumed";
    saveTickets(tickets);
  }

  return res.json({
    success: true,
    status: "VALID",
    message: isSeason ? "Season Pass Verified (Valid for Multi-Use)" : "Ticket Verified & Consumed Successfully",
    ticket: tickets[ticketIndex],
  });
});

app.post("/api/tickets/consume", (req, res) => {
  const { ticketId } = req.body;
  if (!ticketId) {
    return res.status(400).json({ error: "Missing ticketId parameter" });
  }

  const ticketIndex = tickets.findIndex(
    (t) => t.ticket_id === ticketId || t.ticketId === ticketId || t.id === ticketId
  );

  if (ticketIndex !== -1) {
    // Only Single and Return journey tickets are consumed
    const category = (tickets[ticketIndex].category || "").toLowerCase();
    const type = (tickets[ticketIndex].ticket_type || "").toLowerCase();
    if (!category.includes("season") && !type.includes("season") && !type.includes("pass")) {
      tickets[ticketIndex].used = true;
      tickets[ticketIndex].is_used = true;
      tickets[ticketIndex].status = "Consumed";
      saveTickets(tickets);
    }
    return res.json({
      success: true,
      message: "Ticket processed successfully",
      ticket: tickets[ticketIndex],
    });
  }

  res.status(404).json({ error: "Ticket not found" });
});

const { calculateCoachOccupancy, generateRoutePeakAnalysis } = require("./utils/coachOccupancyEngine");

// GET /api/coach-occupancy/:trainId
app.get("/api/coach-occupancy/:trainId", (req, res) => {
  const trainId = req.params.trainId || "CR_1001";
  const source = req.query.source || "Thane";
  const destination = req.query.destination || "Dadar";
  const travelClass = req.query.class || "Second Class";

  const result = calculateCoachOccupancy({
    trainId,
    source,
    destination,
    travelClass,
  });

  res.json({
    trainId,
    source,
    destination,
    travelClass,
    line: result.line,
    direction: result.direction,
    destinationTerminus: result.destinationTerminus,
    coachCount: result.coachCount,
    coaches: result.coaches,
    overallOccupancyPct: result.overallOccupancyPct,
    totalPassengers: result.totalPassengers,
    totalCapacity: result.totalCapacity,
    leastCrowded: result.leastCrowded,
    mostCrowded: result.mostCrowded,
    recommendedBoarding: result.recommendedBoarding,
    fullRoute: result.fullRoute,
    directionalRoute: result.directionalRoute,
    routeStationSim: result.routeStationSim,
    journeySegmentSim: result.journeySegmentSim,
    periodName: result.periodName,
    isEstimated: true
  });
});

// GET /api/peak-analysis - Aggregated Peak Hours Analysis
app.get("/api/peak-analysis", (req, res) => {
  const source = req.query.source || "Thane";
  const destination = req.query.destination || "Dadar";
  const { peakHourData, hourlyTrafficData } = generateRoutePeakAnalysis(source, destination);

  res.json({
    success: true,
    source,
    destination,
    peakHourData,
    hourlyTrafficData,
  });
});

// GET /api/wallet/:userId - Get user specific wallet balance & transactions
app.get("/api/wallet/:userId", (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId parameter" });
  }

  if (!wallets[userId]) {
    wallets[userId] = {
      userId,
      balance: 500.0,
      transactions: [],
      updatedAt: new Date().toISOString(),
    };
    saveWallets(wallets);
  }

  res.json({
    success: true,
    userId,
    balance: wallets[userId].balance,
    transactions: wallets[userId].transactions || [],
  });
});

// POST /api/wallet/add-money - Add money to authenticated user wallet
app.post("/api/wallet/add-money", (req, res) => {
  const { userId, amount } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "Authentication required (missing userId)." });
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: "Invalid amount. Amount must be greater than 0." });
  }

  if (numAmount > 50000) {
    return res.status(400).json({ error: "Amount exceeds maximum transaction limit of ₹50,000." });
  }

  if (!wallets[userId]) {
    wallets[userId] = {
      userId,
      balance: 500.0,
      transactions: [],
      updatedAt: new Date().toISOString(),
    };
  }

  const currentBalance = wallets[userId].balance || 0;
  const newBalance = Math.round((currentBalance + numAmount) * 100) / 100;

  const transaction = {
    id: `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: "CREDIT",
    amount: numAmount,
    balanceAfter: newBalance,
    description: "Wallet Top-up",
    timestamp: new Date().toISOString(),
  };

  wallets[userId].balance = newBalance;
  wallets[userId].transactions = wallets[userId].transactions || [];
  wallets[userId].transactions.unshift(transaction);
  wallets[userId].updatedAt = new Date().toISOString();

  saveWallets(wallets);

  res.json({
    success: true,
    userId,
    balance: newBalance,
    transaction,
  });
});

// POST /api/wallet/deduct-money - Deduct ticket fare from authenticated user wallet
app.post("/api/wallet/deduct-money", (req, res) => {
  const { userId, amount } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "Authentication required (missing userId)." });
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: "Invalid amount." });
  }

  if (!wallets[userId]) {
    wallets[userId] = {
      userId,
      balance: 500.0,
      transactions: [],
      updatedAt: new Date().toISOString(),
    };
  }

  const currentBalance = wallets[userId].balance || 0;
  if (currentBalance < numAmount) {
    return res.status(400).json({ error: "Insufficient wallet balance." });
  }

  const newBalance = Math.round((currentBalance - numAmount) * 100) / 100;

  const transaction = {
    id: `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: "DEBIT",
    amount: numAmount,
    balanceAfter: newBalance,
    description: "Ticket Fare Payment",
    timestamp: new Date().toISOString(),
  };

  wallets[userId].balance = newBalance;
  wallets[userId].transactions = wallets[userId].transactions || [];
  wallets[userId].transactions.unshift(transaction);
  wallets[userId].updatedAt = new Date().toISOString();

  saveWallets(wallets);

  res.json({
    success: true,
    userId,
    balance: newBalance,
    transaction,
  });
});

// POST /api/coach-occupancy/scan - Weighted Platform Scanner Allocation
app.post("/api/coach-occupancy/scan", (req, res) => {
  const { trainId = "CR_1001", source = "Thane", destination = "Dadar", travelClass = "Second Class", station = "Dadar", zone = "MIDDLE", eventType = "ENTRY", passengerCount = 1 } = req.body;
  const count = parseInt(passengerCount) || 1;
  const coaches = calculateCoachOccupancy({ trainId, source, destination, travelClass });

  // Weighted allocation matrix across 12 coaches
  let weights = [];
  if (zone === "START") {
    weights = [0.35, 0.30, 0.20, 0.10, 0.05, 0, 0, 0, 0, 0, 0, 0];
  } else if (zone === "MIDDLE") {
    weights = [0, 0, 0, 0.05, 0.20, 0.25, 0.25, 0.20, 0.05, 0, 0, 0];
  } else {
    weights = [0, 0, 0, 0, 0, 0, 0, 0, 0.05, 0.20, 0.35, 0.40];
  }

  const isEntry = eventType === "ENTRY";

  coaches.forEach((coach, idx) => {
    const weight = weights[idx] || 0;
    const change = Math.max(1, Math.round(count * weight * 2.5));
    if (isEntry) {
      coach.passengers = Math.min(coach.capacity, coach.passengers + change);
    } else {
      coach.passengers = Math.max(0, coach.passengers - change);
    }
    coach.occupancyPct = Math.round((coach.passengers / coach.capacity) * 100);
  });

  res.json({
    success: true,
    message: `Simulated ${eventType} scan of ${count} passenger(s) at ${station} (${zone} Zone).`,
    trainId,
    coaches,
  });
});

// Import Routes
const transportRoutes = require("./routes/transportRoutes");
const scanRoutes = require("./routes/scanRoutes");
const disruptionRoutes = require("./routes/disruptionRoutes");

// Mount Routes
app.use("/api", transportRoutes); // Handles /api/trains, /api/crowd
app.use("/api/scan", scanRoutes); // Handles /api/scan
app.use("/api", disruptionRoutes); // Handles /api/disruptions, /api/disruptions/check, /api/disruptions/sms-status, /api/disruptions/sms-logs

// Server initialization & live disruption engine
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


