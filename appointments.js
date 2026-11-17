const express = require("express");

const router = express.Router();

// ---- Configuration -----------------------------------------------------
const OPEN_HOUR = 9;
const CLOSE_HOUR = 17;
const SLOT_MINUTES = 30;
const CAPACITY_PER_SLOT = 2;
const MAX_DAYS_AHEAD = 60;
const MIN_DAYS_BETWEEN_DONATIONS = 56;

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

router.use(express.json());

// ---- Helpers -----------------------------------------------------------
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

function dateProblem(date) {
  if (!isValidDate(date)) return "date must be YYYY-MM-DD";

  const diff = dayNumber(date) - dayNumber(todayStr());

  if (diff < 0) return "date is in the past";

  if (diff > MAX_DAYS_AHEAD) {
    return `bookings open up to ${MAX_DAYS_AHEAD} days ahead`;
  }

  return null;
}

function allSlotTimes() {
  const slots = [];

  for (
    let minutes = OPEN_HOUR * 60;
    minutes < CLOSE_HOUR * 60;
    minutes += SLOT_MINUTES
  ) {
    slots.push(`${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`);
  }

  return slots;
}

function toDatabaseDate(date) {
  return new Date(`${date}T00:00:00.000Z`);
}

function toDatabaseTime(time) {
  return new Date(`1970-01-01T${time}:00.000Z`);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatTime(time) {
  return `${pad(time.getUTCHours())}:${pad(time.getUTCMinutes())}`;
}

function toAppointmentResponse(a) {
  return {
    id: a.public_id,
    centerId: a.center_external_id || "",
    centerName: a.center_name || "",
    donorName: a.donor_name || "",
    phone: a.phone || "",
    bloodGroup: a.blood_group || "",
    date: formatDate(a.appointment_date),
    time: formatTime(a.appointment_time),
    notes: a.notes || "",
    status: a.appointment_status,
    createdAt: a.created_at ? a.created_at.toISOString() : null,
    ...(a.updated_at ? { updatedAt: a.updated_at.toISOString() } : {}),
  };
}

// ---- Router factory ----------------------------------------------------
// server.js passes its existing shared PrismaClient.
module.exports = (prisma) => {
  if (!prisma) {
    throw new Error("Appointments router requires a Prisma client");
  }

  // GET /api/appointments/slots?centerId=b6&date=2026-12-08
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

      const appointments = await prisma.appointments.findMany({
        where: {
          center_external_id: centerId,
          appointment_date: toDatabaseDate(date),
          appointment_status: "booked",
        },
        select: {
          appointment_time: true,
        },
      });

      const booked = {};

      for (const appointment of appointments) {
        const time = formatTime(appointment.appointment_time);
        booked[time] = (booked[time] || 0) + 1;
      }

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
      console.error("Failed to fetch appointment slots:", error);

      res.status(500).json({
        error: "Failed to fetch appointment slots",
      });
    }
  });

  // GET /api/appointments?phone=9876543210
  router.get("/", async (req, res) => {
    try {
      const phone = normalizePhone(req.query.phone);

      if (!isValidPhone(phone)) {
        return res.status(400).json({
          error: "a valid phone is required",
        });
      }

      const appointments = await prisma.appointments.findMany({
        where: { phone },
        orderBy: [{ appointment_date: "asc" }, { appointment_time: "asc" }],
      });

      res.json(appointments.map(toAppointmentResponse));
    } catch (error) {
      console.error("Failed to fetch appointments:", error);

      res.status(500).json({
        error: "Failed to fetch appointments",
      });
    }
  });

  // POST /api/appointments
  router.post("/", async (req, res) => {
    try {
      const b = req.body || {};

      const donorName = String(b.donorName || "").trim();
      const phone = normalizePhone(b.phone);
      const centerId = String(b.centerId ?? "");
      const centerName = String(b.centerName || "").trim();
      const date = b.date;
      const time = b.time;
      const bloodGroup = b.bloodGroup;
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

      const appointment = await prisma.$transaction(async (tx) => {
        // Lock the slot and donor booking window.
        // Consistent lock order avoids lock-order deadlocks.
        const lockKeys = [
          `appointment-slot:${centerId}:${date}:${time}`,
          `appointment-phone:${phone}`,
        ].sort();

        for (const key of lockKeys) {
          await tx.$queryRaw`
  SELECT pg_advisory_xact_lock(
    hashtext(${key})::bigint
  ) IS NULL AS locked
`;
        }

        // Recheck date after acquiring locks.
        const currentProblem = dateProblem(date);

        if (currentProblem) {
          throw new Error("INVALID_DATE:" + currentProblem);
        }

        // Check slot capacity.
        const slotCount = await tx.appointments.count({
          where: {
            center_external_id: centerId,
            appointment_date: toDatabaseDate(date),
            appointment_time: toDatabaseTime(time),
            appointment_status: "booked",
          },
        });

        if (slotCount >= CAPACITY_PER_SLOT) {
          throw new Error("SLOT_FULL");
        }

        // Enforce the 56-day minimum donation interval.
        const donorAppointments = await tx.appointments.findMany({
          where: {
            phone,
            appointment_status: { not: "cancelled" },
          },
          select: {
            appointment_date: true,
          },
        });

        const clash = donorAppointments.find((a) => {
          const existingDate = formatDate(a.appointment_date);

          return (
            Math.abs(dayNumber(existingDate) - dayNumber(date)) <
            MIN_DAYS_BETWEEN_DONATIONS
          );
        });

        if (clash) {
          throw new Error(`DONATION_GAP:${formatDate(clash.appointment_date)}`);
        }

        return tx.appointments.create({
          data: {
            center_external_id: centerId,
            center_name: centerName,
            donor_name: donorName,
            phone,
            blood_group: bloodGroup,
            appointment_date: toDatabaseDate(date),
            appointment_time: toDatabaseTime(time),
            notes,
            appointment_status: "booked",
          },
        });
      });

      res.status(201).json(toAppointmentResponse(appointment));
    } catch (error) {
      if (error.message === "SLOT_FULL") {
        return res.status(409).json({
          error: "that slot just filled up, pick another",
        });
      }

      if (error.message.startsWith("DONATION_GAP:")) {
        const existingDate = error.message.split(":")[1];

        return res.status(409).json({
          error: `donations must be at least ${MIN_DAYS_BETWEEN_DONATIONS} days apart; you already have one on ${existingDate}`,
        });
      }

      if (error.message.startsWith("INVALID_DATE:")) {
        return res.status(400).json({
          error: error.message.slice("INVALID_DATE:".length),
        });
      }

      console.error("Failed to book appointment:", error);

      res.status(500).json({
        error: "Failed to book appointment",
      });
    }
  });

  // PATCH /api/appointments/:id
  router.patch("/:id", async (req, res) => {
    try {
      const { status } = req.body || {};

      if (!["cancelled", "completed"].includes(status)) {
        return res.status(400).json({
          error: "status must be 'cancelled' or 'completed'",
        });
      }

      const phone = normalizePhone((req.body || {}).phone);

      const existing = await prisma.appointments.findUnique({
        where: { public_id: req.params.id },
      });

      if (!existing) {
        return res.status(404).json({
          error: "appointment not found",
        });
      }

      if (phone !== existing.phone) {
        return res.status(403).json({
          error: "phone does not match this appointment",
        });
      }

      if (existing.appointment_status !== "booked") {
        return res.status(409).json({
          error: `appointment is already ${existing.appointment_status}`,
        });
      }

      const updated = await prisma.appointments.update({
        where: { public_id: req.params.id },
        data: {
          appointment_status: status,
          updated_at: new Date(),
        },
      });

      res.json(toAppointmentResponse(updated));
    } catch (error) {
      console.error("Failed to update appointment:", error);

      res.status(500).json({
        error: "Failed to update appointment",
      });
    }
  });

  return router;
};
