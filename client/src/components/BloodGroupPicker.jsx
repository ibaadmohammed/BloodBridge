import React from "react";
import { BLOOD_GROUPS } from "../lib/helpers.js";

export default function BloodGroupPicker({ value, onChange }) {
  return (
    <div className="bg-pill-group">
      {BLOOD_GROUPS.map((g) => (
        <div
          key={g}
          className={`bg-pill ${value === g ? "active" : ""}`}
          onClick={() => onChange(g)}
        >
          {g}
        </div>
      ))}
    </div>
  );
}
