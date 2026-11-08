import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import Register from "./pages/Register.jsx";
import Search from "./pages/Search.jsx";
import Eligibility from "./pages/Eligibility.jsx";
import Emergency from "./pages/Emergency.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Analytics from "./components/Analytics.jsx";
import BookAppointment from "./pages/BookAppointment";
import MyAppointments from "./pages/MyAppointments";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/eligibility" element={<Eligibility />} />
        <Route path="/search" element={<Search />} />
        <Route path="/emergency" element={<Emergency />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/book" element={<BookAppointment />} />
        <Route path="/appointments" element={<MyAppointments />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <footer>
        <div className="container">
          <span>
            <span className="drop" style={{ width: 10, height: 10 }}></span>{" "}
            BloodBridge
          </span>
          <span>
            Built for hackathon demo &middot; not a substitute for emergency
            medical services
          </span>
        </div>
      </footer>
    </>
  );
}
