import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { BLOOD_GROUPS } from "../lib/helpers.js";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [donors, setDonors] = useState([]);

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error);
    api.getRequests().then(setRequests).catch(console.error);
    api.getDonors().then(setDonors).catch(console.error);
  }, []);

  const max = stats ? Math.max(1, ...BLOOD_GROUPS.map((g) => stats.byGroup[g] || 0)) : 1;

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h2>Network dashboard</h2>
          <div className="sub">Live snapshot of donors and requests across BloodBridge.</div>
        </div>

        <div className="dash-grid">
          <div className="dash-card">
            <div className="num">{stats ? stats.totalDonors : "—"}</div>
            <div className="label">Total donors</div>
          </div>
          <div className="dash-card">
            <div className="num">{stats ? stats.availableDonors : "—"}</div>
            <div className="label">Available now</div>
          </div>
          <div className="dash-card alert">
            <div className="num">{stats ? stats.openRequests : "—"}</div>
            <div className="label">Open requests</div>
          </div>
          <div className="dash-card alert">
            <div className="num">{stats ? stats.criticalRequests : "—"}</div>
            <div className="label">Critical requests</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32, alignItems: "start" }}>
          <div className="card">
            <h3 style={{ fontSize: 15, textTransform: "none", marginBottom: 16 }}>
              Available donors by blood group
            </h3>
            <div>
              {BLOOD_GROUPS.map((g) => {
                const n = stats ? stats.byGroup[g] || 0 : 0;
                return (
                  <div className="bg-bar-row" key={g}>
                    <div className="g">{g}</div>
                    <div className="bg-bar-track">
                      <div className="bg-bar-fill" style={{ width: `${(n / max) * 100}%` }} />
                    </div>
                    <div className="n">{n}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontSize: 15, textTransform: "none", marginBottom: 6 }}>Total donations recorded</h3>
            <div className="num mono" style={{ fontSize: 44, color: "var(--vital)" }}>
              {stats ? stats.totalDonations : "—"}
            </div>
            <p style={{ color: "var(--steel)", fontSize: 13, marginTop: 6 }}>
              Every fulfilled request credits the responding donor's profile.
            </p>
          </div>
        </div>

        <div className="section-head">
          <h2 style={{ fontSize: 20 }}>Recent requests</h2>
        </div>
        <div className="card" style={{ padding: 0, overflowX: "auto", marginBottom: 32 }}>
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Group</th>
                <th>Hospital</th>
                <th>City</th>
                <th>Urgency</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--steel)" }}>
                    No requests yet
                  </td>
                </tr>
              )}
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.patientName}</td>
                  <td className="mono">{r.bloodGroup}</td>
                  <td>{r.hospital}</td>
                  <td>{r.city}</td>
                  <td>
                    <span className={`urgency-tag ${r.urgency}`}>{r.urgency}</span>
                  </td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="section-head">
          <h2 style={{ fontSize: 20 }}>All donors</h2>
        </div>
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Group</th>
                <th>City</th>
                <th>Status</th>
                <th>Donations</th>
              </tr>
            </thead>
            <tbody>
              {donors.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--steel)" }}>
                    No donors yet
                  </td>
                </tr>
              )}
              {donors.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td className="mono">{d.bloodGroup}</td>
                  <td>{d.city}</td>
                  <td>
                    <span className={`status-tag ${d.status}`}>{d.status}</span>
                  </td>
                  <td className="mono">{d.donations || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
