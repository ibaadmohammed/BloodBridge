import type {
  Appointment,
  BloodBank,
  BookingInput,
  Slot,
} from "./types/appointment";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const API_BASE_URL = "https://bloodbridge-6jwv.onrender.com";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      body?.error ?? `Request failed (${res.status})`,
      res.status,
    );
  }

  if (body === null) {
    throw new ApiError("Invalid server response", res.status);
  }

  return body as T;
}

function requireArray<T>(data: unknown, label: string): T[] {
  if (!Array.isArray(data)) {
    throw new ApiError(`Invalid ${label} response: expected an array.`, 500);
  }

  return data as T[];
}

export const appointmentsApi = {
  bloodBanks: async (): Promise<BloodBank[]> => {
    const data = await request<unknown>("/api/bloodbanks");
    return requireArray<BloodBank>(data, "blood banks");
  },

  slots: async (
    centerId: string,
    date: string,
    signal?: AbortSignal,
  ): Promise<Slot[]> => {
    const data = await request<unknown>(
      `/api/appointments/slots?centerId=${encodeURIComponent(centerId)}&date=${encodeURIComponent(date)}`,
      { signal },
    );

    return requireArray<Slot>(data, "slots");
  },

  book: (input: BookingInput): Promise<Appointment> =>
    request<Appointment>("/api/appointments", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  listByPhone: async (phone: string): Promise<Appointment[]> => {
    const data = await request<unknown>(
      `/api/appointments?phone=${encodeURIComponent(phone)}`,
    );

    return requireArray<Appointment>(data, "appointments");
  },

  cancel: (id: string, phone: string): Promise<Appointment> =>
    request<Appointment>(`/api/appointments/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        phone,
        status: "cancelled",
      }),
    }),
};
