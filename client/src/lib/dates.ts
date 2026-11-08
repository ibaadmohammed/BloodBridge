const pad = (n: number) => String(n).padStart(2, '0');

export const toISODate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const addDays = (d: Date, n: number): Date => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
};

function parse(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

/** "2026-11-20" + "09:30" -> "Fri, 20 Nov 2026, 9:30 am" */
export function formatAppointment(date: string, time: string): string {
  return parse(date, time).toLocaleString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

/** True if the appointment start time is still in the future. */
export function isUpcoming(date: string, time: string): boolean {
  return parse(date, time).getTime() > Date.now();
}
