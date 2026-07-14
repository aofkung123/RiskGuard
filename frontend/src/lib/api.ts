"use client";

export type UserRole = "employer" | "contractor" | "group_ceo" | "admin";

export interface CurrentUser {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string | null;
  address?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  company_name?: string | null;
  tax_id?: string | null;
  profile_completed?: boolean;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getApiBase() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  if (typeof window === "undefined") return "http://localhost:8000";
  return `http://${window.location.hostname || "localhost"}:8000`;
}

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

export function getStoredRole(): UserRole | null {
  if (typeof window === "undefined") return null;
  const role = window.localStorage.getItem("role");
  return ["employer", "contractor", "group_ceo", "admin"].includes(role || "") ? role as UserRole : null;
}

export function saveSession(token: string, role: UserRole, user?: Pick<CurrentUser, "id" | "full_name" | "email">) {
  window.localStorage.setItem("token", token);
  window.localStorage.setItem("role", role);
  if (user?.id) window.localStorage.setItem("user_id", String(user.id));
  if (user?.full_name) window.localStorage.setItem("full_name", user.full_name);
  if (user?.email) window.localStorage.setItem("email", user.email);
}

export function clearSession() {
  window.localStorage.removeItem("token");
  window.localStorage.removeItem("role");
  window.localStorage.removeItem("user_id");
  window.localStorage.removeItem("full_name");
  window.localStorage.removeItem("email");
}

export function roleHomePath(role: UserRole) {
  if (role === "employer") return "/dashboard";
  if (role === "contractor") return "/dashboard";
  if (role === "group_ceo") return "/group-ceo/dashboard";
  return "/dashboard";
}

export function roleDashboardPath(role: UserRole) {
  if (role === "employer") return "/employer/dashboard";
  if (role === "contractor") return "/contractor/dashboard";
  if (role === "group_ceo") return "/group-ceo/dashboard";
  return "/dashboard";
}

export function errorMessage(error: unknown, fallback = "เกิดข้อผิดพลาด กรุณาลองใหม่") {
  if (error instanceof Error) {
    if (error.message === "Failed to fetch") {
      return "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า Backend กำลังทำงานอยู่";
    }
    return error.message;
  }
  return fallback;
}

function makeHeaders(headers?: HeadersInit, hasBody = false) {
  const next = new Headers(headers);
  const token = getAuthToken();
  if (token && !next.has("Authorization")) next.set("Authorization", `Bearer ${token}`);
  if (hasBody && !next.has("Content-Type")) next.set("Content-Type", "application/json");
  return next;
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const hasBody = init.body !== undefined;
  const response = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: makeHeaders(init.headers, hasBody),
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    if (payload && typeof payload === "object" && "detail" in payload) {
      const detail = (payload as { detail?: unknown }).detail;
      message = typeof detail === "string" ? detail : message;
    } else if (typeof payload === "string") {
      message = payload;
    }
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export async function fetchCurrentUser() {
  if (!getAuthToken()) return null;
  try {
    return await apiRequest<CurrentUser>("/api/profile/me");
  } catch {
    clearSession();
    return null;
  }
}
