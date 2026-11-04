import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import BloodGroupPicker from "../components/BloodGroupPicker.jsx";
import DonorRow from "../components/DonorRow.jsx";
import RequestRow from "../components/RequestRow.jsx";
import { CITIES, CITY_COORDS } from "../lib/helpers.js";

export default function Emergency() {
  const toast = useToast();

  const [patientName, setPatientName] = useState("");
  const [bloodGroup, setBloodGroup] = useState(null);
  const [units, setUnits] = useState(1);
  const [urgency, setUrgency] = useState("urgent");
  const [hospital, setHospital] = useState("");
  const [city, setCity] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [matches, setMatches] = useState(null); // null = not searched yet
  const [allRequests, setAllRequests] = useState([]);

  function loadAllRequests() {
    api
      .getRequests({ status: "open" })
      .then(setAllRequests)
      .catch(console.error);
  }

  useEffect(() => {
    loadAllRequests();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!bloodGroup) {
      toast("Please select the blood group needed", "error");
      return;
    }
    const coords = CITY_COORDS[city] || {};
    setSubmitting(true);
    try {
      const { matchedDonors } = await api.createRequest({
        patientName: patientName.trim(),
        bloodGroup,
        unitsNeeded: parseInt(units, 10) || 1,
        urgency,
        hospital: hospital.trim(),
        city,
        lat: coords.lat,
        lng: coords.lng,
        contact: contact.trim(),
      });
      toast("Emergency request sent! Matching donors below.");
      setMatches(matchedDonors);
      loadAllRequests();
      document.getElementById("matchResults")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="container">
          <div className="eyebrow" style={{ color: "var(--blood)" }}>
            <span className="pulse-dot"></span> EMERGENCY REQUEST
          </div>
          <h1 style={{ fontSize: 34, marginBottom: 6 }}>Need blood urgently?</h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 15, maxWidth: "60ch" }}>
            Submit the request below. We'll instantly surface compatible, available donors near the hospital —
            sorted by distance.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "flex-start" }}>
          <form className="card" onSubmit={handleSubmit}>
            <div className="field full">
              <label>Patient name</label>
              <input
                type="text"
                required
                placeholder="e.g. Suresh Kumar"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
              />
            </div>

            <div className="field full">
              <label>Blood group needed</label>
              <BloodGroupPicker value={bloodGroup} onChange={setBloodGroup} />
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Units needed</label>
                <input type="number" min="1" value={units} onChange={(e) => setUnits(e.target.value)} required />
              </div>
              <div className="field">
                <label>Urgency</label>
                <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                  <option value="critical">🔴 Critical — needed today</option>
                  <option value="urgent">🟠 Urgent — within 48 hrs</option>
                  <option value="scheduled">🟢 Scheduled — planned surgery</option>
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="field full">
                <label>Hospital / location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apollo Hospitals, Jubilee Hills"
                  value={hospital}
                  onChange={(e) => setHospital(e.target.value)}
                />
              </div>
              <div className="field">
                <label>City</label>
                <select value={city} onChange={(e) => setCity(e.target.value)} required>
                  <option value="">Select city</option>
                  {CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Contact number</label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? "Sending…" : "🚨 Send Emergency Request"}
            </button>
          </form>

          <div>
            <div className="section-head" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 18 }}>Matched donors</h2>
              <div className="sub" id="matchResults">
                {matches ? `${matches.length} compatible donor${matches.length === 1 ? "" : "s"} found` : "Submit the form to see matches"}
              </div>
            </div>
            <div className="donor-list">
              {matches === null && (
                <div className="empty-state">
                  <div className="display">No matches yet</div>Fill out the request to find compatible donors.
                </div>
              )}
              {matches && matches.length === 0 && (
                <div className="empty-state">
                  <div className="display">No available donors nearby yet</div>We'll keep the request open and
                  notify matching donors as they come online.
                </div>
              )}
              {matches &&
                matches.map((d) => (
                  <DonorRow
                    key={d.id}
                    donor={d}
                    action={
                      <a className="btn btn-vital btn-sm" href={`tel:${d.phone}`}>
                        📞 Call now
                      </a>
                    }
                  />
                ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <h2>All open requests</h2>
          </div>
          <div className="request-list">
            {allRequests.length === 0 && <div className="empty-state">No open requests right now.</div>}
            {allRequests.map((r) => (
              <RequestRow key={r.id} request={r} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
