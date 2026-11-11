const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const pool = require("./db");
const { checkEligibility, getQuestionnaire } = require("./eligibility");

const DIST_PATH = path.join(__dirname, "dist");

const app = express();
app.use(cors());
app.use(express.json());

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
  if ([lat1, lng1, lat2, lng2].some((v) => v == null)) return null;

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

const id = () => crypto.randomUUID();

// ---------- Format database records ----------

function formatDonor(row) {
  return {
    id: row.legacy_id,
    name: row.donor_name,
    bloodGroup: row.blood_group,
    phone: row.phone,
    city: row.city,
    lat: row.latitude == null ? null : Number(row.latitude),
    lng: row.longitude == null ? null : Number(row.longitude),
    status: row.availability_status,
    lastDonation: row.last_donation_date,
    donations: row.total_donations,
  };
}

function formatRequest(row) {
  return {
    id: row.legacy_id,
    patientName: row.patient_name,
    bloodGroup: row.blood_group,
    unitsNeeded: row.units_required,
    hospital: row.hospital_name,
    city: row.city || "",
    lat: row.latitude == null ? null : Number(row.latitude),
    lng: row.longitude == null ? null : Number(row.longitude),
    urgency: row.urgency,
    contact: row.contact_number,
    status: row.request_status,
    createdAt: row.created_at,
  };
}

// ================= DONORS =================

// GET donors
app.get("/api/donors", async (req, res) => {
  try {
    const { bloodGroup, status, lat, lng, radius, compatibleWith } = req.query;

    let sql = "SELECT * FROM donor_directory WHERE 1=1";
    const params = [];

    if (bloodGroup) {
      params.push(bloodGroup);
      sql += ` AND blood_group = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND availability_status = $${params.length}`;
    }

    if (compatibleWith) {
      const allowed = COMPATIBILITY[compatibleWith] || [];
      params.push(allowed);
      sql += ` AND blood_group = ANY($${params.length}::varchar[])`;
    }

    const result = await pool.query(sql, params);

    let donors = result.rows.map(formatDonor);

    const userLat = lat !== undefined ? Number(lat) : null;
    const userLng = lng !== undefined ? Number(lng) : null;
    const maxRadius = radius !== undefined ? Number(radius) : null;

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
      if (maxRadius !== null) {
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
    console.error("Donors error:", error);
    res.status(500).json({ error: "Unable to fetch donors" });
  }
});

// POST donor
app.post("/api/donors", async (req, res) => {
  try {
    const { name, bloodGroup, phone, city, lat, lng } = req.body;

    if (!name || !bloodGroup || !phone || !city) {
      return res.status(400).json({
        error: "name, bloodGroup, phone and city are required",
      });
    }

    const result = await pool.query(
      `INSERT INTO donor_directory
       (legacy_id, donor_name, blood_group, phone, city,
        latitude, longitude, availability_status,
        last_donation_date, total_donations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'available',NULL,0)
       RETURNING *`,
      [id(), name, bloodGroup, phone, city, lat ?? null, lng ?? null],
    );

    res.status(201).json(formatDonor(result.rows[0]));
  } catch (error) {
    console.error("Donor creation error:", error);
    res.status(500).json({ error: "Unable to create donor" });
  }
});

// PATCH donor
app.patch("/api/donors/:id", async (req, res) => {
  try {
    const fields = {
      name: "donor_name",
      bloodGroup: "blood_group",
      phone: "phone",
      city: "city",
      lat: "latitude",
      lng: "longitude",
      status: "availability_status",
      lastDonation: "last_donation_date",
      donations: "total_donations",
    };

    const updates = [];
    const values = [];

    for (const [key, column] of Object.entries(fields)) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        values.push(req.body[key]);
        updates.push(`${column} = $${values.length}`);
      }
    }

    if (!updates.length) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE donor_directory
       SET ${updates.join(", ")}
       WHERE legacy_id = $${values.length}
       RETURNING *`,
      values,
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Donor not found" });
    }

    res.json(formatDonor(result.rows[0]));
  } catch (error) {
    console.error("Donor update error:", error);
    res.status(500).json({ error: "Unable to update donor" });
  }
});

// DELETE donor
app.delete("/api/donors/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM donor_directory WHERE legacy_id = $1 RETURNING donor_id",
      [req.params.id],
    );

    res.json({ deleted: result.rowCount > 0 });
  } catch (error) {
    console.error("Donor deletion error:", error);
    res.status(500).json({ error: "Unable to delete donor" });
  }
});

// ================= ELIGIBILITY =================

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

// GET requests
app.get("/api/requests", async (req, res) => {
  try {
    let sql = `
      SELECT r.*, bg.group_name AS blood_group
      FROM blood_requests r
      JOIN blood_groups bg ON r.blood_group_id = bg.blood_group_id
      WHERE 1=1
    `;

    const params = [];

    if (req.query.status) {
      params.push(req.query.status);
      sql += ` AND r.request_status = $${params.length}`;
    }

    if (req.query.urgency) {
      params.push(req.query.urgency);
      sql += ` AND r.urgency = $${params.length}`;
    }

    sql += " ORDER BY r.created_at DESC";

    const result = await pool.query(sql, params);
    res.json(result.rows.map(formatRequest));
  } catch (error) {
    console.error("Requests error:", error);
    res.status(500).json({ error: "Unable to fetch requests" });
  }
});

// POST request
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

    const groupResult = await pool.query(
      "SELECT blood_group_id FROM blood_groups WHERE UPPER(group_name) = UPPER($1)",
      [bloodGroup],
    );

    if (!groupResult.rows.length) {
      return res.status(400).json({ error: "Invalid blood group" });
    }

    const requestResult = await pool.query(
      `INSERT INTO blood_requests
       (legacy_id, patient_name, blood_group_id, units_required,
        urgency, request_status, contact_number, hospital_name,
        city, latitude, longitude, created_at)
       VALUES ($1,$2,$3,$4,$5,'open',$6,$7,$8,$9,$10,NOW())
       RETURNING *`,
      [
        id(),
        patientName,
        groupResult.rows[0].blood_group_id,
        unitsNeeded || 1,
        urgency || "urgent",
        contact,
        hospital,
        city || null,
        lat ?? null,
        lng ?? null,
      ],
    );

    const request = formatRequest({
      ...requestResult.rows[0],
      blood_group: bloodGroup,
    });

    const allowed = COMPATIBILITY[bloodGroup] || [bloodGroup];

    const donorResult = await pool.query(
      `SELECT * FROM donor_directory
       WHERE availability_status = 'available'
       AND blood_group = ANY($1::varchar[])`,
      [allowed],
    );

    let matches = donorResult.rows.map(formatDonor);

    matches = matches.map((d) => ({
      ...d,
      distanceKm:
        lat != null && lng != null
          ? Math.round(distanceKm(lat, lng, d.lat, d.lng) * 10) / 10
          : null,
    }));

    if (lat != null && lng != null) {
      matches.sort(
        (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
      );
    }

    res.status(201).json({
      request,
      matchedDonors: matches.slice(0, 10),
    });
  } catch (error) {
    console.error("Request creation error:", error);
    res.status(500).json({ error: "Unable to create request" });
  }
});

// PATCH request
app.patch("/api/requests/:id", async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const fields = {
      patientName: "patient_name",
      unitsNeeded: "units_required",
      urgency: "urgency",
      status: "request_status",
      contact: "contact_number",
      hospital: "hospital_name",
      city: "city",
      lat: "latitude",
      lng: "longitude",
    };

    const updates = [];
    const values = [];

    if (req.body.bloodGroup) {
      const group = await client.query(
        "SELECT blood_group_id FROM blood_groups WHERE UPPER(group_name) = UPPER($1)",
        [req.body.bloodGroup],
      );

      if (!group.rows.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Invalid blood group" });
      }

      values.push(group.rows[0].blood_group_id);
      updates.push(`blood_group_id = $${values.length}`);
    }

    for (const [key, column] of Object.entries(fields)) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        values.push(req.body[key]);
        updates.push(`${column} = $${values.length}`);
      }
    }

    if (!updates.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "No valid fields to update" });
    }

    updates.push("updated_at = NOW()");
    values.push(req.params.id);

    const result = await client.query(
      `UPDATE blood_requests
       SET ${updates.join(", ")}
       WHERE legacy_id = $${values.length}
       RETURNING *`,
      values,
    );

    if (!result.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Request not found" });
    }

    if (req.body.status === "fulfilled" && req.body.donorId) {
      await client.query(
        `UPDATE donor_directory
         SET total_donations = COALESCE(total_donations, 0) + 1,
             last_donation_date = CURRENT_DATE,
             availability_status = 'unavailable'
         WHERE legacy_id = $1`,
        [req.body.donorId],
      );
    }

    const groupResult = await client.query(
      "SELECT group_name FROM blood_groups WHERE blood_group_id = $1",
      [result.rows[0].blood_group_id],
    );

    await client.query("COMMIT");

    res.json(
      formatRequest({
        ...result.rows[0],
        blood_group: groupResult.rows[0]?.group_name,
      }),
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Request update error:", error);
    res.status(500).json({ error: "Unable to update request" });
  } finally {
    client.release();
  }
});

// ================= BLOOD BANKS =================

app.get("/api/bloodbanks", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT legacy_id, hospital_id, hospital_name,
              phone, city, latitude, longitude
       FROM hospitals
       WHERE is_active = TRUE
       ORDER BY hospital_name`,
    );

    res.json(
      result.rows.map((row) => ({
        id: row.legacy_id || String(row.hospital_id),
        name: row.hospital_name,
        city: row.city,
        lat: row.latitude == null ? null : Number(row.latitude),
        lng: row.longitude == null ? null : Number(row.longitude),
        phone: row.phone,
      })),
    );
  } catch (error) {
    console.error("Blood banks error:", error);
    res.status(500).json({ error: "Unable to fetch blood banks" });
  }
});

// ================= APPOINTMENTS =================

app.use("/api/appointments", require("./appointments"));

// ================= DASHBOARD =================

app.get("/api/stats", async (req, res) => {
  try {
    const [donors, requests, donations, groups] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE availability_status = 'available'
          )::int AS available
        FROM donor_directory
      `),

      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE request_status = 'open'
          )::int AS open,
          COUNT(*) FILTER (
            WHERE request_status = 'open' AND urgency = 'critical'
          )::int AS critical
        FROM blood_requests
      `),

      pool.query(`
        SELECT COALESCE(SUM(total_donations), 0)::int AS total
        FROM donor_directory
      `),

      pool.query(`
        SELECT blood_group,
          COUNT(*) FILTER (
            WHERE availability_status = 'available'
          )::int AS available
        FROM donor_directory
        GROUP BY blood_group
      `),
    ]);

    const byGroup = {};

    groups.rows.forEach((row) => {
      byGroup[row.blood_group] = row.available;
    });

    res.json({
      totalDonors: donors.rows[0].total,
      availableDonors: donors.rows[0].available,
      totalRequests: requests.rows[0].total,
      openRequests: requests.rows[0].open,
      criticalRequests: requests.rows[0].critical,
      totalDonations: donations.rows[0].total,
      byGroup,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Unable to fetch statistics" });
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
      "BloodBridge API is running. Run npm run dev for the React client, or npm run build && npm start for production.",
    );
  });
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n BloodBridge API running -> http://localhost:${PORT}\n`);
});
