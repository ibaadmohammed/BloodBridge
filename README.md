# 🩸 BloodBridge — Connecting Lives Through Blood Donation

**BloodBridge** is a full-stack blood donation and emergency request management platform that connects patients and hospitals with nearby eligible blood donors. It simplifies donor discovery, blood request management, and donation appointment scheduling through a centralized platform.

Built with **React, Node.js, Express, and PostgreSQL**, BloodBridge aims to make blood donation coordination faster, more accessible, and more organized.

---

## ✨ Key Features

### 🧑‍🤝‍🧑 Donor Management
- Register as a blood donor.
- Manage donor profiles and contact information.
- Update donor availability status.
- Search for donors based on blood group and location.
- Identify compatible donors using blood group compatibility rules.

### 🚨 Emergency Blood Requests
- Create urgent blood requests.
- Select the required blood group and location.
- Match requests with compatible donors.
- Track blood request statuses.
- Manage and update existing requests.

### 📅 Appointment Management
- Schedule blood donation appointments.
- View available appointment slots.
- Book appointments at participating blood centers.
- Cancel existing appointments.
- Store appointment information in PostgreSQL.

### 🗺️ Location-Based Discovery
- Discover nearby donors and blood banks.
- View locations through interactive maps.
- Use geographical information to support donor discovery.

### 📊 Dashboard & Statistics
- View donor and blood request statistics.
- Monitor blood group availability.
- Track donation activity and requests.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, Vite, JavaScript, CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Database Driver | node-postgres (`pg`) |
| API Architecture | REST APIs |
| Maps | Leaflet |
| Development Tools | Antigravity, Git, GitHub |
| Package Management | npm |

---

## 🏗️ System Architecture

BloodBridge follows a client-server architecture.

```text
          USER
           |
           v
   React Frontend (Vite)
           |
           | HTTP Requests
           v
     Express.js Backend
           |
           | REST APIs
           v
    PostgreSQL Database
           |
           v
   Stored Application Data
```

**How it works:**

1. Users interact with the React frontend.
2. The frontend sends HTTP requests to the Express backend.
3. Express processes requests through REST API endpoints.
4. The backend communicates with PostgreSQL using the `pg` library.
5. Database results are returned to the frontend as JSON responses.

---

## 📁 Project Structure

```text
BloodBridge/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── lib/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── data/
│   └── (local development data, excluded from Git)
│
├── server.js
├── appointments.js
├── eligibility.js
├── db.js
├── BloodBridge-schema.sql
├── migrate-json-to-sql.js
├── test-db.js
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## ⚙️ Installation & Setup

Follow these steps to run BloodBridge locally.

### 1. Clone the Repository

```bash
git clone https://github.com/ibaadmohammed/BloodBridge.git
cd BloodBridge
```

### 2. Install Dependencies

Install backend dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
cd client
npm install
cd ..
```

### 3. Configure PostgreSQL

Make sure PostgreSQL is installed and running.

Create a database named:

```sql
CREATE DATABASE "BloodBridge";
```

Open the `BloodBridge-schema.sql` file and execute its SQL statements against the newly created database.

### 4. Configure Environment Variables

Create a `.env` file in the project root.

Use `.env.example` as a reference:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=BloodBridge
DB_PASSWORD=your_postgres_password
DB_PORT=5432
```

Replace the placeholder values with your local PostgreSQL credentials.

**Important:** Never commit your `.env` file or database credentials to GitHub.

### 5. Test the Database Connection

Run:

```bash
node test-db.js
```

This checks whether the backend can connect to PostgreSQL.

### 6. Start the Backend

From the project root:

```bash
npm start
```

The Express backend runs on:

```text
http://localhost:3000
```

### 7. Start the Frontend

Open another terminal:

```bash
cd client
npm run dev
```

Open the application at:

```text
http://localhost:5173
```

---

## 🗄️ Database

BloodBridge uses **PostgreSQL** for persistent application data.

The database schema is provided in `BloodBridge-schema.sql`.

The application uses database tables for managing information such as:

- Donor directory
- Blood requests
- Blood banks
- Donation appointments

The backend uses the `pg` package and a connection pool configured in `db.js`.

### Legacy Data Migration

A migration script is included to transfer existing JSON-based application data into PostgreSQL.

```bash
node migrate-json-to-sql.js
```

Run this only after configuring the database and executing the schema.

---

## 🔌 REST API

The Express backend exposes REST API endpoints for communication between the frontend and database.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/donors` | Retrieve donor information |
| POST | `/api/donors` | Register a new donor |
| PATCH | `/api/donors/:id` | Update donor information |
| GET | `/api/requests` | Retrieve blood requests |
| POST | `/api/requests` | Create a blood request |
| PATCH | `/api/requests/:id` | Update a blood request |
| GET | `/api/bloodbanks` | Retrieve blood bank information |
| GET | `/api/stats` | Retrieve dashboard statistics |
| GET | `/api/appointments/slots` | Retrieve available appointment slots |

Appointment booking and cancellation are also handled through the appointments API.

---

## 🔐 Security & Data Handling

- Database credentials are configured through environment variables.
- `.env` and local donor data files are excluded using `.gitignore`.
- PostgreSQL provides persistent relational data storage.
- Backend APIs handle database operations instead of exposing database credentials to the frontend.

---

## 🚀 Future Enhancements

- JWT-based authentication and role-based authorization.
- Email and SMS notifications for emergency blood requests.
- Real-time notifications for compatible donors.
- Advanced donor matching based on distance and availability.
- Hospital and donor verification.
- Improved analytics and reporting.
- Cloud database deployment.

---

## ⚠️ Disclaimer

BloodBridge is an academic and development project intended to demonstrate blood donation coordination and full-stack application development.

Blood group compatibility logic is simplified for application-level matching. It must not replace professional medical evaluation, laboratory testing, or clinical cross-matching.

---

## 👨‍💻 Developer

**Ibaad Mohammed**

- GitHub: [@ibaadmohammed](https://github.com/ibaadmohammed)
- Project: [BloodBridge](https://github.com/ibaadmohammed/BloodBridge)

---

**BloodBridge — Every Donation Can Save a Life. ❤️**
inst creating the Leaflet map twice.
