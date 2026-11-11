const express = require("express");
const pool = require("./db");

const router = express.Router();

const OPEN_HOUR = 9;
const CLOSE_HOUR = 17;
const SLOT_MINUTES = 30;
const CAPACITY_PER_SLOT = 2;
const MAX_DAYS_AHEAD = 60;
const MIN_DAYS_BETWEEN_DONATIONS = 56;

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

router.use(express.json());

// ---------- Helpers ----------

const pad = (n) => String(n).padStart(2, "0");

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const dayNumber = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
};

const isValidDate = (s) => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return false;
  }

  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));

  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
};

const normalizePhone = (p) => String(p || "").replace(/[^\d+]/g, "");

const isValidPhone = (p) => /^\+?\d{10,13}$/.test(p);

function allSlotTimes() {
  const out = [];

  for (let m = OPEN_HOUR * 60; m < CLOSE_HOUR * 60; m += SLOT_MINUTES) {
    out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  }

  return out;
}

function dateProblem(date) {
  if (!isValidDate(date)) {
    return "date must be YYYY-MM-DD";
  }

  const diff = dayNumber(date) - dayNumber(todayStr());

  if (diff < 0) return "date is in the past";

  if (diff > MAX_DAYS_AHEAD) {
    return `bookings open up to ${MAX_DAYS_AHEAD} days ahead`;
  }

  return null;
}

// Convert PostgreSQL rows into the existing frontend response format.
function formatAppointment(row) {
  return {
    id: row.public_id,
    centerId: row.center_external_id,
    centerName: row.center_name,
    donorName: row.donor_name,
    phone: row.phone,
    bloodGroup: row.donation_type,
    date: row.date,
    time: row.time,
    notes: row.notes || "",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------- GET available slots ----------

router.get("/slots", async (req, res) => {
  try {
    const centerId = String(req.query.centerId || "");
    const date = String(req.query.date || "");

    if (!centerId) {
      return res.status(400).json({
        error: "centerId is required",
      });
    }

    const problem = dateProblem(date);

    if (problem) {
      return res.status(400).json({ error: problem });
    }

    const result = await pool.query(
      `SELECT
         TO_CHAR(appointment_time, 'HH24:MI') AS time,
         COUNT(*)::int AS booked
       FROM appointments
       WHERE center_external_id = $1
         AND appointment_date = $2::date
         AND appointment_status = 'booked'
       GROUP BY appointment_time`,
      [centerId, date],
    );

    const booked = {};

    result.rows.forEach((row) => {
      booked[row.time] = row.booked;
    });

    const isToday = date === todayStr();
    const now = nowTime();

    const slots = allSlotTimes()
      .filter((time) => !(isToday && time <= now))
      .map((time) => ({
        time,
        capacity: CAPACITY_PER_SLOT,
        remaining: Math.max(0, CAPACITY_PER_SLOT - (booked[time] || 0)),
      }));

    res.json(slots);
  } catch (error) {
    console.error("Slots error:", error);
    res.status(500).json({ error: "Unable to fetch slots" });
  }
});

// ---------- GET donor appointments ----------

router.get("/", async (req, res) => {
  try {
    const phone = normalizePhone(req.query.phone);

    if (!isValidPhone(phone)) {
      return res.status(400).json({
        error: "a valid phone is required",
      });
    }

    const result = await pool.query(
      `SELECT
         public_id,
         center_external_id,
         center_name,
         donor_name,
         phone,
         donation_type,
         appointment_date::text AS date,
         TO_CHAR(appointment_time, 'HH24:MI') AS time,
         notes,
         appointment_status AS status,
         created_at,
         updated_at
       FROM appointments
       WHERE phone = $1
       ORDER BY appointment_date, appointment_time`,
      [phone],
    );

    res.json(result.rows.map(formatAppointment));
  } catch (error) {
    console.error("Appointments fetch error:", error);
    res.status(500).json({ error: "Unable to fetch appointments" });
  }
});

// ---------- POST book appointment ----------

router.post("/", async (req, res) => {
  const b = req.body || {};

  const donorName = String(b.donorName || "").trim();
  const phone = normalizePhone(b.phone);
  const centerId = String(b.centerId ?? "");
  const centerName = String(b.centerName || "").trim();
  const { date, time, bloodGroup } = b;
  const notes = String(b.notes || "")
    .trim()
    .slice(0, 300);

  if (donorName.length < 2 || donorName.length > 80) {
    return res.status(400).json({
      error: "name must be 2 to 80 characters",
    });
  }

  if (!isValidPhone(phone)) {
    return res.status(400).json({
      error: "enter a valid phone number",
    });
  }

  if (!centerId) {
    return res.status(400).json({
      error: "choose a donation center",
    });
  }

  if (!BLOOD_GROUPS.includes(bloodGroup)) {
    return res.status(400).json({
      error: "choose a valid blood group",
    });
  }

  const problem = dateProblem(date);

  if (problem) {
    return res.status(400).json({ error: problem });
  }

  if (!allSlotTimes().includes(time)) {
    return res.status(400).json({
      error: "invalid time slot",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Prevent two simultaneous bookings from exceeding slot capacity.
    const lockKey = `${centerId}:${date}:${time}`;

    await client.query("SELECT pg_advisory_xact_lock(hashtext($1)::bigint)", [
      lockKey,
    ]);

    if (date === todayStr() && time <= nowTime()) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "that time has already passed",
      });
    }

    const slotResult = await client.query(
      `SELECT COUNT(*)::int AS booked
       FROM appointments
       WHERE center_external_id = $1
         AND appointment_date = $2::date
         AND appointment_time = $3::time
         AND appointment_status = 'booked'`,
      [centerId, date, time],
    );

    if (slotResult.rows[0].booked >= CAPACITY_PER_SLOT) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "that slot just filled up, pick another",
      });
    }

    // Enforce the 56-day donation gap.
    const clashResult = await client.query(
      `SELECT appointment_date::text AS date
       FROM appointments
       WHERE phone = $1
         AND appointment_status <> 'cancelled'
         AND appointment_date BETWEEN
             $2::date - INTERVAL '55 days'
             AND $2::date + INTERVAL '55 days'
       ORDER BY appointment_date
       LIMIT 1`,
      [phone, date],
    );

    if (clashResult.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        error: `donations must be at least ${MIN_DAYS_BETWEEN_DONATIONS} days apart; you already have one on ${clashResult.rows[0].date}`,
      });
    }

    const result = await client.query(
      `INSERT INTO appointments
       (
         center_external_id,
         center_name,
         donor_name,
         phone,
         donation_type,
         appointment_date,
         appointment_time,
         appointment_status,
         notes
       )
       VALUES ($1,$2,$3,$4,$5,$6::date,$7::time,'booked',$8)
       RETURNING
         public_id,
         center_external_id,
         center_name,
         donor_name,
         phone,
         donation_type,
         appointment_date::text AS date,
         TO_CHAR(appointment_time, 'HH24:MI') AS time,
         notes,
         appointment_status AS status,
         created_at,
         updated_at`,
      [centerId, centerName, donorName, phone, bloodGroup, date, time, notes],
    );

    await client.query("COMMIT");

    res.status(201).json(formatAppointment(result.rows[0]));
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Appointment booking error:", error);

    res.status(500).json({
      error: "Unable to book appointment",
    });
  } finally {
    client.release();
  }
});

// ---------- PATCH cancel or complete appointment ----------

router.patch("/:id", async (req, res) => {
  try {
    const { status } = req.body || {};

    if (!["cancelled", "completed"].includes(status)) {
      return res.status(400).json({
        error: "status must be 'cancelled' or 'completed'",
      });
    }

    const phone = normalizePhone(req.body.phone);

    const existing = await pool.query(
      `SELECT public_id, phone, appointment_status
       FROM appointments
       WHERE public_id = $1::uuid`,
      [req.params.id],
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        error: "appointment not found",
      });
    }

    const appt = existing.rows[0];

    if (phone !== appt.phone) {
      return res.status(403).json({
        error: "phone does not match this appointment",
      });
    }

    if (appt.appointment_status !== "booked") {
      return res.status(409).json({
        error: `appointment is already ${appt.appointment_status}`,
      });
    }

    const result = await pool.query(
      `UPDATE appointments
       SET appointment_status = $1,
           updated_at = NOW()
       WHERE public_id = $2::uuid
         AND appointment_status = 'booked'
       RETURNING
         public_id,
         center_external_id,
         center_name,
         donor_name,
         phone,
         donation_type,
         appointment_date::text AS date,
         TO_CHAR(appointment_time, 'HH24:MI') AS time,
         notes,
         appointment_status AS status,
         created_at,
         updated_at`,
      [status, req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(409).json({
        error: "appointment status has changed",
      });
    }

    res.json(formatAppointment(result.rows[0]));
  } catch (error) {
    console.error("Appointment update error:", error);
    res.status(500).json({
      error: "Unable to update appointment",
    });
  }
});

module.exports = router;
