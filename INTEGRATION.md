# Donation Appointment Booking: integration steps

Copy the files into the repo, keeping the same relative paths:

```
appointments.js                         -> BloodBridge/appointments.js
client/tsconfig.json                    -> BloodBridge/client/tsconfig.json
client/src/**                           -> BloodBridge/client/src/**
```

## 1. Install TypeScript (client only; Vite compiles .ts/.tsx out of the box)

```bash
cd client
npm i -D typescript @types/react @types/react-dom
```

Existing `.jsx` files keep working (`allowJs: true`), so you can migrate gradually.

## 2. Mount the API in `server.js`

Add before the static/catch-all handler (use `import appointments from './appointments.js'` instead if server.js is ESM; then change `require`/`module.exports` in appointments.js to `import`/`export default`):

```js
app.use('/api/appointments', require('./appointments'));
```

## 3. Add routes in `client/src/App.jsx`

```jsx
import BookAppointment from './pages/BookAppointment';
import MyAppointments from './pages/MyAppointments';
// inside <Routes>:
<Route path="/book" element={<BookAppointment />} />
<Route path="/appointments" element={<MyAppointments />} />
```

## 4. Add nav links in `Navbar.jsx`

```jsx
<NavLink to="/book">Book donation</NavLink>
<NavLink to="/appointments">My appointments</NavLink>
```

## 5. Protect donor data

Appointments are stored in `data/appointments.json` and contain phone numbers. Add to `.gitignore`:

```
data/appointments.json
```

## Things to check against your code

- `GET /api/bloodbanks` items need `id` and `name` (optional `city`). If your field names differ, edit `BloodBank` in `types/appointment.ts` and the `<option>` in `BookAppointment.tsx`.
- Donation interval (56 days), hours (09:00 to 17:00), slot length and capacity are constants at the top of `appointments.js`. Swap the interval check for your `eligibility.js` rules if they differ.
- Page styling uses `.appt-*` classes with fallbacks; map `--red`, `--border`, `--bg-soft` to your design tokens in `index.css`.

## Known limits

- Your live deployment is on Vercel, whose serverless filesystem is read-only/ephemeral, so JSON-file storage will not persist there. It works locally and on a normal Node host. For Vercel you need a real store (Vercel Postgres/KV, MongoDB Atlas, Supabase); only `load()`/`save()` in appointments.js would change.
- Donors identify themselves by phone number only (no login), so anyone who knows a number can view or cancel its appointments. Fine for a demo; add OTP or accounts before real use.
- "completed" status has no staff UI yet.
