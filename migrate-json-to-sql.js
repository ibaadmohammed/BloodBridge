const fs = require("fs");
const path = require("path");
const pool = require("./db");

const FILE_PATH = path.join(__dirname, "data", "db.json");

async function migrate() {
  const client = await pool.connect();

  try {
    // Read the existing JSON database
    const data = JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));

    console.log("Starting BloodBridge migration...");

    await client.query("BEGIN");

    // 1. Get blood group IDs from PostgreSQL
    const groupsResult = await client.query(
      "SELECT blood_group_id, group_name FROM blood_groups",
    );

    const bloodGroups = new Map(
      groupsResult.rows.map((row) => [
        row.group_name.trim().toUpperCase(),
        row.blood_group_id,
      ]),
    );

    function getBloodGroupId(group) {
      const id = bloodGroups.get(group.trim().toUpperCase());

      if (!id) {
        throw new Error(`Blood group not found in PostgreSQL: ${group}`);
      }

      return id;
    }

    // 2. Migrate donors
    for (const donor of data.donors || []) {
      await client.query(
        `INSERT INTO donor_directory
        (legacy_id, donor_name, blood_group, phone, city,
         latitude, longitude, availability_status,
         last_donation_date, total_donations)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (legacy_id) DO UPDATE SET
           donor_name = EXCLUDED.donor_name,
           blood_group = EXCLUDED.blood_group,
           phone = EXCLUDED.phone,
           city = EXCLUDED.city,
           latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude,
           availability_status = EXCLUDED.availability_status,
           last_donation_date = EXCLUDED.last_donation_date,
           total_donations = EXCLUDED.total_donations`,
        [
          donor.id,
          donor.name,
          donor.bloodGroup,
          donor.phone,
          donor.city,
          donor.lat ?? null,
          donor.lng ?? null,
          donor.status || "available",
          donor.lastDonation || null,
          donor.donations ?? 0,
        ],
      );
    }

    console.log(`Donors processed: ${(data.donors || []).length}`);

    // 3. Migrate hospitals and blood banks
    for (const hospital of data.bloodBanks || []) {
      await client.query(
        `INSERT INTO hospitals
        (legacy_id, hospital_name, phone, address, city,
         latitude, longitude, is_verified, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (legacy_id) DO UPDATE SET
           hospital_name = EXCLUDED.hospital_name,
           phone = EXCLUDED.phone,
           address = EXCLUDED.address,
           city = EXCLUDED.city,
           latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude,
           is_active = EXCLUDED.is_active`,
        [
          hospital.id,
          hospital.name,
          hospital.phone || null,
          "Not provided in source JSON",
          hospital.city,
          hospital.lat ?? null,
          hospital.lng ?? null,
          false,
          true,
        ],
      );
    }

    console.log(`Hospitals processed: ${(data.bloodBanks || []).length}`);

    // 4. Migrate blood requests
    for (const request of data.requests || []) {
      await client.query(
        `INSERT INTO blood_requests
        (legacy_id, patient_name, blood_group_id, units_required,
         urgency, request_status, contact_number, hospital_name,
         city, latitude, longitude, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (legacy_id) DO UPDATE SET
           patient_name = EXCLUDED.patient_name,
           blood_group_id = EXCLUDED.blood_group_id,
           units_required = EXCLUDED.units_required,
           urgency = EXCLUDED.urgency,
           request_status = EXCLUDED.request_status,
           contact_number = EXCLUDED.contact_number,
           hospital_name = EXCLUDED.hospital_name,
           city = EXCLUDED.city,
           latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude,
           created_at = EXCLUDED.created_at`,
        [
          request.id,
          request.patientName,
          getBloodGroupId(request.bloodGroup),
          request.unitsNeeded,
          request.urgency,
          request.status || "open",
          request.contact || null,
          request.hospital || null,
          request.city || null,
          request.lat ?? null,
          request.lng ?? null,
          request.createdAt ? new Date(request.createdAt) : new Date(),
        ],
      );
    }

    console.log(`Requests processed: ${(data.requests || []).length}`);

    await client.query("COMMIT");

    console.log("\nMigration completed successfully!");
    console.log("18 donors, 22 requests and 50 hospitals expected.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed. Changes rolled back.");
    console.error(error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
