// Donor eligibility rules for whole-blood donation.
//
// Thresholds follow commonly used Indian donor-selection guidelines (NBTC / Drugs & Cosmetics Rules),
// simplified for a demo app. Final eligibility is always decided by the blood bank's medical
// screening, so keep the numbers below in ONE place and have them reviewed before real-world use.

const LIMITS = {
  minAge: 18,
  maxAge: 65,
  minWeightKg: 45,
  minHemoglobin: 12.5, // g/dL
  intervalDays: { male: 90, female: 120, other: 120 }, // gap between whole-blood donations
};

// Conditions that permanently rule a person out.
const PERMANENT_CONDITIONS = [
  { id: "hivAids", label: "HIV / AIDS" },
  { id: "hepatitis", label: "Hepatitis B or C, or liver disease" },
  { id: "cancer", label: "Cancer (any type)" },
  { id: "heartDisease", label: "Heart disease" },
  { id: "epilepsy", label: "Epilepsy or recurring seizures" },
  { id: "insulinDiabetes", label: "Diabetes treated with insulin" },
  { id: "asthma", label: "Chronic Bronchial Asthma" },
  { id: "alzheimers", label: "Alzheimer's Disease" },
];

// Conditions that defer donation for a while. `wait` is shown to the donor.
const TEMPORARY_CONDITIONS = [
  {
    id: "recentIllness",
    label: "Fever, cold, flu or infection in the last 2 weeks",
    wait: "until fully recovered (at least 2 weeks)",
  },
  {
    id: "antibiotics",
    label: "Currently taking antibiotics or finished a course in the last week",
    wait: "7 days after the course ends",
  },
  {
    id: "alcohol24h",
    label: "Consumed alcohol in the last 24 hours",
    wait: "24 hours after your last drink",
  },
  {
    id: "tattooPiercing",
    label: "Tattoo, piercing or acupuncture in the last 6 months",
    wait: "6 months from the procedure",
  },
  {
    id: "majorSurgery",
    label: "Major surgery or blood transfusion in the last 12 months",
    wait: "12 months from the surgery or transfusion",
  },
  {
    id: "vaccination",
    label: "Received a vaccination in the last 4 weeks",
    wait: "4 weeks from the vaccination",
  },
  {
    id: "malaria",
    label: "Had malaria in the last 3 months",
    wait: "3 months from recovery",
  },
  {
    id: "pregnancy",
    label:
      "Pregnant, breastfeeding, or gave birth / miscarried in the last 12 months",
    wait: "12 months after delivery or when you stop breastfeeding",
    femaleOnly: true,
  },
  { id: "dengue", label: "Dengue Hemorrhagic Fever" },
  { id: "diarrhea", label: "Gastroenteritis" },
];

const DISCLAIMER =
  "This is a self-screening guide, not a medical decision. A doctor at the donation centre makes the final call.";

const GENDERS = ["male", "female", "other"];
const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcDay(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function parseIsoDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(ms) ? null : ms;
}

function formatDay(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

// Returns { value } with cleaned input, or { errors: [...] }.
function validateInput(input = {}) {
  const errors = [];

  const age = Number(input.age);
  if (!Number.isInteger(age) || age < 1 || age > 120)
    errors.push("age must be a whole number between 1 and 120");

  const weight = Number(input.weight);
  if (!(weight >= 20 && weight <= 300))
    errors.push("weight (kg) must be a number between 20 and 300");

  const gender = String(input.gender || "").toLowerCase();
  if (!GENDERS.includes(gender))
    errors.push(`gender must be one of: ${GENDERS.join(", ")}`);

  let hemoglobin = null;
  if (
    input.hemoglobin !== undefined &&
    input.hemoglobin !== null &&
    input.hemoglobin !== ""
  ) {
    hemoglobin = Number(input.hemoglobin);
    if (!(hemoglobin >= 3 && hemoglobin <= 25))
      errors.push("hemoglobin (g/dL) must be a number between 3 and 25");
  }

  let lastDonationMs = null;
  if (input.lastDonation) {
    lastDonationMs = parseIsoDay(input.lastDonation);
    if (lastDonationMs === null)
      errors.push("lastDonation must be a date in YYYY-MM-DD format");
  }

  const conditions = input.conditions === undefined ? [] : input.conditions;
  const known = new Set(
    [...PERMANENT_CONDITIONS, ...TEMPORARY_CONDITIONS].map((c) => c.id),
  );
  if (!Array.isArray(conditions) || conditions.some((c) => !known.has(c))) {
    errors.push("conditions must be an array of known condition ids");
  }

  if (errors.length) return { errors };
  return {
    value: {
      age,
      weight,
      gender,
      hemoglobin,
      lastDonationMs,
      conditions: new Set(conditions),
    },
  };
}

// Pure function: no I/O, `today` is injectable so it can be tested.
function checkEligibility(input, today = new Date()) {
  const { value, errors } = validateInput(input);
  if (errors) return { errors };

  const { age, weight, gender, hemoglobin, lastDonationMs, conditions } = value;
  const todayMs = toUtcDay(today);
  const reasons = [];
  const notes = [];
  let nextEligibleMs = null;

  const add = (type, code, message) => reasons.push({ type, code, message });

  // Age
  if (age < LIMITS.minAge)
    add(
      "temporary",
      "age_low",
      `You must be at least ${LIMITS.minAge} years old to donate.`,
    );
  if (age > LIMITS.maxAge)
    add("permanent", "age_high", `Donors must be ${LIMITS.maxAge} or younger.`);

  // Weight
  if (weight < LIMITS.minWeightKg) {
    add(
      "temporary",
      "weight_low",
      `You must weigh at least ${LIMITS.minWeightKg} kg (you entered ${weight} kg).`,
    );
  }

  // Hemoglobin (optional: it is measured again at the centre anyway)
  if (hemoglobin === null) {
    notes.push("Hemoglobin not provided. It will be tested before you donate.");
  } else if (hemoglobin < LIMITS.minHemoglobin) {
    add(
      "temporary",
      "hemoglobin_low",
      `Hemoglobin must be at least ${LIMITS.minHemoglobin} g/dL (you entered ${hemoglobin}).`,
    );
  }

  // Gap since last donation
  if (lastDonationMs !== null) {
    if (lastDonationMs > todayMs) {
      return { errors: ["lastDonation cannot be in the future"] };
    }
    const interval = LIMITS.intervalDays[gender];
    const nextMs = lastDonationMs + interval * DAY_MS;
    if (nextMs > todayMs) {
      const daysLeft = Math.ceil((nextMs - todayMs) / DAY_MS);
      nextEligibleMs = nextMs;
      add(
        "temporary",
        "donation_gap",
        `You need ${interval} days between donations. You can donate again on ${formatDay(nextMs)} (${daysLeft} day${daysLeft === 1 ? "" : "s"} to go).`,
      );
    }
  }

  // Permanent conditions
  for (const c of PERMANENT_CONDITIONS) {
    if (conditions.has(c.id))
      add("permanent", c.id, `${c.label} permanently rules out donation.`);
  }

  // Temporary conditions
  for (const c of TEMPORARY_CONDITIONS) {
    if (!conditions.has(c.id)) continue;
    if (c.femaleOnly && gender === "male") continue; // ignore an inapplicable answer
    add("temporary", c.id, `Please wait ${c.wait}.`);
  }

  const hasPermanent = reasons.some((r) => r.type === "permanent");
  const status = hasPermanent
    ? "not_eligible"
    : reasons.length
      ? "deferred"
      : "eligible";

  return {
    eligible: status === "eligible",
    status,
    reasons,
    notes,
    nextEligibleDate:
      hasPermanent || nextEligibleMs === null
        ? null
        : formatDay(nextEligibleMs),
    disclaimer: DISCLAIMER,
  };
}

// What the client needs to render the questionnaire, so the rules live in one place.
function getQuestionnaire() {
  return {
    limits: LIMITS,
    permanent: PERMANENT_CONDITIONS.map(({ id, label }) => ({ id, label })),
    temporary: TEMPORARY_CONDITIONS.map(({ id, label, femaleOnly }) => ({
      id,
      label,
      femaleOnly: !!femaleOnly,
    })),
    genders: GENDERS,
    disclaimer: DISCLAIMER,
  };
}

module.exports = { checkEligibility, getQuestionnaire, LIMITS };
