import { NextResponse } from "next/server";

import { API_URL, SESSION_COOKIE, extractSessionId, getApiUrlProblem } from "@/app/lib/api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = (body.username ?? body.email ?? "").trim();
  const password = body.password ?? "";

  if (!username || !password) {
    return NextResponse.json({ detail: "Email and password are required." }, { status: 400 });
  }

  const apiUrlProblem = getApiUrlProblem();
  if (apiUrlProblem) {
    return NextResponse.json({ detail: apiUrlProblem }, { status: 500 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { detail: "Could not reach the backend API. Check INTERNAL_API_URL / NEXT_PUBLIC_API_URL and confirm the backend is deployed." },
      { status: 502 },
    );
  }

  const data = await upstream.json().catch(() => ({
    detail: "Backend login route did not return JSON. Check that the frontend points to the Django API URL ending in /api.",
  }));
  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  const sessionid = extractSessionId(upstream.headers.get("set-cookie"));
  const res = NextResponse.json(data);
  if (sessionid) {
    res.cookies.set({
      name: SESSION_COOKIE,
      value: sessionid,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
  }
  return res;
}
