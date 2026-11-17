const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { checkEligibility, getQuestionnaire } = require("./eligibility");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DB_PATH = path.join(__dirname, "data", "db.json");
const DIST_PATH = path.join(__dirname, "dist");

const app = express();
app.use(cors());
app.use(express.json());

// ---------- JSON database (currently used by dashboard stats) ----------
function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ---------- Blood compatibility ----------
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
  if ([lat1, lng1, lat2, lng2].some((v) => v === undefined || v === null)) {
    return null;
  }

  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function id() {
  return crypto.randomUUID();
}

// ================= DONORS =================

app.get("/api/donors", async (req, res) => {
  try {
    const { bloodGroup, status, lat, lng, radius, compatibleWith } = req.query;

    const where = {};

    if (bloodGroup) {
      where.blood_group = bloodGroup;
    }

    if (status) {
      where.availability_status = status;
    }

    if (compatibleWith) {
      where.blood_group = {
        in: COMPATIBILITY[compatibleWith] || [],
      };
    }

    const records = await prisma.donor_directory.findMany({ where });

    let donors = records.map((d) => ({
      id: d.legacy_id,
      name: d.donor_name,
      gender: d.gender,
      age: d.age,
      weightKg: d.weight_kg == null ? null : Number(d.weight_kg),
      bloodGroup: d.blood_group,
      phone: d.phone,
      city: d.city,
      state: d.state,
      lat: d.latitude == null ? null : Number(d.latitude),
      lng: d.longitude == null ? null : Number(d.longitude),
      lastDonation: d.last_donation_date
        ? new Date(d.last_donation_date).toISOString().slice(0, 10)
        : null,
      donations: d.total_donations,
      status: d.availability_status,
      registeredOn: d.registered_on
        ? new Date(d.registered_on).toISOString().slice(0, 10)
        : null,
    }));

    const userLat = lat ? parseFloat(lat) : null;
    const userLng = lng ? parseFloat(lng) : null;
    const maxRadius = radius ? parseFloat(radius) : null;

    donors = donors.map((d) => {
      const distance =
        userLat !== null && userLng !== null
          ? distanceKm(userLat, userLng, d.lat, d.lng)
          : null;

      return {
        ...d,
        distanceKm: distance !== null ? Math.round(distance * 10) / 10 : null,
      };
    });

    if (userLat !== null && userLng !== null) {
      if (maxRadius) {
        donors = donors.filter(
          (d) => d.distanceKm !== null && d.distanceKm <= maxRadius,
        );
      }

      donors.sort(
        (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
      );
    }

    res.json(donors);
  } catch (error) {
    console.error("Failed to fetch donors:", error);
    res.status(500).json({ error: "Failed to fetch donors" });
  }
});

app.post("/api/donors", async (req, res) => {
  try {
    const { name, bloodGroup, phone, city, lat, lng } = req.body;

    if (!name || !bloodGroup || !phone || !city) {
      return res.status(400).json({
        error: "name, bloodGroup, phone and city are required",
      });
    }

    const donor = await prisma.donor_directory.create({
      data: {
        legacy_id: id(),
        donor_name: name,
        blood_group: bloodGroup,
        phone,
        city,
        latitude: lat ?? null,
        longitude: lng ?? null,
        availability_status: "available",
        total_donations: 0,
      },
    });

    res.status(201).json({
      id: donor.legacy_id,
      name: donor.donor_name,
      bloodGroup: donor.blood_group,
      phone: donor.phone,
      city: donor.city,
      lat: donor.latitude == null ? null : Number(donor.latitude),
      lng: donor.longitude == null ? null : Number(donor.longitude),
      status: donor.availability_status,
      lastDonation: null,
      donations: donor.total_donations,
    });
  } catch (error) {
    console.error("Failed to create donor:", error);
    res.status(500).json({ error: "Failed to create donor" });
  }
});

app.patch("/api/donors/:id", async (req, res) => {
  try {
    const allowedFields = {
      name: "donor_name",
      bloodGroup: "blood_group",
      phone: "phone",
      city: "city",
      state: "state",
      lat: "latitude",
      lng: "longitude",
      gender: "gender",
      age: "age",
      weightKg: "weight_kg",
      status: "availability_status",
      donations: "total_donations",
      lastDonation: "last_donation_date",
      registeredOn: "registered_on",
    };

    const data = {};

    for (const [key, value] of Object.entries(req.body)) {
      const field = allowedFields[key];

      if (field) {
        if (key === "lat" || key === "lng") {
          data[field] = value == null ? null : Number(value);
        } else if (key === "weightKg") {
          data[field] = value == null ? null : Number(value);
        } else if (key === "lastDonation" || key === "registeredOn") {
          data[field] = value ? new Date(`${value}T00:00:00.000Z`) : null;
        } else {
          data[field] = value;
        }
      }
    }

    const donor = await prisma.donor_directory.update({
      where: { legacy_id: req.params.id },
      data,
    });

    res.json({
      id: donor.legacy_id,
      name: donor.donor_name,
      bloodGroup: donor.blood_group,
      phone: donor.phone,
      city: donor.city,
      state: donor.state,
      lat: donor.latitude == null ? null : Number(donor.latitude),
      lng: donor.longitude == null ? null : Number(donor.longitude),
      gender: donor.gender,
      age: donor.age,
      weightKg: donor.weight_kg == null ? null : Number(donor.weight_kg),
      status: donor.availability_status,
      donations: donor.total_donations,
      lastDonation: donor.last_donation_date
        ? new Date(donor.last_donation_date).toISOString().slice(0, 10)
        : null,
      registeredOn: donor.registered_on
        ? new Date(donor.registered_on).toISOString().slice(0, 10)
        : null,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Donor not found" });
    }

    console.error("Failed to update donor:", error);
    res.status(500).json({ error: "Failed to update donor" });
  }
});

app.delete("/api/donors/:id", async (req, res) => {
  try {
    await prisma.donor_directory.delete({
      where: {
        legacy_id: req.params.id,
      },
    });

    res.json({ deleted: true });
  } catch (error) {
    if (error.code === "P2025") {
      return res.json({ deleted: false });
    }

    console.error("Failed to delete donor:", error);
    res.status(500).json({ error: "Failed to delete donor" });
  }
});

// ================= DONOR ELIGIBILITY =================

app.get("/api/eligibility/questions", (req, res) => {
  res.json(getQuestionnaire());
});

app.post("/api/eligibility/check", (req, res) => {
  const result = checkEligibility(req.body);

  if (result.errors) {
    return res.status(400).json({ error: result.errors.join("; ") });
  }

  res.json(result);
});

// ================= EMERGENCY REQUESTS =================

app.get("/api/requests", async (req, res) => {
  try {
    const where = {};

    if (req.query.status) {
      where.request_status = req.query.status;
    }

    if (req.query.urgency) {
      where.urgency = req.query.urgency;
    }

    const records = await prisma.blood_requests.findMany({
      where,
      include: {
        blood_groups: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const requests = records.map((r) => ({
      id: r.legacy_id,
      patientName: r.patient_name,
      bloodGroup: r.blood_groups.group_name,
      unitsNeeded: r.units_required,
      hospital: r.hospital_name,
      city: r.city,
      lat: r.latitude == null ? null : Number(r.latitude),
      lng: r.longitude == null ? null : Number(r.longitude),
      urgency: r.urgency,
      contact: r.contact_number,
      status: r.request_status,
      createdAt: r.created_at.toISOString(),
    }));

    res.json(requests);
  } catch (error) {
    console.error("Failed to fetch requests:", error);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

app.post("/api/requests", async (req, res) => {
  try {
    const {
      patientName,
      bloodGroup,
      unitsNeeded,
      hospital,
      city,
      lat,
      lng,
      urgency,
      contact,
    } = req.body;

    if (!patientName || !bloodGroup || !hospital || !contact) {
      return res.status(400).json({
        error: "patientName, bloodGroup, hospital and contact are required",
      });
    }

    const group = await prisma.blood_groups.findFirst({
      where: { group_name: bloodGroup },
    });

    if (!group) {
      return res.status(400).json({ error: "Invalid blood group" });
    }

    const request = await prisma.blood_requests.create({
      data: {
        legacy_id: id(),
        patient_name: patientName,
        blood_group_id: group.blood_group_id,
        units_required: Number(unitsNeeded || 1),
        hospital_name: hospital,
        city: city || "",
        latitude: lat ?? null,
        longitude: lng ?? null,
        urgency: urgency || "urgent",
        contact_number: contact,
        request_status: "open",
      },
      include: {
        blood_groups: true,
      },
    });

    const formattedRequest = {
      id: request.legacy_id,
      patientName: request.patient_name,
      bloodGroup: request.blood_groups.group_name,
      unitsNeeded: request.units_required,
      hospital: request.hospital_name,
      city: request.city,
      lat: request.latitude == null ? null : Number(request.latitude),
      lng: request.longitude == null ? null : Number(request.longitude),
      urgency: request.urgency,
      contact: request.contact_number,
      status: request.request_status,
      createdAt: request.created_at.toISOString(),
    };

    const allowed = COMPATIBILITY[bloodGroup] || [bloodGroup];

    const donorRecords = await prisma.donor_directory.findMany({
      where: {
        availability_status: "available",
        blood_group: { in: allowed },
      },
    });

    let matches = donorRecords.map((d) => {
      const donorLat = d.latitude == null ? null : Number(d.latitude);
      const donorLng = d.longitude == null ? null : Number(d.longitude);

      const distance =
        lat != null && lng != null && donorLat != null && donorLng != null
          ? distanceKm(Number(lat), Number(lng), donorLat, donorLng)
          : null;

      return {
        id: d.legacy_id,
        name: d.donor_name,
        gender: d.gender,
        age: d.age,
        weightKg: d.weight_kg == null ? null : Number(d.weight_kg),
        bloodGroup: d.blood_group,
        phone: d.phone,
        city: d.city,
        state: d.state,
        lat: donorLat,
        lng: donorLng,
        lastDonation: d.last_donation_date
          ? new Date(d.last_donation_date).toISOString().slice(0, 10)
          : null,
        donations: d.total_donations,
        status: d.availability_status,
        registeredOn: d.registered_on
          ? new Date(d.registered_on).toISOString().slice(0, 10)
          : null,
        distanceKm: distance !== null ? Math.round(distance * 10) / 10 : null,
      };
    });

    if (lat != null && lng != null) {
      matches.sort(
        (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
      );
    }

    res.status(201).json({
      request: formattedRequest,
      matchedDonors: matches.slice(0, 10),
    });
  } catch (error) {
    console.error("Failed to create request:", error);
    res.status(500).json({ error: "Failed to create request" });
  }
});

// Update an emergency request and record the donor's donation when fulfilled.
app.patch("/api/requests/:id", async (req, res) => {
  try {
    const { status, donorId } = req.body;

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const existingRequest = await tx.blood_requests.findUnique({
        where: { legacy_id: req.params.id },
      });

      if (!existingRequest) {
        throw new Error("REQUEST_NOT_FOUND");
      }

      if (
        status === "fulfilled" &&
        existingRequest.request_status !== "fulfilled" &&
        donorId
      ) {
        const donor = await tx.donor_directory.findUnique({
          where: { legacy_id: donorId },
        });

        if (!donor) {
          throw new Error("DONOR_NOT_FOUND");
        }

        await tx.donor_directory.update({
          where: { legacy_id: donorId },
          data: {
            total_donations: { increment: 1 },
            last_donation_date: new Date(),
            availability_status: "unavailable",
          },
        });
      }

      return tx.blood_requests.update({
        where: { legacy_id: req.params.id },
        data: {
          ...(status !== undefined ? { request_status: status } : {}),
        },
        include: {
          blood_groups: true,
        },
      });
    });

    res.json({
      id: updatedRequest.legacy_id,
      patientName: updatedRequest.patient_name,
      bloodGroup: updatedRequest.blood_groups.group_name,
      unitsNeeded: updatedRequest.units_required,
      hospital: updatedRequest.hospital_name,
      city: updatedRequest.city,
      lat:
        updatedRequest.latitude == null
          ? null
          : Number(updatedRequest.latitude),
      lng:
        updatedRequest.longitude == null
          ? null
          : Number(updatedRequest.longitude),
      urgency: updatedRequest.urgency,
      contact: updatedRequest.contact_number,
      status: updatedRequest.request_status,
      createdAt: updatedRequest.created_at.toISOString(),
    });
  } catch (error) {
    if (error.message === "REQUEST_NOT_FOUND" || error.code === "P2025") {
      return res.status(404).json({ error: "Request not found" });
    }

    if (error.message === "DONOR_NOT_FOUND") {
      return res.status(404).json({ error: "Donor not found" });
    }

    console.error("Failed to update request:", error);
    res.status(500).json({ error: "Failed to update request" });
  }
});

// ================= BLOOD BANKS =================

app.get("/api/bloodbanks", async (req, res) => {
  try {
    const banks = await prisma.blood_banks.findMany({
      orderBy: {
        bank_name: "asc",
      },
    });

    const formattedBanks = banks.map((bank) => ({
      id: bank.legacy_id,
      name: bank.bank_name,
      city: bank.city,
      state: bank.state,
      address: bank.address,
      lat: bank.latitude == null ? null : Number(bank.latitude),
      lng: bank.longitude == null ? null : Number(bank.longitude),
      phone: bank.phone,
    }));

    res.json(formattedBanks);
  } catch (error) {
    console.error("Failed to fetch blood banks:", error);
    res.status(500).json({ error: "Failed to fetch blood banks" });
  }
});

// ================= APPOINTMENTS =================

app.use("/api/appointments", require("./appointments")(prisma));
// ================= DASHBOARD =================
// Dashboard statistics powered by Neon PostgreSQL through Prisma.

app.get("/api/stats", async (req, res) => {
  try {
    const [donors, requests] = await Promise.all([
      prisma.donor_directory.findMany({
        select: {
          blood_group: true,
          availability_status: true,
          total_donations: true,
        },
      }),

      prisma.blood_requests.findMany({
        select: {
          request_status: true,
          urgency: true,
        },
      }),
    ]);

    const totalDonors = donors.length;

    const availableDonors = donors.filter(
      (donor) => donor.availability_status === "available",
    ).length;

    const totalRequests = requests.length;

    const openRequests = requests.filter(
      (request) => request.request_status === "open",
    ).length;

    const criticalRequests = requests.filter(
      (request) =>
        request.request_status === "open" && request.urgency === "critical",
    ).length;

    const totalDonations = donors.reduce(
      (sum, donor) => sum + (donor.total_donations || 0),
      0,
    );

    const byGroup = {};

    donors
      .filter((donor) => donor.availability_status === "available")
      .forEach((donor) => {
        const group = donor.blood_group;

        byGroup[group] = (byGroup[group] || 0) + 1;
      });

    res.json({
      totalDonors,
      availableDonors,
      totalRequests,
      openRequests,
      criticalRequests,
      totalDonations,
      byGroup,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard statistics:", error);
    res.status(500).json({
      error: "Failed to fetch dashboard statistics",
    });
  }
});

// ================= SERVE REACT BUILD =================

if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));

  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(DIST_PATH, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send(
      "BloodBridge API is running. The React client isn't built yet — run `npm run dev` for local development (client on :5173, API on :3000), or `npm run build && npm start` for production.",
    );
  });
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n  BloodBridge API running -> http://localhost:${PORT}\n`);
});
