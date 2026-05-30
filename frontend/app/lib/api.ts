/**
 * Server-side helper for talking to the Django API.
 *
 * The Next.js server holds a `hearthline_session` cookie (the Django sessionid
 * captured at login). We forward it as `Cookie: sessionid=...` so Django sees an
 * authenticated request. This works across separate frontend/backend domains.
 */
import { cookies } from "next/headers";

export const API_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000/api";

export function getApiUrlProblem(): string | null {
  if (process.env.NODE_ENV !== "production") return null;
  if (!process.env.INTERNAL_API_URL && !process.env.NEXT_PUBLIC_API_URL) {
    return "Backend URL is not configured. Set INTERNAL_API_URL or NEXT_PUBLIC_API_URL to your Django API URL, including /api.";
  }
  if (API_URL.includes("localhost") || API_URL.includes("127.0.0.1")) {
    return "Backend URL points to localhost in production. Set it to the deployed Django API URL, including /api.";
  }
  if (!API_URL.replace(/\/+$/, "").endsWith("/api")) {
    return "Backend URL is missing the /api suffix. Set INTERNAL_API_URL or NEXT_PUBLIC_API_URL to your Django API URL, including /api.";
  }
  return null;
}

export const SESSION_COOKIE = "hearthline_session";

export { getAdminUrl } from "./adminUrl";

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE)?.value;
  const headers = new Headers(init.headers);
  if (session) {
    headers.set("Cookie", `sessionid=${session}`);
  }
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function apiJson<T>(path: string): Promise<T | null> {
  try {
    const res = await apiFetch(path);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type SessionUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  is_staff: boolean;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const res = await apiFetch("/auth/me/");
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.user as SessionUser) ?? null;
  } catch {
    // Backend unreachable — treat as signed-out so the auth gate can redirect cleanly.
    return null;
  }
}

/** Pull the `sessionid=...` value out of an upstream Set-Cookie header. */
export function extractSessionId(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const match = setCookie.match(/sessionid=([^;]+)/i);
  return match ? match[1] : null;
}
