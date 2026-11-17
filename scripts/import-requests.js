require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, "..", "data", "db.json");
  const db = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const requests = db.requests || [];

  if (requests.length !== 16) {
    throw new Error(`Expected 16 requests, found ${requests.length}`);
  }

  const ids = requests.map((request) => request.id);

  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate request IDs found.");
  }

  const bloodGroups = await prisma.blood_groups.findMany();

  const groupMap = new Map(
    bloodGroups.map((group) => [group.group_name, group.blood_group_id]),
  );

  for (const request of requests) {
    if (
      !request.id ||
      !request.patientName ||
      !request.bloodGroup ||
      !request.unitsNeeded ||
      !request.hospital ||
      !request.city ||
      !request.contact
    ) {
      throw new Error(`Invalid request: ${JSON.stringify(request)}`);
    }

    if (!groupMap.has(request.bloodGroup)) {
      throw new Error(`Blood group not found: ${request.bloodGroup}`);
    }

    if (
      ![
        "open",
        "pending",
        "approved",
        "partially_fulfilled",
        "fulfilled",
        "rejected",
        "cancelled",
      ].includes(request.status)
    ) {
      throw new Error(`Invalid status: ${request.status}`);
    }

    if (
      !["low", "normal", "high", "critical", "urgent"].includes(request.urgency)
    ) {
      throw new Error(`Invalid urgency: ${request.urgency}`);
    }

    if (!Number.isInteger(request.unitsNeeded) || request.unitsNeeded <= 0) {
      throw new Error(`Invalid units for request: ${request.id}`);
    }

    if (Number.isNaN(new Date(request.createdAt).getTime())) {
      throw new Error(`Invalid creation date: ${request.id}`);
    }
  }

  console.log("Existing Neon requests:", await prisma.blood_requests.count());
  console.log("JSON requests:", requests.length);

  const result = await prisma.blood_requests.createMany({
    data: requests.map((request) => ({
      legacy_id: request.id,
      patient_name: request.patientName,
      blood_group_id: groupMap.get(request.bloodGroup),
      units_required: request.unitsNeeded,
      hospital_name: request.hospital,
      city: request.city,
      latitude: request.lat ?? null,
      longitude: request.lng ?? null,
      urgency: request.urgency,
      request_status: request.status,
      contact_number: request.contact,
      created_at: new Date(request.createdAt),
    })),
    skipDuplicates: true,
  });

  console.log("\nBlood-request import completed.");
  console.log("New records inserted:", result.count);
  console.log("Records skipped:", requests.length - result.count);
  console.log("Total Neon requests:", await prisma.blood_requests.count());
}

main()
  .catch((error) => {
    console.error("Request import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
