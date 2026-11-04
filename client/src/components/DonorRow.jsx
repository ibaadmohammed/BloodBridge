import React from "react";

export default function DonorRow({ donor, action }) {
  return (
    <div className="donor-row">
      <div className="bg-badge">{donor.bloodGroup}</div>
      <div className="info">
        <div className="name">{donor.name}</div>
        <div className="meta">
          {donor.city}
          {donor.distanceKm != null ? ` · ${donor.distanceKm} km away` : ""}
          {donor.donations !== undefined ? ` · ${donor.donations || 0} past donations` : ""}
        </div>
      </div>
      {donor.status && (
        <span className={`status-tag ${donor.status}`}>
          {donor.status === "available" ? "🟢 Available" : "⚪ Unavailable"}
        </span>
      )}
      {action || (
        <a className="btn btn-outline btn-sm" href={`tel:${donor.phone}`}>
          📞 Call
        </a>
      )}
    </div>
  );
}
