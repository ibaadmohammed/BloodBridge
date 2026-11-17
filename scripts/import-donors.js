require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

function parseDate(value) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date;
}

async function main() {
  const filePath = path.join(__dirname, "..", "data", "db.json");
  const db = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const donors = db.donors || [];

  if (donors.length !== 61) {
    throw new Error(`Expected 61 donors, found ${donors.length}`);
  }

  const ids = donors.map((donor) => donor.id);

  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate donor IDs found.");
  }

  for (const donor of donors) {
    if (!donor.id || !donor.name || !donor.bloodGroup ||
        !donor.phone || !donor.city) {
      throw new Error(`Invalid donor record: ${JSON.stringify(donor)}`);
    }

    if (!["available", "unavailable", "temporarily_deferred"].includes(donor.status)) {
      throw new Error(`Invalid donor status for ${donor.id}: ${donor.status}`);
    }
  }

  const existing = await prisma.donor_directory.count();

  console.log("Existing Neon donors:", existing);
  console.log("JSON donors:", donors.length);

  const result = await prisma.donor_directory.createMany({
    data: donors.map((donor) => ({
      legacy_id: donor.id,
      donor_name: donor.name,
      blood_group: donor.bloodGroup,
      phone: donor.phone,
      city: donor.city,
      state: donor.state ?? null,
      latitude: donor.lat ?? null,
      longitude: donor.lng ?? null,
      availability_status: donor.status,
      last_donation_date: parseDate(donor.lastDonation),
      total_donations: donor.donations ?? 0,
      gender: donor.gender ?? null,
      age: donor.age ?? null,
      weight_kg: donor.weightKg ?? null,
      registered_on: parseDate(donor.registeredOn),
    })),
    skipDuplicates: true,
  });

  const finalCount = await prisma.donor_directory.count();

  console.log("\nDonor import completed.");
  console.log("New records inserted:", result.count);
  console.log("Records skipped:", donors.length - result.count);
  console.log("Total Neon donors:", finalCount);
}

main()
  .catch((error) => {
    console.error("Donor import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
