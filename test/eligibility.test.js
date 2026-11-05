const test = require("node:test");
const assert = require("node:assert");
const { checkEligibility } = require("../eligibility");

const TODAY = new Date("2026-11-05T10:00:00Z");
const base = { age: 28, weight: 62, gender: "male", hemoglobin: 14, conditions: [] };
const check = (overrides) => checkEligibility({ ...base, ...overrides }, TODAY);
const codes = (r) => r.reasons.map((x) => x.code);

test("healthy adult is eligible", () => {
  const r = check({});
  assert.strictEqual(r.status, "eligible");
  assert.strictEqual(r.eligible, true);
  assert.deepStrictEqual(r.reasons, []);
});

test("age limits", () => {
  assert.deepStrictEqual(codes(check({ age: 17 })), ["age_low"]);
  assert.strictEqual(check({ age: 17 }).status, "deferred");
  assert.strictEqual(check({ age: 18 }).status, "eligible");
  assert.strictEqual(check({ age: 65 }).status, "eligible");
  assert.strictEqual(check({ age: 66 }).status, "not_eligible");
});

test("weight and hemoglobin thresholds", () => {
  assert.deepStrictEqual(codes(check({ weight: 44.9 })), ["weight_low"]);
  assert.strictEqual(check({ weight: 45 }).status, "eligible");
  assert.deepStrictEqual(codes(check({ hemoglobin: 12.4 })), ["hemoglobin_low"]);
  assert.strictEqual(check({ hemoglobin: 12.5 }).status, "eligible");
});

test("missing hemoglobin adds a note, not a rejection", () => {
  const r = check({ hemoglobin: "" });
  assert.strictEqual(r.status, "eligible");
  assert.strictEqual(r.notes.length, 1);
});

test("donation gap differs by gender and gives the next date", () => {
  // 60 days ago: too soon for everyone
  const r = check({ lastDonation: "2026-09-06" });
  assert.deepStrictEqual(codes(r), ["donation_gap"]);
  assert.strictEqual(r.nextEligibleDate, "2026-12-05");

  // 100 days ago: fine for men (90), too soon for women (120)
  assert.strictEqual(check({ lastDonation: "2026-07-27" }).status, "eligible");
  const f = check({ gender: "female", lastDonation: "2026-07-27" });
  assert.strictEqual(f.status, "deferred");
  assert.strictEqual(f.nextEligibleDate, "2026-11-24");
});

test("exactly on the eligible day is allowed", () => {
  assert.strictEqual(check({ lastDonation: "2026-08-07" }).status, "eligible"); // +90 days = 2026-11-05
});

test("permanent conditions win over temporary ones", () => {
  const r = check({ conditions: ["cancer", "recentIllness"], lastDonation: "2026-10-30" });
  assert.strictEqual(r.status, "not_eligible");
  assert.strictEqual(r.nextEligibleDate, null);
  assert.ok(codes(r).includes("cancer"));
});

test("temporary conditions defer", () => {
  const r = check({ conditions: ["tattooPiercing", "alcohol24h"] });
  assert.strictEqual(r.status, "deferred");
  assert.deepStrictEqual(codes(r), ["alcohol24h", "tattooPiercing"]);
});

test("pregnancy answer is ignored for male donors", () => {
  assert.strictEqual(check({ conditions: ["pregnancy"] }).status, "eligible");
  assert.strictEqual(check({ gender: "female", conditions: ["pregnancy"] }).status, "deferred");
});

test("invalid input returns errors", () => {
  assert.ok(checkEligibility({}, TODAY).errors.length > 0);
  assert.ok(check({ gender: "x" }).errors);
  assert.ok(check({ conditions: ["nope"] }).errors);
  assert.ok(check({ lastDonation: "05-11-2026" }).errors);
  assert.ok(check({ lastDonation: "2027-01-01" }).errors);
});
