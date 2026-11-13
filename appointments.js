// Donation appointment API. Mount in server.js with:
//   app.use('/api/appointments', require('./appointments'));
// Storage: data/appointments.json (created on first write).
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();
const FILE = path.join(__dirname, 'data', 'appointments.json');

// ---- Config -------------------------------------------------------------
const OPEN_HOUR = 9;            // first slot 09:00
const CLOSE_HOUR = 17;          // last slot starts 16:30
const SLOT_MINUTES = 30;
const CAPACITY_PER_SLOT = 2;    // donors per slot per center
const MAX_DAYS_AHEAD = 60;
const MIN_DAYS_BETWEEN_DONATIONS = 56; // whole blood. Replace with eligibility.js rules if you prefer.
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ---- Storage ------------------------------------------------------------
function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}
function save(list) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2));
  fs.renameSync(tmp, FILE); // atomic replace
}

// ---- Helpers ------------------------------------------------------------
const pad = (n) => String(n).padStart(2, '0');
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const dayNumber = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
};
const isValidDate = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};
const normalizePhone = (p) => String(p || '').replace(/[^\d+]/g, '');
const isValidPhone = (p) => /^\+?\d{10,13}$/.test(p);

function allSlotTimes() {
  const out = [];
  for (let m = OPEN_HOUR * 60; m < CLOSE_HOUR * 60; m += SLOT_MINUTES) {
    out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  }
  return out;
}

function dateProblem(date) {
  if (!isValidDate(date)) return 'date must be YYYY-MM-DD';
  const diff = dayNumber(date) - dayNumber(todayStr());
  if (diff < 0) return 'date is in the past';
  if (diff > MAX_DAYS_AHEAD) return `bookings open up to ${MAX_DAYS_AHEAD} days ahead`;
  return null;
}

function slotsFor(list, centerId, date) {
  const booked = {};
  for (const a of list) {
    if (a.status === 'booked' && a.centerId === centerId && a.date === date) {
      booked[a.time] = (booked[a.time] || 0) + 1;
    }
  }
  const isToday = date === todayStr();
  const now = nowTime();
  return allSlotTimes()
    .filter((t) => !(isToday && t <= now))
    .map((time) => ({
      time,
      capacity: CAPACITY_PER_SLOT,
      remaining: Math.max(0, CAPACITY_PER_SLOT - (booked[time] || 0)),
    }));
}

// ---- Routes -------------------------------------------------------------
router.use(express.json());

// GET /api/appointments/slots?centerId=1&date=2026-11-20
router.get('/slots', (req, res) => {
  const centerId = String(req.query.centerId || '');
  const date = String(req.query.date || '');
  if (!centerId) return res.status(400).json({ error: 'centerId is required' });
  const problem = dateProblem(date);
  if (problem) return res.status(400).json({ error: problem });
  res.json(slotsFor(load(), centerId, date));
});

// GET /api/appointments?phone=9876543210  (phone required: no public listing of donor data)
router.get('/', (req, res) => {
  const phone = normalizePhone(req.query.phone);
  if (!isValidPhone(phone)) return res.status(400).json({ error: 'a valid phone is required' });
  const mine = load()
    .filter((a) => a.phone === phone)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  res.json(mine);
});

// POST /api/appointments
router.post('/', (req, res) => {
  const b = req.body || {};
  const donorName = String(b.donorName || '').trim();
  const phone = normalizePhone(b.phone);
  const centerId = String(b.centerId ?? '');
  const centerName = String(b.centerName || '').trim();
  const { date, time, bloodGroup } = b;
  const notes = String(b.notes || '').trim().slice(0, 300);

  if (donorName.length < 2 || donorName.length > 80) return res.status(400).json({ error: 'name must be 2 to 80 characters' });
  if (!isValidPhone(phone)) return res.status(400).json({ error: 'enter a valid phone number' });
  if (!centerId) return res.status(400).json({ error: 'choose a donation center' });
  if (!BLOOD_GROUPS.includes(bloodGroup)) return res.status(400).json({ error: 'choose a valid blood group' });
  const problem = dateProblem(date);
  if (problem) return res.status(400).json({ error: problem });
  if (!allSlotTimes().includes(time)) return res.status(400).json({ error: 'invalid time slot' });

  // Everything below runs synchronously, so check + write cannot interleave with another request.
  const list = load();

  const slot = slotsFor(list, centerId, date).find((s) => s.time === time);
  if (!slot) return res.status(409).json({ error: 'that time has already passed' });
  if (slot.remaining === 0) return res.status(409).json({ error: 'that slot just filled up, pick another' });

  const mine = list.filter((a) => a.phone === phone && a.status !== 'cancelled');
  const clash = mine.find((a) => Math.abs(dayNumber(a.date) - dayNumber(date)) < MIN_DAYS_BETWEEN_DONATIONS);
  if (clash) {
    return res.status(409).json({
      error: `donations must be at least ${MIN_DAYS_BETWEEN_DONATIONS} days apart; you already have one on ${clash.date}`,
    });
  }

  const appt = {
    id: crypto.randomUUID(),
    centerId, centerName, donorName, phone, bloodGroup, date, time, notes,
    status: 'booked',
    createdAt: new Date().toISOString(),
  };
  list.push(appt);
  save(list);
  res.status(201).json(appt);
});

// PATCH /api/appointments/:id   { phone, status: 'cancelled' | 'completed' }
router.patch('/:id', (req, res) => {
  const { status } = req.body || {};
  if (!['cancelled', 'completed'].includes(status)) {
    return res.status(400).json({ error: "status must be 'cancelled' or 'completed'" });
  }
  const list = load();
  const appt = list.find((a) => a.id === req.params.id);
  if (!appt) return res.status(404).json({ error: 'appointment not found' });
  // Donors prove ownership with their phone. 'completed' is for staff: see README note on auth.
  if (normalizePhone(req.body.phone) !== appt.phone) return res.status(403).json({ error: 'phone does not match this appointment' });
  if (appt.status !== 'booked') return res.status(409).json({ error: `appointment is already ${appt.status}` });
  appt.status = status;
  appt.updatedAt = new Date().toISOString();
  save(list);
  res.json(appt);
});

module.exports = router;
