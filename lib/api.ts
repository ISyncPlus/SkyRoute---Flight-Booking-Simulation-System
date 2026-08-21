/**
 * SkyRoute Backend API Client
 * ----------------------------
 * Handles communication with the Express/Prisma backend server.
 * Default: https://skyroute-server.onrender.com/api (or local via NEXT_PUBLIC_API_URL).
 * Sends credentials (HTTP-only session cookies) with every request.
 */

import type {
  Airport,
  Booking,
  CabinClass,
  Flight,
  FlightSearchResult,
  Passenger,
  Payment,
  SearchCriteria,
  SessionUser,
  TripType,
  User,
} from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://skyroute-server.onrender.com/api";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; status?: number };

export interface AdminStats {
  totalFlights: number;
  scheduledFlights: number;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalPassengers: number;
  grossRevenue: number;
  refunded: number;
  netRevenue: number;
  registeredUsers: number;
  topRoutes: { originCode: string; destinationCode: string; bookings: number; count?: number }[];
}

export interface CreateBookingRequest {
  legs: {
    flightId: string;
    cabin: CabinClass;
    seatIds: (string | null)[];
  }[];
  passengers: Omit<Passenger, "id">[];
  contactEmail: string;
  contactPhone: string;
  payment: {
    method: Payment["method"];
    cardNumber?: string;
    cardHolder?: string;
    expiry?: string;
    cvv?: string;
    senderName?: string;
    forceFailure?: boolean;
  };
  tripType?: TripType;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // Ensure session cookies are sent and received
    });

    if (res.status === 204) {
      return { ok: true, data: undefined as unknown as T };
    }

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const json = isJson ? await res.json() : null;

    if (!res.ok) {
      const errorObj = json?.error;
      const message =
        errorObj?.message ||
        (typeof json?.message === "string" ? json.message : `Request failed with status ${res.status}`);
      return {
        ok: false,
        error: message,
        fieldErrors: errorObj?.fieldErrors,
        status: res.status,
      };
    }

    return { ok: true, data: json as T };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error. Is the backend server running?";
    return { ok: false, error: message };
  }
}

export const api = {
  auth: {
    async getMe(): Promise<ApiResult<{ user: SessionUser | null }>> {
      return request<{ user: SessionUser | null }>("/auth/me", { method: "GET" });
    },

    async updateProfile(patch: { fullName?: string; phone?: string }): Promise<ApiResult<{ user: SessionUser }>> {
      return request<{ user: SessionUser }>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
    },

    async changePassword(currentPassword: string, newPassword: string): Promise<ApiResult<void>> {
      return request<void>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    },

    async getOAuthProviders(): Promise<ApiResult<{ providers: string[] }>> {
      return request<{ providers: string[] }>("/auth/oauth/providers", { method: "GET" });
    },

    async login(email: string, password: string): Promise<ApiResult<{ user: SessionUser; token?: string }>> {
      return request<{ user: SessionUser; token?: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },

    async register(input: {
      fullName: string;
      email: string;
      phone?: string;
      password: string;
    }): Promise<ApiResult<{ user: SessionUser; token?: string }>> {
      return request<{ user: SessionUser; token?: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    async logout(): Promise<ApiResult<void>> {
      return request<void>("/auth/logout", { method: "POST" });
    },

    async logoutAll(): Promise<ApiResult<void>> {
      return request<void>("/auth/logout-all", { method: "POST" });
    },
  },

  flights: {
    async listAirports(): Promise<ApiResult<{ airports: Airport[] }>> {
      return request<{ airports: Airport[] }>("/flights/airports", { method: "GET" });
    },

    async search(criteria: SearchCriteria): Promise<ApiResult<{ legs: { originCode: string; destinationCode: string; departureDate: string; results: FlightSearchResult[] }[] }>> {
      const params = new URLSearchParams();
      params.set("originCode", criteria.originCode);
      params.set("destinationCode", criteria.destinationCode);
      params.set("departureDate", criteria.departureDate);
      if (criteria.cabin) params.set("cabin", criteria.cabin);
      if (criteria.adults) params.set("adults", String(criteria.adults));
      if (criteria.children) params.set("children", String(criteria.children));
      if (criteria.infants) params.set("infants", String(criteria.infants));
      if (criteria.tripType) params.set("tripType", criteria.tripType);
      if (criteria.returnDate) params.set("returnDate", criteria.returnDate);

      return request<{ legs: { originCode: string; destinationCode: string; departureDate: string; results: FlightSearchResult[] }[] }>(
        `/flights/search?${params.toString()}`,
        { method: "GET" },
      );
    },

    async getAlternativeDates(params: {
      originCode: string;
      destinationCode: string;
      date: string;
    }): Promise<ApiResult<{ dates: string[] }>> {
      const q = new URLSearchParams({
        originCode: params.originCode,
        destinationCode: params.destinationCode,
        date: params.date,
      });
      return request<{ dates: string[] }>(`/flights/alternative-dates?${q.toString()}`, { method: "GET" });
    },

    async getById(id: string): Promise<ApiResult<{ flight: Flight }>> {
      return request<{ flight: Flight }>(`/flights/${encodeURIComponent(id)}`, { method: "GET" });
    },

    async getSeats(id: string): Promise<ApiResult<{ flight: Flight; seats: import("./types").Seat[]; cabins: import("./types").CabinConfig[] }>> {
      return request<{ flight: Flight; seats: import("./types").Seat[]; cabins: import("./types").CabinConfig[] }>(
        `/flights/${encodeURIComponent(id)}/seats`,
        { method: "GET" },
      );
    },
  },

  bookings: {
    async create(payload: CreateBookingRequest): Promise<ApiResult<{ booking: Booking }>> {
      return request<{ booking: Booking }>("/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async listMine(): Promise<ApiResult<{ bookings: Booking[] }>> {
      return request<{ bookings: Booking[] }>("/bookings", { method: "GET" });
    },

    async getByPnr(pnr: string): Promise<ApiResult<{ booking: Booking }>> {
      return request<{ booking: Booking }>(`/bookings/${encodeURIComponent(pnr)}`, { method: "GET" });
    },

    async lookup(pnr: string, surname: string): Promise<ApiResult<{ booking: Booking; refundIfCancelled?: number }>> {
      return request<{ booking: Booking; refundIfCancelled?: number }>("/bookings/lookup", {
        method: "POST",
        body: JSON.stringify({ pnr, surname }),
      });
    },

    async cancel(pnr: string, reason?: string): Promise<ApiResult<{ booking: Booking; refund: number }>> {
      return request<{ booking: Booking; refund: number }>(`/bookings/${encodeURIComponent(pnr)}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
    },
  },

  admin: {
    async getStats(): Promise<ApiResult<{ stats: AdminStats }>> {
      return request<{ stats: AdminStats }>("/admin/stats", { method: "GET" });
    },

    async listFlights(): Promise<ApiResult<{ flights: Flight[] }>> {
      return request<{ flights: Flight[] }>("/admin/flights", { method: "GET" });
    },

    async createFlight(flightData: Partial<Flight>): Promise<ApiResult<{ flight: Flight }>> {
      return request<{ flight: Flight }>("/admin/flights", {
        method: "POST",
        body: JSON.stringify(flightData),
      });
    },

    async updateFlight(id: string, patch: Partial<Flight>): Promise<ApiResult<{ flight: Flight }>> {
      return request<{ flight: Flight }>(`/admin/flights/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
    },

    async deleteFlight(id: string): Promise<ApiResult<void>> {
      return request<void>(`/admin/flights/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },

    async listBookings(params?: { page?: number; pageSize?: number; search?: string; status?: string }): Promise<
      ApiResult<{ bookings: Booking[]; page: number; pageSize: number; total: number; totalPages: number }>
    > {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
      if (params?.search) searchParams.set("search", params.search);
      if (params?.status) searchParams.set("status", params.status);

      return request<{ bookings: Booking[]; page: number; pageSize: number; total: number; totalPages: number }>(
        `/admin/bookings?${searchParams.toString()}`,
        { method: "GET" },
      );
    },

    async listUsers(params?: { search?: string; role?: string }): Promise<ApiResult<{ users: User[] }>> {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set("search", params.search);
      if (params?.role) searchParams.set("role", params.role);

      return request<{ users: User[] }>(`/admin/users?${searchParams.toString()}`, { method: "GET" });
    },
  },
};
