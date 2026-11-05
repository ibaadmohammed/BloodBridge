import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";

const STATUS_COPY = {
  eligible: { icon: "✅", title: "You're likely eligible to donate" },
  deferred: { icon: "⏳", title: "Not eligible right now" },
  not_eligible: { icon: "⛔", title: "You can't donate blood" },
};

function CheckList({ items, selected, onToggle }) {
  return (
    <div className="check-list">
      {items.map((item) => (
        <label key={item.id} className={`check-item ${selected.has(item.id) ? "checked" : ""}`}>
          <input type="checkbox" checked={selected.has(item.id)} onChange={() => onToggle(item.id)} />
          <span>{item.label}</span>
        </label>
      ))}
    </div>
  );
}

export default function Eligibility() {
  const toast = useToast();
  const resultRef = useRef(null);

  const [questions, setQuestions] = useState(null);
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState("");
  const [hemoglobin, setHemoglobin] = useState("");
  const [lastDonation, setLastDonation] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api
      .getEligibilityQuestions()
      .then(setQuestions)
      .catch((err) => toast(err.message, "error"));
  }, [toast]);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!gender) {
      toast("Please select your gender", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.checkEligibility({
        age: Number(age),
        weight: Number(weight),
        gender,
        hemoglobin: hemoglobin === "" ? undefined : Number(hemoglobin),
        lastDonation: lastDonation || undefined,
        conditions: [...selected],
      });
      setResult(res);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const today = new Date().toISOString().slice(0, 10);
  const temporary = questions?.temporary.filter((q) => !q.femaleOnly || gender !== "male") ?? [];

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="eyebrow" style={{ color: "var(--vital)" }}>
          DONOR ELIGIBILITY
        </div>
        <h1 style={{ fontSize: 34, marginBottom: 6 }}>Can I donate blood?</h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 15, marginBottom: 28 }}>
          Answer a few quick questions to find out if you can donate today, or when you can.
        </p>

        {result && !result.errors ? (
          <div ref={resultRef} className={`card elig-result ${result.status}`}>
            <div className="elig-result-head">
              <span className="elig-icon">{STATUS_COPY[result.status].icon}</span>
              <h2>{STATUS_COPY[result.status].title}</h2>
            </div>

            {result.reasons.length > 0 && (
              <ul className="elig-reasons">
                {result.reasons.map((r) => (
                  <li key={r.code}>{r.message}</li>
                ))}
              </ul>
            )}

            {result.status === "eligible" && (
              <p style={{ marginBottom: 12 }}>
                Nothing you told us rules you out. Register so patients nearby can reach you.
              </p>
            )}

            {result.nextEligibleDate && (
              <p style={{ marginBottom: 12 }}>
                <strong>Next possible donation date:</strong> {result.nextEligibleDate}
              </p>
            )}

            {result.notes.map((n) => (
              <p key={n} className="help" style={{ marginBottom: 8 }}>
                ℹ️ {n}
              </p>
            ))}

            <p className="help" style={{ margin: "12px 0 20px" }}>
              {result.disclaimer}
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {result.status === "eligible" && (
                <Link to="/register" className="btn btn-vital">
                  Register as a donor
                </Link>
              )}
              <button type="button" className="btn btn-outline" onClick={reset}>
                Check again
              </button>
            </div>
          </div>
        ) : (
          <form className="card" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <label>Age</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="e.g. 28"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Weight (kg)</label>
                <input
                  type="number"
                  min="20"
                  max="300"
                  step="0.1"
                  placeholder="e.g. 62"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field full">
              <label>Gender</label>
              <div className="bg-pill-group">
                {["male", "female", "other"].map((g) => (
                  <div
                    key={g}
                    className={`bg-pill ${gender === g ? "active" : ""}`}
                    onClick={() => setGender(g)}
                    style={{ textTransform: "capitalize" }}
                  >
                    {g}
                  </div>
                ))}
              </div>
              <span className="help">Used only for the donation-gap and pregnancy rules.</span>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Hemoglobin (g/dL) — optional</label>
                <input
                  type="number"
                  min="3"
                  max="25"
                  step="0.1"
                  placeholder="e.g. 13.5"
                  value={hemoglobin}
                  onChange={(e) => setHemoglobin(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Last donation date — optional</label>
                <input
                  type="date"
                  max={today}
                  value={lastDonation}
                  onChange={(e) => setLastDonation(e.target.value)}
                />
              </div>
            </div>

            {!questions ? (
              <p className="help" style={{ marginBottom: 20 }}>
                Loading questions…
              </p>
            ) : (
              <>
                <div className="field full">
                  <label>Does any of this apply to you right now?</label>
                  <CheckList items={temporary} selected={selected} onToggle={toggle} />
                </div>

                <div className="field full">
                  <label>Do you have any of these conditions?</label>
                  <CheckList items={questions.permanent} selected={selected} onToggle={toggle} />
                  <span className="help">Leave everything unticked if none apply.</span>
                </div>
              </>
            )}

            <button type="submit" className="btn btn-vital btn-block" disabled={submitting || !questions}>
              {submitting ? "Checking…" : "Check my eligibility"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
