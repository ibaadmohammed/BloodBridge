import type { Slot } from '../types/appointment';

interface Props {
  slots: Slot[];
  value: string;
  onChange: (time: string) => void;
  loading?: boolean;
}

export default function SlotPicker({ slots, value, onChange, loading }: Props) {
  if (loading) return <p className="appt-hint" aria-live="polite">Loading available times…</p>;
  if (slots.length === 0) return <p className="appt-hint">No times left on this day. Try another date.</p>;

  return (
    <div className="appt-slots" role="group" aria-label="Available times">
      {slots.map((s) => {
        const full = s.remaining === 0;
        const selected = s.time === value;
        return (
          <button
            key={s.time}
            type="button"
            className={`appt-slot${selected ? ' is-selected' : ''}`}
            aria-pressed={selected}
            disabled={full}
            onClick={() => onChange(s.time)}
            title={full ? 'Fully booked' : `${s.remaining} of ${s.capacity} places left`}
          >
            <span>{s.time}</span>
            <small>{full ? 'Full' : `${s.remaining} left`}</small>
          </button>
        );
      })}
    </div>
  );
}
