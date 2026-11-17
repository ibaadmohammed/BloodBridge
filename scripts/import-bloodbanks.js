require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, "..", "data", "db.json");
  const db = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const banks = db.bloodBanks || [];

  if (banks.length !== 150) {
    throw new Error(`Expected 150 blood banks, found ${banks.length}`);
  }

  const ids = banks.map((bank) => bank.id);

  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate blood-bank IDs found in JSON.");
  }

  for (const bank of banks) {
    if (!bank.id || !bank.name || !bank.city) {
      throw new Error(`Invalid blood-bank record: ${JSON.stringify(bank)}`);
    }
  }

  const existing = await prisma.blood_banks.count();

  console.log("Existing Neon blood banks:", existing);
  console.log("JSON blood banks:", banks.length);

  const result = await prisma.blood_banks.createMany({
    data: banks.map((bank) => ({
      legacy_id: bank.id,
      bank_name: bank.name,
      city: bank.city,
      state: bank.state ?? null,
      address: bank.address ?? null,
      latitude: bank.lat ?? null,
      longitude: bank.lng ?? null,
      phone: bank.phone ?? null,
    })),
    skipDuplicates: true,
  });

  const finalCount = await prisma.blood_banks.count();

  console.log("\nImport completed.");
  console.log("New records inserted:", result.count);
  console.log("Records skipped:", banks.length - result.count);
  console.log("Total Neon blood banks:", finalCount);
}

main()
  .catch((error) => {
    console.error("Import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
