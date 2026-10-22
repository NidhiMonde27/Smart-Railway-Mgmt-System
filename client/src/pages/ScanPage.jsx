import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  CheckCircle,
  XCircle,
  QrCode,
  ArrowLeft,
  AlertCircle,
  Scan,
  Video,
  VideoOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import {
  isTicketValid,
  isTicketConsumed,
  getTicketIssueDate,
  getTicketExpiryDate,
  formatTicketDateTime,
  formatViaStation,
} from "../utils/ticketUtils";

const ScanPage = () => {
  const navigate = useNavigate();
  const [scanned, setScanned] = useState(false);
  const [valid, setValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const [manualInput, setManualInput] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const html5QrCodeRef = useRef(null);

  // Platform Scanner Simulator State
  const [simTrain, setSimTrain] = useState("90033");
  const [simStation, setSimStation] = useState("Dadar");
  const [simZone, setSimZone] = useState("END");
  const [simEvent, setSimEvent] = useState("ENTRY");
  const [simPassengers, setSimPassengers] = useState(4);
  const [simFeedback, setSimFeedback] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  const handleSimulatePlatformScan = async () => {
    setSimLoading(true);
    setSimFeedback(null);
    try {
      const res = await fetch("https://smart-railway-mgmt-system.onrender.com/api/coach-occupancy/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainId: simTrain,
          station: simStation,
          zone: simZone,
          eventType: simEvent,
          passengerCount: simPassengers,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSimFeedback(data.message || "Platform scan simulated successfully!");
      }
    } catch (err) {
      console.error("Error simulating platform scan:", err);
      setSimFeedback("Error simulating platform scan.");
    } finally {
      setSimLoading(false);
    }
  };

  const isVerifyingRef = useRef(false);

  const processTicketVerification = async (ticketInput) => {
    if (isVerifyingRef.current) return;
    isVerifyingRef.current = true;
    setLoading(true);

    try {
      let qrDataParam = "";
      let ticketIdParam = "";

      if (typeof ticketInput === "string") {
        qrDataParam = ticketInput.trim();
        if (qrDataParam.startsWith("{")) {
          try {
            const parsed = JSON.parse(qrDataParam);
            ticketIdParam = parsed.ticket_id || parsed.ticketId || parsed.id || "";
          } catch (e) {
            ticketIdParam = qrDataParam;
          }
        } else {
          ticketIdParam = qrDataParam;
        }
      } else if (ticketInput && typeof ticketInput === "object") {
        ticketIdParam = ticketInput.ticket_id || ticketInput.ticketId || ticketInput.id || "";
        qrDataParam = JSON.stringify(ticketInput);
      }

      const res = await fetch("https://smart-railway-mgmt-system.onrender.com/api/tickets/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticketIdParam,
          qrData: qrDataParam,
          action: "verify_and_consume",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setScanned(true);
        setTicketData(data.ticket || null);
        if (data.status === "VALID") {
          setValid(true);
          setVerificationResult({
            success: true,
            status: "VALID",
            message: data.message || "Ticket is Valid",
          });
        } else if (data.status === "EXPIRED") {
          setValid(false);
          setVerificationResult({
            success: false,
            status: "EXPIRED",
            message: "Ticket has Expired",
          });
        } else if (data.status === "ALREADY_USED") {
          setValid(false);
          setVerificationResult({
            success: false,
            status: "ALREADY_USED",
            message: "Ticket has already been used / scanned",
          });
        } else if (data.status === "CANCELLED") {
          setValid(false);
          setVerificationResult({
            success: false,
            status: "CANCELLED",
            message: "Ticket is Cancelled / Revoked",
          });
        } else {
          setValid(false);
          setVerificationResult({
            success: false,
            status: "INVALID",
            message: data.message || "Invalid Ticket",
          });
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setValid(false);
        setScanned(true);
        setVerificationResult({
          success: false,
          status: "INVALID",
          message: errData.message || `Ticket ID "${ticketIdParam}" not found`,
        });
      }
    } catch (err) {
      console.error("Verification exception:", err);
      setValid(false);
      setScanned(true);
      setVerificationResult({
        success: false,
        status: "INVALID",
        message: "Error verifying ticket. Backend service unavailable.",
      });
    } finally {
      setLoading(false);
      isVerifyingRef.current = false;
    }
  };

  // Start camera scanning
  const startScanning = async () => {
    try {
      setCameraError(null);
      setScanning(true);

      // Wait for React to update DOM state so #qr-reader element is rendered and visible
      await new Promise((resolve) => setTimeout(resolve, 150));

      const readerElement = document.getElementById("qr-reader");
      if (!readerElement) {
        throw new Error("Scanner container not ready");
      }

      // Clean up any existing scanner instance before starting
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          html5QrCodeRef.current.clear();
        } catch (e) {
          console.warn("Cleanup existing scanner warning:", e);
        }
        html5QrCodeRef.current = null;
      }

      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      // Scanning configuration optimized for screen readability and laptop front cameras
      const config = {
        fps: 25,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          return {
            width: Math.floor(minEdge * 0.85),
            height: Math.floor(minEdge * 0.85),
          };
        },
        aspectRatio: 1.0,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      };

      // Select camera preference: Prefer front/user camera for laptop webcams, with fallback to any available camera
      let cameraChoice = { facingMode: "user" };
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const frontCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes("front") ||
              d.label.toLowerCase().includes("user") ||
              d.label.toLowerCase().includes("webcam") ||
              d.label.toLowerCase().includes("integrated") ||
              d.label.toLowerCase().includes("facetime")
          );
          if (frontCam) {
            cameraChoice = frontCam.id;
          } else {
            cameraChoice = devices[0].id;
          }
        }
      } catch (camErr) {
        console.warn("Camera enumeration warning, using facingMode constraint:", camErr);
      }

      console.log("[QR Scanner Diagnostics] CAMERA_STARTED", { cameraChoice, fps: config.fps });

      await html5QrCode.start(
        cameraChoice,
        config,
        (decodedText) => {
          console.log("[QR Scanner Diagnostics] QR_DETECTED & DECODED", decodedText);
          handleQRScanned(decodedText);
        },
        (errorMessage) => {
          // Frame processing diagnostic loop (silent for normal frame scans)
        }
      );
    } catch (err) {
      console.error("[QR Scanner Diagnostics] SCANNER_ERROR", err);
      let msg = "Unable to access camera. Please check permissions.";
      if (err) {
        const errStr = String(err.message || err);
        if (errStr.includes("NotAllowedError") || errStr.includes("Permission")) {
          msg = "Camera permission denied. Please allow camera access in your browser settings.";
        } else if (errStr.includes("NotFoundError") || errStr.includes("DevicesNotFound")) {
          msg = "No camera found on your device.";
        } else if (errStr.includes("NotReadableError") || errStr.includes("TrackStart")) {
          msg = "Camera is currently in use by another application.";
        } else if (typeof err === "string") {
          msg = err;
        } else if (err.message) {
          msg = err.message;
        }
      }
      setCameraError(msg);
      setScanning(false);
    }
  };

  // Stop camera scanning
  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      } finally {
        html5QrCodeRef.current = null;
      }
    }
    setScanning(false);
  };

  // Handle scanned QR code
  const handleQRScanned = (decodedText) => {
    if (isVerifyingRef.current) return;
    stopScanning();
    processTicketVerification(decodedText);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch((e) => console.error("Unmount camera stop error:", e));
        }
        try {
          html5QrCodeRef.current.clear();
        } catch (e) {}
        html5QrCodeRef.current = null;
      }
    };
  }, []);

  const handleManualVerify = () => {
    if (!manualInput.trim()) return;
    processTicketVerification(manualInput.trim());
  };

  const resetScanner = () => {
    setScanned(false);
    setValid(false);
    setVerificationResult(null);
    setTicketData(null);
    setManualInput("");
    setCameraError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Standalone Header - No Navbar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Smart Rail Mumbai
              </h1>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl shadow-lg">
              <Scan className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-4xl font-extrabold text-gray-900">
                Ticket Verification
              </h2>
              <p className="text-gray-600 text-lg">
                Scan QR codes or enter Ticket ID to verify passenger tickets
              </p>
            </div>
          </div>
        </div>

        {/* Verification Result */}
        {scanned && verificationResult && (
          <div
            className={`mb-6 p-6 rounded-xl border-2 animate-in fade-in duration-300 ${
              verificationResult.success
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-start gap-4">
              {verificationResult.success ? (
                <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3
                  className={`text-xl font-bold mb-2 ${
                    verificationResult.success
                      ? "text-green-900"
                      : "text-red-900"
                  }`}
                >
                  {verificationResult.message}
                </h3>

                {ticketData && (
                  <div className="mt-4 space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">
                          Ticket ID:
                        </span>
                        <p className="text-gray-900 font-mono text-xs font-bold">
                          {ticketData.ticket_id || ticketData.ticketId || ticketData.id}
                        </p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">
                          Class / Type:
                        </span>
                        <p className="text-gray-900">
                          {ticketData.class} • {ticketData.ticket_type || ticketData.ticketType}
                        </p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">
                          From:
                        </span>
                        <p className="text-gray-900">{ticketData.source}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">To:</span>
                        <p className="text-gray-900">
                          {ticketData.destination}
                        </p>
                      </div>
                      {formatViaStation(ticketData.via) && formatViaStation(ticketData.via) !== "Direct" && (
                        <div>
                          <span className="font-semibold text-gray-700">
                            Via Route:
                          </span>
                          <p className="text-blue-900 font-bold text-xs">
                            {formatViaStation(ticketData.via)}
                          </p>
                        </div>
                      )}
                      {ticketData.transfers && ticketData.transfers.length > 0 && (
                        <div className="col-span-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                          <span className="font-bold text-amber-900 text-xs block">
                            Train Changes / Transfers:
                          </span>
                          <p className="text-red-700 font-extrabold text-xs">
                            {ticketData.transfers.join(" | ")}
                          </p>
                        </div>
                      )}
                      {ticketData.segments && ticketData.segments.length > 0 && (
                        <div className="col-span-2 space-y-1">
                          <span className="font-bold text-gray-700 text-xs block">
                            Segment Breakdown:
                          </span>
                          {ticketData.segments.map((s, idx) => (
                            <div key={idx} className="p-1.5 bg-gray-50 rounded border border-gray-200 text-xs">
                              <span className="font-bold">Seg {s.segmentNumber}: {s.source} ➔ {s.destination}</span> ({s.line})
                              <br />
                              <span className="text-gray-600">{s.train_name} ({s.departureTime || "N/A"} Dep)</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-gray-700">
                          Passengers:
                        </span>
                        <p className="text-gray-900">{ticketData.passengers}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">
                          Fare:
                        </span>
                        <p className="text-gray-900">₹{ticketData.fare}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">
                          Issued:
                        </span>
                        <p className="text-gray-900 text-xs">
                          {formatTicketDateTime(getTicketIssueDate(ticketData))}
                        </p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">
                          Valid Until:
                        </span>
                        <p className="text-gray-900 text-xs font-semibold">
                          {formatTicketDateTime(getTicketExpiryDate(ticketData))}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={resetScanner}
                  className="mt-4 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Scan Another Ticket
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scanner Section */}
        {!scanned && (
          <div className="space-y-6">
            {/* Camera Scanner */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  📷 QR Code Scanner
                </h3>
                {!scanning ? (
                  <button
                    onClick={startScanning}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Video className="w-5 h-5" />
                    Start Camera
                  </button>
                ) : (
                  <button
                    onClick={stopScanning}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <VideoOff className="w-5 h-5" />
                    Stop Camera
                  </button>
                )}
              </div>

              {/* Camera Error */}
              {cameraError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-900 font-semibold">Camera Error</p>
                      <p className="text-red-700 text-sm">{cameraError}</p>
                      <p className="text-red-600 text-xs mt-2">
                        Make sure you've granted camera permissions in your
                        browser settings.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Camera Viewfinder */}
              <div className="relative w-full max-w-md mx-auto">
                <div
                  id="qr-reader"
                  className={`rounded-2xl overflow-hidden ${!scanning ? "hidden" : ""}`}
                  style={{ minHeight: "300px" }}
                ></div>

                {/* Placeholder when camera is off */}
                {!scanning && (
                  <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden relative">
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                      <Camera className="text-gray-400 w-20 h-20" />
                      <p className="text-gray-600 font-medium">
                        Click "Start Camera" to begin scanning
                      </p>
                    </div>

                    {/* Corner Markers */}
                    <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-purple-400 rounded-tl-xl"></div>
                    <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-purple-400 rounded-tr-xl"></div>
                    <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-purple-400 rounded-bl-xl"></div>
                    <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-purple-400 rounded-br-xl"></div>
                  </div>
                )}
              </div>

              {scanning && (
                <p className="text-gray-600 mt-4 text-center text-sm">
                  <Scan className="w-5 h-5 inline-block mr-2 animate-pulse text-green-600" />
                  Camera is active. Point at a QR code to scan.
                </p>
              )}

              {!scanning && !cameraError && (
                <p className="text-gray-600 mt-4 text-center text-sm">
                  <Camera className="w-5 h-5 inline-block mr-2" />
                  Start the camera to scan QR codes from tickets
                </p>
              )}
            </div>

            {/* Manual Input / Ticket Number Entry */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Manual Ticket Verification
              </h3>
              <p className="text-gray-600 mb-4 text-sm">
                Enter Ticket ID or paste ticket QR payload
              </p>
              <textarea
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder='Enter Ticket ID (e.g. TKT_1741234567) or paste QR payload JSON'
                className="w-full h-24 px-4 py-3 border-2 border-gray-300 rounded-lg font-mono text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none resize-none"
              />
              <button
                onClick={handleManualVerify}
                disabled={!manualInput.trim() || loading}
                className="mt-4 w-full py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Verifying..." : "Verify Ticket"}
              </button>
            </div>

            {/* Demo Platform Scanner Simulator */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-indigo-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    📡 Demo Platform Scanner Simulator
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Simulate platform gate entry/exit events to update live coach-wise crowd allocation for college viva demo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/coach-crowd")}
                  className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold rounded-lg transition-colors"
                >
                  View Coach Crowd →
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Select Train
                  </label>
                  <select
                    value={simTrain}
                    onChange={(e) => setSimTrain(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-300 text-xs font-semibold"
                  >
                    <option value="90033">90033 (Fast Local)</option>
                    <option value="90025">90025 (Slow Local)</option>
                    <option value="90013">90013 (AC Local)</option>
                    <option value="90007">90007 (Fast Local)</option>
                    <option value="90001">90001 (Slow Local)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Station
                  </label>
                  <select
                    value={simStation}
                    onChange={(e) => setSimStation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-300 text-xs font-semibold"
                  >
                    <option value="Dadar">Dadar</option>
                    <option value="Andheri">Andheri</option>
                    <option value="Churchgate">Churchgate</option>
                    <option value="Borivali">Borivali</option>
                    <option value="Virar">Virar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Scanner Zone
                  </label>
                  <select
                    value={simZone}
                    onChange={(e) => setSimZone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-300 text-xs font-bold text-purple-700"
                  >
                    <option value="START">START (Front Platform)</option>
                    <option value="MIDDLE">MIDDLE (Center Platform)</option>
                    <option value="END">END (Rear Platform)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Event Type
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setSimEvent("ENTRY")}
                      className={`py-2 text-xs rounded-lg font-bold ${simEvent === "ENTRY" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700"}`}
                    >
                      ENTRY
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimEvent("EXIT")}
                      className={`py-2 text-xs rounded-lg font-bold ${simEvent === "EXIT" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"}`}
                    >
                      EXIT
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Passenger Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={simPassengers}
                    onChange={(e) => setSimPassengers(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-300 text-xs font-semibold"
                  />
                </div>
              </div>

              {simFeedback && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-900">
                  {simFeedback}
                </div>
              )}

              <button
                type="button"
                onClick={handleSimulatePlatformScan}
                disabled={simLoading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {simLoading ? "Processing Scan..." : "📡 SIMULATE PLATFORM SCAN EVENT"}
              </button>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Verification & Scanner Instructions
              </h3>
              <ul className="space-y-2 text-blue-800 text-sm">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1.</span>
                  <span>
                    Ask passenger to show their digital ticket QR code or Ticket ID
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2.</span>
                  <span>Position QR code within camera frame or enter Ticket ID manually</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">3.</span>
                  <span>
                    Journey tickets are consumed upon scan; Season Tickets remain Active throughout their validity period
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">4.</span>
                  <span>Use Platform Scanner Simulator to test live coach-wise crowd updates</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ScanPage;
