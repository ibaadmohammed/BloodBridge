import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import BloodGroupPicker from "../components/BloodGroupPicker.jsx";
import { CITIES, CITY_COORDS } from "../lib/helpers.js";

export default function Register() {
  const toast = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [bloodGroup, setBloodGroup] = useState(null);
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("available");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!bloodGroup) {
      toast("Please select a blood group", "error");
      return;
    }
    const coords = CITY_COORDS[city] || {};
    setSubmitting(true);
    try {
      const donor = await api.registerDonor({
        name: name.trim(),
        bloodGroup,
        phone: phone.trim(),
        city,
        lat: coords.lat,
        lng: coords.lng,
      });
      if (status === "unavailable") await api.updateDonor(donor.id, { status: "unavailable" });
      toast(`Welcome, ${donor.name}! You're now on the donor network.`);
      setTimeout(() => navigate("/search"), 1000);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="eyebrow" style={{ color: "var(--vital)" }}>
          DONOR PROFILE
        </div>
        <h1 style={{ fontSize: 34, marginBottom: 6 }}>Register as a donor</h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 15, marginBottom: 28 }}>
          One profile. Every future request in your city can find you.{" "}
          <Link to="/eligibility" style={{ color: "var(--vital)", fontWeight: 600 }}>
            Not sure you can donate? Check eligibility first.
          </Link>
        </p>

        <form className="card" onSubmit={handleSubmit}>
          <div className="field full">
            <label>Full name</label>
            <input
              type="text"
              placeholder="e.g. Ananya Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="field full">
            <label>Blood group</label>
            <BloodGroupPicker value={bloodGroup} onChange={setBloodGroup} />
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Phone number</label>
              <input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
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
          </div>

          <div className="field full">
            <label>Availability</label>
            <div className="bg-pill-group">
              <div
                className={`bg-pill ${status === "available" ? "active" : ""}`}
                onClick={() => setStatus("available")}
              >
                🟢 Available to donate
              </div>
              <div
                className={`bg-pill ${status === "unavailable" ? "active" : ""}`}
                onClick={() => setStatus("unavailable")}
              >
                ⚪ Not available right now
              </div>
            </div>
          </div>

          <p className="help" style={{ marginBottom: 20 }}>
            By registering you agree to be contacted directly by patients or hospitals for compatible blood
            requests near your city.
          </p>

          <button type="submit" className="btn btn-vital btn-block" disabled={submitting}>
            {submitting ? "Registering…" : "Register as Donor"}
          </button>
        </form>
      </div>
    </section>
  );
}
