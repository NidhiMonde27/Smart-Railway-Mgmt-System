import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useLocation, Link, useSearchParams } from "react-router-dom";
import {
  QrCode,
  Download,
  Share2,
  CheckCircle2,
  ShieldCheck,
  Home,
  Loader,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  getTicketIssueDate,
  getTicketExpiryDate,
  formatTicketDateTime,
  isTicketValid,
  getTicketStatus,
  formatViaStation,
} from "../utils/ticketUtils";

import { useUser } from "@clerk/clerk-react";

const DigitalTicket = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const userId = user?.id;

  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    // Check if ticket data passed via navigation state
    if (location.state) {
      if (location.state.userId && userId && location.state.userId !== userId) {
        setAccessDenied(true);
      } else {
        setTicketData(location.state);
      }
    } else {
      // Try to fetch from API using ticket ID from URL
      const ticketId = searchParams.get("id");
      if (ticketId) {
        fetchTicket(ticketId);
      }
    }
  }, [location.state, searchParams, userId]);

  const fetchTicket = async (ticketId) => {
    setLoading(true);
    setAccessDenied(false);
    try {
      const response = await fetch(
        `http://localhost:5000/api/tickets/${ticketId}?userId=${encodeURIComponent(userId || "")}`,
        {
          headers: {
            "x-user-id": userId || "",
          },
        }
      );
      if (response.status === 403) {
        setAccessDenied(true);
      } else if (response.ok) {
        const data = await response.json();
        setTicketData(data);
      }
    } catch (error) {
      console.error("Error fetching ticket:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col font-sans">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Loader className="w-12 h-12 text-brand-navy animate-spin" />
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-gray-50">
        <Navbar />
        <div className="flex-grow flex items-center justify-center p-6">
          <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow-lg border border-red-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-6">
              You do not have authorization to view this ticket. Please check your account.
            </p>
            <Link
              to="/dashboard"
              className="px-6 py-3 bg-brand-navy text-white font-bold rounded-xl shadow-md hover:bg-blue-900 transition-all inline-block"
            >
              Back to My Tickets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!ticketData) {
    return (
      <div className="min-h-screen flex flex-col font-sans">
        <Navbar />
        <div className="flex-grow flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-xl text-gray-600 mb-4">No ticket data found</p>
            <Link
              to="/ticketing"
              className="text-brand-navy font-bold hover:underline"
            >
              Book a new ticket
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Generate compact, low-density QR code payload optimized for fast webcam reading
  const qrPayload = JSON.stringify({
    ticket_id: ticketData.ticket_id || ticketData.id,
    source: ticketData.source,
    destination: ticketData.destination,
    class: ticketData.class,
    ticket_type: ticketData.ticket_type || ticketData.ticketType,
    fare: ticketData.fare,
  });

  const handleSaveTicket = () => {
    if (!ticketData) return;
    const issueDateStr = formatTicketDateTime(getTicketIssueDate(ticketData));
    const expiryDateStr = formatTicketDateTime(getTicketExpiryDate(ticketData));
    const viaClean = formatViaStation(ticketData.via);
    const viaStr = viaClean && viaClean !== "Direct" ? `Via Route    : ${viaClean}\n` : "";
    const trainStr = ticketData.train_name ? `Service      : ${ticketData.train_name} (${ticketData.departure_time || "N/A"})\n` : "";

    let segmentText = "";
    if (ticketData.segments && ticketData.segments.length > 0) {
      segmentText = "\n----------------------------------------\nJOURNEY SEGMENTS & TRAIN CHANGES:\n";
      ticketData.segments.forEach((seg, idx) => {
        segmentText += `Segment ${seg.segmentNumber}: ${seg.source} ➔ ${seg.destination} (${seg.line || "Railway Network"})\n   Service : ${seg.train_name || "Suburban Service"} (${seg.departureTime || "N/A"} Dep)\n`;
        if (ticketData.transfers && ticketData.transfers[idx]) {
          segmentText += `>>> ${ticketData.transfers[idx]} <<<\n`;
        }
      });
    }

    const content = `========================================
MUMBAI LOCAL / METRO DIGITAL M-TICKET
========================================
Ticket ID    : ${ticketData.ticket_id || "N/A"}
Status       : ${getTicketStatus(ticketData)}
Source       : ${ticketData.source}
Destination  : ${ticketData.destination}
${viaStr}${trainStr}Class        : ${ticketData.class}
Ticket Type  : ${ticketData.ticket_type || ticketData.ticketType}
Passengers   : ${ticketData.passengers}
Total Fare   : ₹${ticketData.fare}
Issued At    : ${issueDateStr}
Valid Till   : ${expiryDateStr}${segmentText}========================================
QR Code Verification Payload:
${qrPayload}
========================================
UTS Mobile Railway Ticketing System
Thank you for traveling with Indian Railways!
`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Ticket_${ticketData.ticket_id || "m-ticket"}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShareTicket = async () => {
    if (!ticketData) return;
    const expiryDateStr = formatTicketDateTime(getTicketExpiryDate(ticketData));
    const viaClean = formatViaStation(ticketData.via);
    const viaStr = viaClean && viaClean !== "Direct" ? ` (Via ${viaClean})` : "";
    const transferNote = ticketData.transfers && ticketData.transfers.length > 0 ? `\nTrain Changes: ${ticketData.transfers.join(" | ")}` : "";
    const shareText = `🎫 Mumbai Rail M-Ticket: ${ticketData.source} to ${ticketData.destination}${viaStr}\nTicket ID: ${ticketData.ticket_id}\nClass: ${ticketData.class} | Type: ${ticketData.ticket_type || ticketData.ticketType}${transferNote}\nValid Till: ${expiryDateStr}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `M-Ticket ${ticketData.ticket_id}`,
          text: shareText,
          url: window.location.href,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          fallbackCopyToClipboard(shareText);
        }
      }
    } else {
      fallbackCopyToClipboard(shareText);
    }
  };

  const fallbackCopyToClipboard = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => alert("Ticket details copied to clipboard!"),
        () => alert(text)
      );
    } else {
      alert(text);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar />

      <div className="flex-grow flex items-center justify-center p-6 pb-20">
        <div className="max-w-md w-full relative">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10">
            {/* Header */}
            <div className="bg-brand-navy p-6 pt-8 text-white text-center relative overflow-hidden">
              <div
                className="absolute top-0 left-0 w-full h-full opacity-10"
                style={{
                  backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
                  backgroundSize: "10px 10px",
                }}
              ></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-lg">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/en/thumb/4/41/Flag_of_India.svg/1200px-Flag_of_India.svg.png"
                    className="w-10 h-10 object-cover rounded-full mix-blend-multiply"
                    alt="Emblem"
                  />
                </div>
                <h2 className="text-xl font-bold tracking-widest uppercase">
                  M-Ticket
                </h2>
                <p className="text-blue-200 text-xs font-medium mt-1">
                  UTS Mobile Ticketing
                </p>
              </div>
            </div>

            {/* Ticket Body */}
            <div className="p-6 relative">
              {/* Punch Hols */}
              <div className="absolute -left-3 top-0 w-6 h-6 bg-gray-100 rounded-full"></div>
              <div className="absolute -right-3 top-0 w-6 h-6 bg-gray-100 rounded-full"></div>
              <div className="border-b-2 border-dashed border-gray-200 mb-6"></div>

              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold">
                    Source
                  </p>
                  <p className="text-xl font-black text-gray-800 uppercase">
                    {ticketData.source}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase font-bold">
                    Destination
                  </p>
                  <p className="text-xl font-black text-gray-800 uppercase">
                    {ticketData.destination}
                  </p>
                </div>
              </div>

              {formatViaStation(ticketData.via) && formatViaStation(ticketData.via) !== "Direct" && (
                <div className="mb-4 p-2 bg-blue-50/80 border border-blue-100 rounded-xl text-center">
                  <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">
                    Via Station / Route
                  </span>
                  <span className="text-xs font-black text-brand-navy">
                    {formatViaStation(ticketData.via)}
                  </span>
                </div>
              )}

              {ticketData.train_name && (
                <div className="mb-4 p-2 bg-purple-50/80 border border-purple-100 rounded-xl text-center">
                  <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider block">
                    Service / Train Choice
                  </span>
                  <span className="text-xs font-bold text-purple-950">
                    {ticketData.train_name} {ticketData.departure_time && ticketData.departure_time !== "N/A" ? `(${ticketData.departure_time} Dep)` : ""}
                  </span>
                </div>
              )}

              {ticketData.segments && ticketData.segments.length > 0 && (
                <div className="mb-4 p-3 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2">
                  <span className="text-[10px] text-amber-700 font-extrabold uppercase tracking-wider block border-b border-amber-200 pb-1">
                    Route Segments & Train Change Details
                  </span>
                  {ticketData.segments.map((seg, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="flex justify-between font-bold text-amber-950">
                        <span>Seg {seg.segmentNumber}: {seg.source} ➔ {seg.destination}</span>
                        <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">{seg.line}</span>
                      </div>
                      <p className="text-[11px] text-gray-600 font-medium">
                        {seg.train_name} ({seg.departureTime || "N/A"} Dep)
                      </p>
                      {ticketData.transfers && ticketData.transfers[idx] && (
                        <div className="my-1 py-0.5 px-2 bg-red-600 text-white font-black text-[10px] rounded uppercase tracking-wider text-center shadow-xs">
                          {ticketData.transfers[idx]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 uppercase font-bold">
                    Class
                  </p>
                  <p className="font-bold text-brand-navy">
                    {ticketData.class}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 uppercase font-bold">
                    Type
                  </p>
                  <p className="font-bold text-brand-navy">
                    {ticketData.ticket_type || ticketData.ticketType}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 uppercase font-bold">
                    Adults
                  </p>
                  <p className="font-bold text-brand-navy">
                    {ticketData.passengers}
                  </p>
                </div>
                <div className="p-3 bg-brand-saffron/10 rounded-xl">
                  <p className="text-xs text-brand-saffron uppercase font-bold">
                    Fare
                  </p>
                  <p className="font-bold text-brand-saffron">
                    ₹{ticketData.fare}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-xs text-gray-400 uppercase font-bold">
                    Issued At
                  </p>
                  <p className="font-bold text-brand-navy">
                    {formatTicketDateTime(getTicketIssueDate(ticketData))}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <p className="text-xs text-gray-400 uppercase font-bold">
                    Valid Till
                  </p>
                  <p className="font-bold text-green-700">
                    {formatTicketDateTime(getTicketExpiryDate(ticketData))}
                  </p>
                </div>
              </div>

              {/* QR Code with JSON Payload */}
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-brand-navy/20 rounded-2xl bg-brand-navy/5 mb-6">
                <div className="p-3 bg-white rounded-xl shadow-xs border border-gray-200">
                  <QRCodeSVG
                    value={qrPayload}
                    size={280}
                    level="M"
                    boostLevel={false}
                    marginSize={4}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  />
                </div>
                <p className="text-xs text-gray-500 font-mono tracking-widest mt-3">
                  {ticketData.ticket_id}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  Scan to verify ticket
                </p>
              </div>

              <div
                className={`flex items-center justify-center space-x-2 font-bold text-sm py-2 rounded-lg ${
                  isTicketValid(ticketData)
                    ? "text-green-600 bg-green-50"
                    : getTicketStatus(ticketData) === "Used"
                      ? "text-amber-600 bg-amber-50"
                      : "text-red-600 bg-red-50"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Ticket {getTicketStatus(ticketData)}</span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 p-4 grid grid-cols-2 gap-3">
              <button
                onClick={handleSaveTicket}
                className="flex items-center justify-center p-3 rounded-xl bg-white border border-gray-200 shadow-sm text-sm font-bold hover:bg-gray-100"
              >
                <Download className="w-4 h-4 mr-2" /> Save
              </button>
              <button
                onClick={handleShareTicket}
                className="flex items-center justify-center p-3 rounded-xl bg-brand-navy text-white shadow-lg text-sm font-bold hover:bg-brand-navy/90"
              >
                <Share2 className="w-4 h-4 mr-2" /> Share
              </button>
              {/* Home Button */}
              <Link
                to="/"
                className="col-span-2 flex items-center justify-center p-3 rounded-xl bg-brand-saffron text-white shadow-lg text-sm font-bold hover:bg-brand-saffron/90"
              >
                <Home className="w-4 h-4 mr-2" /> Back to Home
              </Link>
            </div>
          </div>

          {/* Confetti effect simulation (visual only) */}
          <div className="absolute -top-10 -right-10 w-20 h-20 bg-yellow-400 rounded-full blur-2xl opacity-50"></div>
          <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-green-400 rounded-full blur-2xl opacity-50"></div>
        </div>
      </div>
    </div>
  );
};

export default DigitalTicket;
