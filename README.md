# 🩸 BloodBridge (React + Express)

A platform that connects people who need blood with nearby eligible donors — React/Vite frontend, Express API backend.

This is the React rewrite of the plain HTML/CSS/JS version, same features and same design system, now componentized with **React Router** for client-side navigation.

## Features

- Blood group selection (register + request) — reusable `BloodGroupPicker` component
- Location-based donor search with distance sorting
- Emergency blood request with instant compatible-donor matching
- Donor registration / profile
- Available / unavailable status toggle
- One-tap contact donor (`tel:` links)
- Map showing nearby donors and blood banks (Leaflet, wrapped as a React component)
- Dashboard with live requests, donations and blood-group availability
- Urgent-request banner on the home page
- Client-side routing (no full page reloads between Home / Search / Register / Emergency / Dashboard)

## Tech stack

- **Backend:** Node.js + Express, JSON file storage (no DB setup required)
- **Frontend:** React 18 + Vite + React Router, plain CSS (design tokens in `client/src/index.css`)
- **Maps:** `leaflet` npm package, wrapped in `MapView.jsx`
- Blood-type compatibility matrix (server-side) used to match donors to requests

## Project structure

```
BloodBridge/
├── server.js               # Express API (same endpoints as the vanilla version)
├── package.json              # root: orchestrates server + client via `concurrently`
├── data/db.json                # seed + persisted data
├── dist/                         # created by `npm run build` — Express serves this in production
└── client/                        # Vite React app
    ├── package.json
    ├── vite.config.js                # dev proxy /api -> :3000, build outDir ../dist
    ├── index.html
    └── src/
        ├── main.jsx                    # mounts <App/>, router + toast provider
        ├── App.jsx                       # routes
        ├── api.js                         # fetch wrapper
        ├── index.css                       # design system (shared with vanilla version)
        ├── lib/helpers.js                    # city coords, blood groups, timeAgo
        ├── components/
        │   ├── Navbar.jsx
        │   ├── Toast.jsx                        # context + component
        │   ├── BloodGroupPicker.jsx
        │   ├── DonorRow.jsx
        │   ├── RequestRow.jsx
        │   └── MapView.jsx                        # Leaflet wrapped as a component
        └── pages/
            ├── Home.jsx
            ├── Register.jsx
            ├── Search.jsx
            ├── Emergency.jsx
            └── Dashboard.jsx
```

## Run it (development)

Two ways:

**Option A — one command, both servers:**
```bash
npm run install:all   # installs root + client dependencies
npm run dev            # runs Express (:3000) and Vite (:5173) together
```
Open **http://localhost:5173** (Vite dev server; it proxies `/api` calls to Express on :3000).

**Option B — separate terminals** (useful if you want separate log output):
```bash
# terminal 1
npm install
npm run dev:server        # Express on :3000

# terminal 2
cd client && npm install
npm run dev                 # Vite on :5173
```

## Run it (production-style build)

```bash
npm run install:all
npm run build     # builds the React app into ../dist
npm start           # Express serves the built app + API from a single port
```
Open **http://localhost:3000** — Express now serves the compiled React app directly, no separate Vite server needed.

## Opening in Antigravity / VS Code

1. Open the **`BloodBridge`** folder itself as the workspace root.
2. Run `npm run install:all` in the integrated terminal.
3. Use **Run and Debug** → **"Run Full App (server + client)"** — this is a compound launch config that starts the Express server *with the debugger attached* (breakpoints work in `server.js`) alongside the Vite dev server in a terminal.
   - Or just run `npm run dev` from the terminal — same effect, no debugger attached.
4. Open `http://localhost:5173`.

Included editor config:
- `.vscode/launch.json` — debug config for the server, plus a compound to launch both server and client together
- `.vscode/settings.json` — 2-space indent, format-on-save, excludes both `node_modules` folders and `dist`
- `.vscode/extensions.json` — recommends Prettier, ESLint, REST Client
- `.editorconfig`, `.gitignore` — consistent formatting, clean git status across the two-project layout

## API reference

Same as the vanilla version — see `server.js`. Quick summary:

| Method | Endpoint           | Description                                                    |
|--------|---------------------|------------------------------------------------------------------|
| GET    | `/api/donors`        | List donors (filters: bloodGroup, status, lat, lng, radius)       |
| POST   | `/api/donors`         | Register a donor                                                    |
| PATCH  | `/api/donors/:id`      | Update a donor (e.g. toggle status)                                   |
| GET    | `/api/requests`         | List blood requests (filters: status, urgency)                          |
| POST   | `/api/requests`          | Create a request; returns matched donors                                  |
| PATCH  | `/api/requests/:id`       | Update a request (e.g. mark fulfilled)                                      |
| GET    | `/api/bloodbanks`          | List seeded blood banks                                                       |
| GET    | `/api/stats`                 | Dashboard aggregate stats                                                       |

## Notes

- The blood-compatibility matrix is the standard simplified ABO/Rh model — fine for a hackathon demo, not a substitute for real medical cross-matching.
- City → coordinates is a hardcoded lookup table for the demo, not real geocoding.
- `React.StrictMode` double-invokes effects in dev; `MapView.jsx` guards against creating the Leaflet map twice.
