import { NextResponse } from "next/server";

import { API_URL, apiFetch, getApiUrlProblem, getCurrentUser } from "@/app/lib/api";

type Business = {
  llm_provider?: "anthropic" | "openai" | "gemini" | "groq";
  has_anthropic_key?: boolean;
  has_openai_key?: boolean;
  has_gemini_key?: boolean;
  has_groq_key?: boolean;
};

const PROVIDERS = {
  anthropic: { label: "Anthropic Claude", flag: "has_anthropic_key" },
  openai: { label: "OpenAI", flag: "has_openai_key" },
  gemini: { label: "Google Gemini", flag: "has_gemini_key" },
  groq: { label: "Groq", flag: "has_groq_key" },
} as const;

function providerStatus(business: Business | null) {
  const provider = business?.llm_provider ?? "anthropic";
  const meta = PROVIDERS[provider];
  const available = Boolean(business?.[meta.flag]);
  return {
    provider,
    provider_label: meta.label,
    available,
    message: available ? "AI provider is connected." : "Connect your AI provider before testing Demi.",
  };
}

async function selectedBusiness(): Promise<Business | null> {
  const res = await apiFetch("/businesses/");
  if (!res.ok) return null;
  const data = await res.json();
  return (data?.results?.[0] as Business | undefined) ?? null;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  const apiUrlProblem = getApiUrlProblem();
  if (apiUrlProblem) {
    return NextResponse.json({ detail: apiUrlProblem }, { status: 500 });
  }

  const business = await selectedBusiness();
  return NextResponse.json(providerStatus(business));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  const apiUrlProblem = getApiUrlProblem();
  if (apiUrlProblem) {
    return NextResponse.json({ detail: apiUrlProblem }, { status: 500 });
  }

  const body = await request.text();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = process.env.VAPI_WEBHOOK_SECRET?.trim();
  if (secret) headers.Authorization = `Bearer ${secret}`;

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/calls/vapi/chat/completions/`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ detail: "Could not reach the backend API." }, { status: 502 });
  }

  const payload = await upstream.text();
  return new NextResponse(payload, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
