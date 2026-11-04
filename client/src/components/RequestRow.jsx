import React from "react";
import { timeAgo } from "../lib/helpers.js";

export default function RequestRow({ request }) {
  return (
    <div className={`donor-row request-row ${request.urgency}`}>
      <div className="bg-badge">{request.bloodGroup}</div>
      <div className="info">
        <div className="name">
          {request.patientName} · {request.unitsNeeded} unit{request.unitsNeeded > 1 ? "s" : ""} needed
        </div>
        <div className="meta">
          {request.hospital}, {request.city} · {timeAgo(request.createdAt)}
        </div>
      </div>
      <span className={`urgency-tag ${request.urgency}`}>{request.urgency}</span>
    </div>
  );
}
