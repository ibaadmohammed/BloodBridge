import React from "react";
import { NavLink, Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="nav">
      <div className="container">
        <Link to="/" className="brand">
          <span className="drop"></span>BloodBridge
        </Link>
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Home
          </NavLink>
          <NavLink to="/search" className={({ isActive }) => (isActive ? "active" : "")}>
            Find Donors
          </NavLink>
          <NavLink to="/register" className={({ isActive }) => (isActive ? "active" : "")}>
            Become a Donor
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
            Dashboard
          </NavLink>
          <NavLink
            to="/emergency"
            className={({ isActive }) => `emergency-link ${isActive ? "active" : ""}`}
          >
            🚨 Emergency
          </NavLink>
        </div>
        <Link to="/emergency" className="btn btn-primary btn-sm">
          Request Blood
        </Link>
      </div>
    </nav>
  );
}
