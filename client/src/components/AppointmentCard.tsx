import type { Appointment } from '../types/appointment';
import { formatAppointment, isUpcoming } from '../lib/dates';

interface Props {
  appointment: Appointment;
  onCancel?: (a: Appointment) => void;
  busy?: boolean;
}

export default function AppointmentCard({ appointment: a, onCancel, busy }: Props) {
  const canCancel = a.status === 'booked' && isUpcoming(a.date, a.time) && !!onCancel;
  return (
    <article className={`appt-card status-${a.status}`}>
      <div>
        <h3>{a.centerName || 'Donation center'}</h3>
        <p>{formatAppointment(a.date, a.time)}</p>
        <p className="appt-hint">{a.donorName} · {a.bloodGroup}</p>
      </div>
      <div className="appt-card-side">
        <span className="appt-badge">{a.status}</span>
        {canCancel && (
          <button type="button" className="appt-link" disabled={busy} onClick={() => onCancel?.(a)}>
            Cancel appointment
          </button>
        )}
      </div>
    </article>
  );
}
