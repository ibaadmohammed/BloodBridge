import type { Appointment, BloodBank, BookingInput, Slot } from './types/appointment';

// Same convention as api.js: empty in dev (Vite proxies /api), backend URL on Vercel.
const BASE: string = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
  if (!isJson) {
    throw new ApiError('Could not reach the BloodBridge server. Please try again later.', res.status);
  }
  const body = await res.json();
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
