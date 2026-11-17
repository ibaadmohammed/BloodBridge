# 🩸 BloodBridge – Smart Blood Donation & Management Platform

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Chart.js](https://img.shields.io/badge/Chart.js-Analytics-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
[![Leaflet](https://img.shields.io/badge/Leaflet-Maps-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Neon](https://img.shields.io/badge/Neon-Serverless_Postgres-00E599?style=for-the-badge&logo=neon&logoColor=black)](https://neon.tech/)

**BloodBridge** is a smart blood donation and management platform designed to connect blood donors, patients, hospitals, and blood banks through a centralized digital system.

The platform simplifies donor discovery, emergency blood requests, appointment management, and blood-bank information while providing analytics and AI-powered assistance.

🌐 **Live Website:** https://blood-bridge-kappa-lilac.vercel.app/

🔗 **Backend API:** https://bloodbridge-6jwv.onrender.com/

---

## ✨ Key Features

### 🩸 Donor Management
- Browse and manage registered blood donors.
- Search donors based on blood group and location.
- View donor availability and donation information.
- Track donor eligibility information.

### 🚨 Emergency Blood Requests
- Submit blood requests with patient and hospital details.
- Specify blood group, required units, and urgency.
- Track request statuses.
- Manage emergency and regular blood requirements.

### 📅 Appointment Management
- Book blood donation appointments.
- View available appointment slots.
- Cancel existing appointments.
- Enforce appointment capacity limits.
- Apply a minimum 56-day interval between donations.

### 🏥 Blood Bank Directory
- Browse 150 blood-bank directory entries.
- View hospital and blood-bank locations.
- Explore location information and contact details.

### 📊 Analytics Dashboard
- Visualize donor and blood-request statistics.
- View blood-group distribution.
- Monitor donation and request information.
- Explore interactive charts using Chart.js.

### 🗺️ Interactive Maps
- Explore donor and blood-bank locations.
- Visualize geographical information.
- Use interactive maps powered by Leaflet.

### 🤖 AI-Powered Assistant
- Integrated AI chatbot for user assistance.
- Uses n8n Cloud workflows and Gemini AI.
- Helps users interact with BloodBridge information.

---

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React 18, JavaScript, HTML, CSS |
| Build Tool | Vite |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Database Hosting | Neon |
| ORM | Prisma |
| Data Visualization | Chart.js, React Chart.js 2 |
| Maps | Leaflet, React Leaflet |
| AI Integration | Gemini AI, n8n Cloud |
| Deployment | Vercel, Render |

---

## 🏗️ Project Architecture

```text
BloodBridge/
│
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   └── package.json
│
├── prisma/
│   ├── schema.prisma        # Prisma database schema
│   └── bloodbridge-additive.sql
│
├── scripts/
│   ├── import-bloodbanks.js
│   ├── import-donors.js
│   └── import-requests.js
│
├── appointments.js          # Appointment API
├── server.js                # Express backend
├── prisma.config.ts         # Prisma configuration
├── package.json
└── README.md
```

---

## 🗄️ Database Architecture

BloodBridge uses **PostgreSQL hosted on Neon** with **Prisma ORM** for database access.

The database manages:
- Donor records
- Blood requests
- Blood groups
- Blood-bank information
- Donation appointments
- Donation-related records

Prisma provides structured database queries, schema management, and type-safe database access through Prisma Client.

---

## ⚙️ Installation and Setup

### Prerequisites

- Node.js 18.18.0 or later
- npm
- PostgreSQL database hosted on Neon
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/ibaadmohammed/BloodBridge.git
cd BloodBridge
```

### 2. Install Dependencies

```bash
npm run install:all
```

### 3. Configure Environment Variables

Create a `.env` file in the project root.

Add your own Neon PostgreSQL connection strings:

```env
DATABASE_URL="your_neon_pooled_connection_string"
DATABASE_URL_UNPOOLED="your_neon_direct_connection_string"
```

Keep your credentials private. Never commit your `.env` file.

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Start the Development Server

```bash
npm run dev
```

The application runs with:
- Express backend: `http://localhost:3000`
- Vite frontend: `http://localhost:5173`

### 6. Production Build

```bash
npm run build
```

This generates Prisma Client and builds the React frontend.

### 7. Start Production Server

```bash
npm start
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/donors` | Retrieve donors |
| POST | `/api/donors` | Register a donor |
| GET | `/api/requests` | Retrieve blood requests |
| POST | `/api/requests` | Create a blood request |
| GET | `/api/bloodbanks` | Retrieve blood banks |
| GET | `/api/stats` | Retrieve dashboard statistics |
| GET | `/api/appointments` | Retrieve appointments |
| POST | `/api/appointments` | Book an appointment |
| GET | `/api/appointments/slots` | Retrieve available slots |
| PATCH | `/api/appointments/:id` | Update appointment status |

---

## 🚀 Deployment

| Component | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | Neon PostgreSQL |

Configure the required database environment variables securely in your deployment platform.

---

## 🎯 Project Objective

The primary objective of BloodBridge is to improve access to blood donation services by connecting donors and blood seekers through a centralized, accessible, and technology-driven platform.

By combining modern web technologies, database management, geographical visualization, analytics, and AI assistance, BloodBridge aims to make blood donation coordination more efficient and accessible.

---

## Summary
- Migrated backend database operations to Neon PostgreSQL.
- Integrated Prisma ORM.
- Migrated donors, blood requests, blood banks and appointments.
- Added database import scripts.
- Updated appointment booking and cancellation.
- Migrated dashboard statistics to PostgreSQL.
- Updated Node.js runtime to version 22.

---

## Testing
- Local website tested successfully.
- Prisma Client generation successful.
- Production Vite build successful.
- Appointment booking and cancellation tested.

---

## 👨‍💻 Developer

**Mohammed Mohtashim Ibaad**

- GitHub: [@ibaadmohammed](https://github.com/ibaadmohammed)
- Project Repository: [BloodBridge](https://github.com/ibaadmohammed/BloodBridge)

---

## 📄 License

This project is developed for educational and demonstration purposes.

---

**Built with ❤️ to connect blood donors and save lives.** 🩸
