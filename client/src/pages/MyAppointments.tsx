import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import AppointmentCard from '../components/AppointmentCard';
import { appointmentsApi } from '../appointmentsApi';
import type { Appointment } from '../types/appointment';
import './appointments.css';

export default function MyAppointments() {
  const [phone, setPhone] = useState('');
  const [lookedUp, setLookedUp] = useState('');
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  async function onLookup(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      setItems(await appointmentsApi.listByPhone(phone.trim()));
      setLookedUp(phone.trim());
    } catch (err) {
      setItems(null);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function onCancel(a: Appointment) {
    if (!window.confirm(`Cancel your appointment at ${a.centerName} on ${a.date} at ${a.time}?`)) return;
    setBusyId(a.id);
    setError('');
    try {
      const updated = await appointmentsApi.cancel(a.id, lookedUp);
      setItems((prev) => prev?.map((x) => (x.id === updated.id ? updated : x)) ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId('');
    }
  }

  return (
    <main className="appt-page">
      <h1>My appointments</h1>
      <form onSubmit={onLookup} className="appt-form appt-inline" noValidate>
        <label>
          Phone number used when booking
          <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        <button type="submit" className="appt-primary" disabled={!phone.trim() || loading}>
          {loading ? 'Looking…' : 'Find appointments'}
        </button>
      </form>

      {error && <p className="appt-error" role="alert">{error}</p>}

      {items && items.length === 0 && (
        <p className="appt-hint">No appointments for that number. <Link to="/book">Book a donation</Link></p>
      )}
      <div className="appt-list">
        {items?.map((a) => (
          <AppointmentCard key={a.id} appointment={a} onCancel={onCancel} busy={busyId === a.id} />
        ))}
      </div>
    </main>
  );
}
