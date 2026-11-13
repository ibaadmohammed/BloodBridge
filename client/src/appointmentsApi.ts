import type { Appointment, BloodBank, BookingInput, Slot } from './types/appointment';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status);
  return body as T;
}

export const appointmentsApi = {
  bloodBanks: () => request<BloodBank[]>('/api/bloodbanks'),

  slots: (centerId: string, date: string, signal?: AbortSignal) =>
    request<Slot[]>(
      `/api/appointments/slots?centerId=${encodeURIComponent(centerId)}&date=${date}`,
      { signal },
    ),

  book: (input: BookingInput) =>
    request<Appointment>('/api/appointments', { method: 'POST', body: JSON.stringify(input) }),

  listByPhone: (phone: string) =>
    request<Appointment[]>(`/api/appointments?phone=${encodeURIComponent(phone)}`),

  cancel: (id: string, phone: string) =>
    request<Appointment>(`/api/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ phone, status: 'cancelled' }),
    }),
};
