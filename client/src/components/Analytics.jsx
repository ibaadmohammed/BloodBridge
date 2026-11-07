import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Doughnut, Line, Bar, Pie } from "react-chartjs-2";
import "./Analytics.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

const Analytics = () => {
  const stats = [
    { title: "Total Donors", value: 250, icon: "👥" },
    { title: "Total Donations", value: 180, icon: "🩸" },
    { title: "Blood Requests", value: 65, icon: "📋" },
    { title: "Successful Donations", value: 52, icon: "❤️" },
  ];

  const bloodGroups = {
    labels: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    datasets: [
      {
        data: [45, 12, 38, 10, 22, 8, 55, 15],
        backgroundColor: [
          "#dc2626",
          "#f87171",
          "#991b1b",
          "#fb7185",
          "#be123c",
          "#f43f5e",
          "#7f1d1d",
          "#fecaca",
        ],
        borderWidth: 2,
      },
    ],
  };

  const donations = {
    labels: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    datasets: [
      {
        label: "Donations",
        data: [12, 18, 15, 22, 25, 20, 28, 30, 24, 26, 32, 35],
        borderColor: "#dc2626",
        backgroundColor: "rgba(220,38,38,0.12)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const requests = {
    labels: ["Pending", "Fulfilled", "Cancelled"],
    datasets: [
      {
        label: "Requests",
        data: [20, 35, 10],
        backgroundColor: ["#f59e0b", "#16a34a", "#dc2626"],
        borderRadius: 8,
      },
    ],
  };

  const eligibility = {
    labels: ["Eligible", "Temporarily Ineligible"],
    datasets: [
      {
        data: [200, 50],
        backgroundColor: ["#16a34a", "#dc2626"],
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <h1>BloodBridge Analytics</h1>
          <p>Monitor donors, donations and blood requests.</p>
        </div>
        <span className="admin-badge">Admin Dashboard</span>
      </div>

      <div className="stats-grid">
        {stats.map((item, index) => (
          <div key={index} className="stat-card">
            <div className="stat-top">
              <p>{item.title}</p>
              <span>{item.icon}</span>
            </div>
            <h2>{item.value}</h2>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h2>Blood Group Distribution</h2>
          <div className="chart-small">
            <Doughnut data={bloodGroups} />
          </div>
        </div>
        <div className="chart-card">
          <h2>Monthly Donation Trends</h2>
          <Line data={donations} />
        </div>
        <div className="chart-card">
          <h2>Blood Request Statistics</h2>
          <Bar data={requests} />
        </div>
        <div className="chart-card">
          <h2>Donor Eligibility Statistics</h2>
          <div className="chart-small">
            <Pie data={eligibility} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
