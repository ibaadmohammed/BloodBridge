import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import RequestRow from "../components/RequestRow.jsx";

export default function Home() {
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loadingReq, setLoadingReq] = useState(true);

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error);
    api
      .getRequests({ status: "open" })
      .then(setRequests)
      .catch(console.error)
      .finally(() => setLoadingReq(false));
  }, []);

  return (
    <>
      {stats && stats.criticalRequests > 0 && (
        <div className="banner show">
          🚨 {stats.criticalRequests} critical blood request{stats.criticalRequests > 1 ? "s" : ""} open right
          now — tap Emergency to help.
        </div>
      )}

      <header className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">
              <span className="pulse-dot"></span> LIVE NETWORK &middot;{" "}
              <span>{stats ? stats.availableDonors : "—"}</span> donors ready right now
            </div>
            <h1>
              Every drop finds
              <br />
              its way <span className="accent">home.</span>
            </h1>
            <p className="lede">
              BloodBridge connects patients in urgent need with verified, nearby donors in minutes — by blood
              group, location, and availability. No waiting rooms, no cold calls.
            </p>
            <div className="hero-actions">
              <Link to="/emergency" className="btn btn-primary">
                🚨 Request Blood Now
              </Link>
              <Link to="/register" className="btn btn-outline">
                Become a Donor
              </Link>
            </div>
          </div>
          <div>
            <svg className="ecg-line" viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,60 L60,60 L80,60 L95,20 L115,100 L130,60 L160,60 L175,45 L190,60 L400,60" />
            </svg>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="stats-strip">
          <div className="stat-cell">
            <div className="num">{stats ? stats.totalDonors : "—"}</div>
            <div className="label">Registered Donors</div>
          </div>
          <div className="stat-cell">
            <div className="num">{stats ? stats.availableDonors : "—"}</div>
            <div className="label">Available Now</div>
          </div>
          <div className="stat-cell">
            <div className="num">{stats ? stats.openRequests : "—"}</div>
            <div className="label">Open Requests</div>
          </div>
          <div className="stat-cell">
            <div className="num">{stats ? stats.totalDonations : "—"}</div>
            <div className="label">Lives Touched</div>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>How it works</h2>
            <div className="sub">Three steps between a request and a match.</div>
          </div>
          <div className="dash-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            <div className="card">
              <div className="eyebrow" style={{ color: "var(--vital)" }}>
                STEP 01
              </div>
              <h3 style={{ textTransform: "none", fontSize: 18, marginBottom: 8 }}>Register or request</h3>
              <p style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.6 }}>
                Donors sign up once with blood group and location. Patients or hospitals raise a request in
                under a minute.
              </p>
            </div>
            <div className="card">
              <div className="eyebrow" style={{ color: "var(--vital)" }}>
                STEP 02
              </div>
              <h3 style={{ textTransform: "none", fontSize: 18, marginBottom: 8 }}>We match by compatibility</h3>
              <p style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.6 }}>
                BloodBridge ranks compatible, available donors by distance to the hospital — instantly, not by
                scrolling a directory.
              </p>
            </div>
            <div className="card">
              <div className="eyebrow" style={{ color: "var(--vital)" }}>
                STEP 03
              </div>
              <h3 style={{ textTransform: "none", fontSize: 18, marginBottom: 8 }}>Connect directly</h3>
              <p style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.6 }}>
                One tap to call. No middleman, no delay — the donor and requester talk directly to coordinate.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <h2>Open requests near you</h2>
            <div className="sub">
              <Link to="/emergency" style={{ color: "var(--blood)", textDecoration: "none", fontWeight: 600 }}>
                View all →
              </Link>
            </div>
          </div>
          <div className="request-list">
            {loadingReq && <div className="empty-state">Loading requests…</div>}
            {!loadingReq && requests.length === 0 && (
              <div className="empty-state">
                <div className="display">No open requests</div>All clear — no active blood requests right now.
              </div>
            )}
            {requests.slice(0, 4).map((r) => (
              <RequestRow key={r.id} request={r} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
