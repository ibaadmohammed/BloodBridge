import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import SlotPicker from '../components/SlotPicker';
import AppointmentCard from '../components/AppointmentCard';
import { appointmentsApi } from '../appointmentsApi';
import { addDays, toISODate } from '../lib/dates';
import { BLOOD_GROUPS } from '../types/appointment';
import type { Appointment, BloodBank, BloodGroup, Slot } from '../types/appointment';
import './appointments.css';

const MAX_DAYS_AHEAD = 60;

export default function BookAppointment() {
  const today = useMemo(() => new Date(), []);
  const minDate = toISODate(today);
  const maxDate = toISODate(addDays(today, MAX_DAYS_AHEAD));

  const [banks, setBanks] = useState<BloodBank[]>([]);
  const [banksError, setBanksError] = useState('');

  const [donorName, setDonorName] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | ''>('');
  const [centerId, setCenterId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);

  useEffect(() => {
    appointmentsApi.bloodBanks().then(setBanks).catch((e: Error) => setBanksError(e.message));
  }, []);

  // Reload slots whenever center or date changes; abort stale requests.
  useEffect(() => {
    setTime('');
    setSlots([]);
    setSlotsError('');
    if (!centerId || !date) return;
    const ctrl = new AbortController();
    setSlotsLoading(true);
    appointmentsApi
      .slots(centerId, date, ctrl.signal)
      .then(setSlots)
      .catch((e: Error) => { if (e.name !== 'AbortError') setSlotsError(e.message); })
      .finally(() => { if (!ctrl.signal.aborted) setSlotsLoading(false); });
    return () => ctrl.abort();
  }, [centerId, date]);

  const canSubmit = Boolean(donorName.trim() && phone.trim() && bloodGroup && centerId && date && time) && !submitting;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !bloodGroup) return;
    setSubmitting(true);
    setError('');
    const bank = banks.find((b) => String(b.id) === centerId);
    try {
      const appt = await appointmentsApi.book({
        donorName: donorName.trim(),
        phone: phone.trim(),
        bloodGroup,
        centerId,
        centerName: bank?.name ?? '',
        date,
        time,
        notes: notes.trim() || undefined,
      });
      setConfirmed(appt);
    } catch (err) {
      setError((err as Error).message);
      // The slot may have just filled; refresh availability.
      appointmentsApi.slots(centerId, date).then(setSlots).catch(() => {});
      setTime('');
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <main className="appt-page">
        <h1>You're booked</h1>
        <AppointmentCard appointment={confirmed} />
        <p className="appt-hint">
          Bring a photo ID, eat a meal beforehand and drink plenty of water. You can cancel any time from{' '}
          <Link to="/appointments">My appointments</Link> using your phone number.
        </p>
        <button type="button" className="appt-primary" onClick={() => { setConfirmed(null); setTime(''); setNotes(''); }}>
          Book another
        </button>
      </main>
    );
  }

  return (
    <main className="appt-page">
      <h1>Book a donation</h1>
      <p className="appt-hint">Pick a center and a time. Donations must be at least 56 days apart.</p>

      <form onSubmit={onSubmit} className="appt-form" noValidate>
        <label>
          Full name
          <input value={donorName} onChange={(e) => setDonorName(e.target.value)} autoComplete="name" required />
        </label>

        <label>
          Phone number
          <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required />
        </label>

        <label>
          Blood group
          <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value as BloodGroup)} required>
            <option value="">Select…</option>
            {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>

        <label>
          Donation center
          <select value={centerId} onChange={(e) => setCenterId(e.target.value)} required>
            <option value="">{banks.length ? 'Select…' : 'Loading centers…'}</option>
            {banks.map((b) => (
              <option key={b.id} value={String(b.id)}>{b.name}{b.city ? `, ${b.city}` : ''}</option>
            ))}
          </select>
          {banksError && <span className="appt-error" role="alert">Couldn't load centers: {banksError}</span>}
        </label>

        <label>
          Date
          <input type="date" value={date} min={minDate} max={maxDate} onChange={(e) => setDate(e.target.value)} required />
        </label>

        {centerId && date && (
          <fieldset className="appt-fieldset">
            <legend>Time</legend>
            {slotsError
              ? <p className="appt-error" role="alert">{slotsError}</p>
              : <SlotPicker slots={slots} value={time} onChange={setTime} loading={slotsLoading} />}
          </fieldset>
        )}

        <label>
          Notes for the center (optional)
          <textarea value={notes} maxLength={300} rows={2} onChange={(e) => setNotes(e.target.value)} />
        </label>

        {error && <p className="appt-error" role="alert">{error}</p>}

        <button type="submit" className="appt-primary" disabled={!canSubmit}>
          {submitting ? 'Booking…' : 'Confirm appointment'}
        </button>
      </form>
    </main>
  );
}
