const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { checkEligibility, getQuestionnaire } = require("./eligibility");

const DB_PATH = path.join(__dirname, "data", "db.json");
const DIST_PATH = path.join(__dirname, "dist"); // built React app (npm run build)

const app = express();
app.use(cors());
app.use(express.json());

// ---------- tiny JSON "database" ----------
function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}
function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ---------- blood compatibility ----------
const COMPATIBILITY = {
  "O-": ["O-"],
  "O+": ["O+", "O-"],
  "A-": ["A-", "O-"],
  "A+": ["A+", "A-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "AB-": ["AB-", "A-", "B-", "O-"],
  "AB+": ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"],
};

function distanceKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v === undefined || v === null)) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function id() {
  return crypto.randomUUID();
}

// ================= DONORS =================

app.get("/api/donors", (req, res) => {
  const db = readDB();
  const { bloodGroup, status, lat, lng, radius, compatibleWith } = req.query;
  let donors = db.donors;

  if (bloodGroup) donors = donors.filter((d) => d.bloodGroup === bloodGroup);
  if (status) donors = donors.filter((d) => d.status === status);
  if (compatibleWith) {
    const allowed = COMPATIBILITY[compatibleWith] || [];
    donors = donors.filter((d) => allowed.includes(d.bloodGroup));
  }

  const userLat = lat ? parseFloat(lat) : null;
  const userLng = lng ? parseFloat(lng) : null;
  const maxRadius = radius ? parseFloat(radius) : null;

  donors = donors.map((d) => {
    const distance = userLat !== null && userLng !== null ? distanceKm(userLat, userLng, d.lat, d.lng) : null;
    return { ...d, distanceKm: distance !== null ? Math.round(distance * 10) / 10 : null };
  });

  if (userLat !== null && userLng !== null) {
    if (maxRadius) donors = donors.filter((d) => d.distanceKm !== null && d.distanceKm <= maxRadius);
    donors.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }

  res.json(donors);
});

app.post("/api/donors", (req, res) => {
  const { name, bloodGroup, phone, city, lat, lng } = req.body;
  if (!name || !bloodGroup || !phone || !city) {
    return res.status(400).json({ error: "name, bloodGroup, phone and city are required" });
  }
  const db = readDB();
  const donor = {
    id: id(),
    name,
    bloodGroup,
    phone,
    city,
    lat: lat ?? null,
    lng: lng ?? null,
    status: "available",
    lastDonation: null,
    donations: 0,
  };
  db.donors.push(donor);
  writeDB(db);
  res.status(201).json(donor);
});

app.patch("/api/donors/:id", (req, res) => {
  const db = readDB();
  const donor = db.donors.find((d) => d.id === req.params.id);
  if (!donor) return res.status(404).json({ error: "Donor not found" });
  Object.assign(donor, req.body);
  writeDB(db);
  res.json(donor);
});

app.delete("/api/donors/:id", (req, res) => {
  const db = readDB();
  const before = db.donors.length;
  db.donors = db.donors.filter((d) => d.id !== req.params.id);
  writeDB(db);
  res.json({ deleted: before !== db.donors.length });
});

// ================= DONOR ELIGIBILITY =================

// Questionnaire definition (limits + condition lists) so the client renders from the same rules.
app.get("/api/eligibility/questions", (req, res) => {
  res.json(getQuestionnaire());
});

// Stateless check: nothing is stored.
app.post("/api/eligibility/check", (req, res) => {
  const result = checkEligibility(req.body);
  if (result.errors) return res.status(400).json({ error: result.errors.join("; ") });
  res.json(result);
});

// ================= EMERGENCY REQUESTS =================

app.get("/api/requests", (req, res) => {
  const db = readDB();
  let requests = db.requests.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (req.query.status) requests = requests.filter((r) => r.status === req.query.status);
  if (req.query.urgency) requests = requests.filter((r) => r.urgency === req.query.urgency);
  res.json(requests);
});

app.post("/api/requests", (req, res) => {
  const { patientName, bloodGroup, unitsNeeded, hospital, city, lat, lng, urgency, contact } = req.body;
  if (!patientName || !bloodGroup || !hospital || !contact) {
    return res.status(400).json({ error: "patientName, bloodGroup, hospital and contact are required" });
  }
  const db = readDB();
  const request = {
    id: id(),
    patientName,
    bloodGroup,
    unitsNeeded: unitsNeeded || 1,
    hospital,
    city: city || "",
    lat: lat ?? null,
    lng: lng ?? null,
    urgency: urgency || "urgent",
    contact,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  db.requests.unshift(request);
  writeDB(db);

  const allowed = COMPATIBILITY[bloodGroup] || [bloodGroup];
  let matches = db.donors.filter((d) => d.status === "available" && allowed.includes(d.bloodGroup));
  matches = matches.map((d) => ({
    ...d,
    distanceKm: lat && lng ? Math.round(distanceKm(lat, lng, d.lat, d.lng) * 10) / 10 : null,
  }));
  if (lat && lng) matches.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

  res.status(201).json({ request, matchedDonors: matches.slice(0, 10) });
});

app.patch("/api/requests/:id", (req, res) => {
  const db = readDB();
  const request = db.requests.find((r) => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found" });
  Object.assign(request, req.body);

  if (req.body.status === "fulfilled" && req.body.donorId) {
    const donor = db.donors.find((d) => d.id === req.body.donorId);
    if (donor) {
      donor.donations = (donor.donations || 0) + 1;
      donor.lastDonation = new Date().toISOString().slice(0, 10);
      donor.status = "unavailable";
    }
  }
  writeDB(db);
  res.json(request);
});

// ================= BLOOD BANKS =================

app.get("/api/bloodbanks", (req, res) => {
  const db = readDB();
  res.json(db.bloodBanks);
});

// ================= APPOINTMENTS =================
app.use("/api/appointments", require("./appointments"));

// ================= DASHBOARD =================

app.get("/api/stats", (req, res) => {
  const db = readDB();
  const totalDonors = db.donors.length;
  const availableDonors = db.donors.filter((d) => d.status === "available").length;
  const totalRequests = db.requests.length;
  const openRequests = db.requests.filter((r) => r.status === "open").length;
  const criticalRequests = db.requests.filter((r) => r.status === "open" && r.urgency === "critical").length;
  const totalDonations = db.donors.reduce((sum, d) => sum + (d.donations || 0), 0);

  const byGroup = {};
  db.donors.forEach((d) => {
    byGroup[d.bloodGroup] = (byGroup[d.bloodGroup] || 0) + (d.status === "available" ? 1 : 0);
  });

  res.json({ totalDonors, availableDonors, totalRequests, openRequests, criticalRequests, totalDonations, byGroup });
});

// ================= SERVE REACT BUILD (production) =================
if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(DIST_PATH, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send(
      "BloodBridge API is running. The React client isn't built yet — run `npm run dev` for local development (client on :5173, API on :3000), or `npm run build && npm start` for production."
    );
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  BloodBridge API running -> http://localhost:${PORT}\n`);
});
