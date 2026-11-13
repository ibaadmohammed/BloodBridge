import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import DonorRow from "../components/DonorRow.jsx";
import MapView from "../components/MapView.jsx";
import { CITIES, BLOOD_GROUPS } from "../lib/helpers.js";

export default function Search() {
  const toast = useToast();

  const [bloodGroup, setBloodGroup] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("");
  const [donors, setDonors] = useState([]);
  const [bloodBanks, setBloodBanks] = useState([]);
  const [loading, setLoading] = useState(true);

  async function runSearch() {
    setLoading(true);

    try {
      // Fetch donors using blood group and availability filters.
      const params = { bloodGroup, status };
      const results = await api.getDonors(params);

      // Filter city using the actual city field.
      const filtered = city
        ? results.filter(
            (d) =>
              (d.city || "").trim().toLowerCase() === city.trim().toLowerCase(),
          )
        : results;

      setDonors(filtered);
    } catch (e) {
      toast(e.message, "error");
      setDonors([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runSearch();
    api.getBloodBanks().then(setBloodBanks).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h2>Find nearby donors</h2>
          <div className="sub">
            Filter by blood group, city and availability.
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="form-grid" style={{ marginBottom: 0 }}>
            <div className="field">
              <label>Blood group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
              >
                <option value="">Any</option>
                {BLOOD_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>City</label>
              <select value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">Any city</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Show only</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All donors</option>
                <option value="available">Available now</option>
              </select>
            </div>

            <div className="field" style={{ justifyContent: "flex-end" }}>
              <button
                className="btn btn-secondary btn-block"
                onClick={runSearch}
                disabled={loading}
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 24,
            alignItems: "flex-start",
          }}
        >
          <div className="donor-list">
            {loading && <div className="empty-state">Loading donors...</div>}

            {!loading && donors.length === 0 && (
              <div className="empty-state">
                <div className="display">No donors match</div>
                Try widening your filters.
              </div>
            )}

            {!loading && donors.map((d) => <DonorRow key={d.id} donor={d} />)}
          </div>

          <MapView donors={donors} bloodBanks={bloodBanks} />
        </div>
      </div>
    </section>
  );
}
