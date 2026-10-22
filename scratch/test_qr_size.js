const QRCode = require('qrcode');

const samplePayload = JSON.stringify({
  ticket_id: "TKT_1741234567890",
  source: "Churchgate",
  destination: "Andheri",
  via: "Direct",
  train_id: "90033",
  train_name: "Fast Local",
  departure_time: "10:30 AM",
  class: "First Class",
  ticket_type: "Single Journey",
  passengers: 2,
  fare: 105,
  issued_at: "2026-10-08T19:30:00.000Z",
  valid_upto: "2026-10-09T19:30:00.000Z",
  date: "08/10/2026",
  isDirect: true,
  interchanges: [],
  transfers: [],
  segments: []
});

console.log("Payload length:", samplePayload.length);

const qrH = QRCode.create(samplePayload, { errorCorrectionLevel: 'H' });
console.log("Version (H):", qrH.version, "Modules per side:", qrH.modules.size);

const qrM = QRCode.create(samplePayload, { errorCorrectionLevel: 'M' });
console.log("Version (M):", qrM.version, "Modules per side:", qrM.modules.size);

const qrL = QRCode.create(samplePayload, { errorCorrectionLevel: 'L' });
console.log("Version (L):", qrL.version, "Modules per side:", qrL.modules.size);
