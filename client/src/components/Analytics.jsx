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
  // Sample data - replace with backend data
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
        data: [45, 12, 35, 8, 15, 5, 40, 10],
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
        data: [12, 19, 15, 25, 22, 30, 28, 35, 32, 40, 38, 45],
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
        data: [15, 52, 8],
        backgroundColor: ["#f59e0b", "#16a34a", "#dc2626"],
        borderRadius: 8,
      },
    ],
  };

  const eligibility = {
    labels: ["Eligible", "Temporarily Ineligible"],
    datasets: [
      {
        data: [75, 25],
        backgroundColor: ["#16a34a", "#dc2626"],
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-red-700">
            BloodBridge Analytics
          </h1>
          <p className="text-gray-500 mt-2">
            Monitor donors, donations and blood requests.
          </p>
        </div>

        <span className="bg-red-100 text-red-700 px-4 py-2 rounded-full font-semibold">
          Admin Dashboard
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {stats.map((item, index) => (
          <div
            key={index}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all"
          >
            <div className="flex justify-between items-center">
              <p className="text-gray-500 font-medium">{item.title}</p>
              <span className="text-2xl">{item.icon}</span>
            </div>

            <h2 className="text-3xl font-bold text-gray-800 mt-4">
              {item.value}
            </h2>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-6 text-gray-800">
            Blood Group Distribution
          </h2>
          <div className="max-w-sm mx-auto">
            <Doughnut data={bloodGroups} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-6 text-gray-800">
            Monthly Donation Trends
          </h2>
          <Line data={donations} />
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-6 text-gray-800">
            Blood Request Statistics
          </h2>
          <Bar data={requests} />
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-6 text-gray-800">
            Donor Eligibility Statistics
          </h2>
          <div className="max-w-sm mx-auto">
            <Pie data={eligibility} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
