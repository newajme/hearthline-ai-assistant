"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUSES = ["new", "qualifying", "quoted", "booked", "won", "lost"];

type FormState = {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  project_summary: string;
  estimated_value: string;
  status: string;
};

const INITIAL_FORM: FormState = {
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  project_summary: "",
  estimated_value: "",
  status: "new",
};

function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function NewLeadForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  async function submit() {
    if (saving) return;
    if (!form.customer_name.trim() && !form.customer_phone.trim() && !form.customer_email.trim()) {
      setError("Add a customer name, phone, or email.");
      return;
    }
    if (!form.project_summary.trim()) {
      setError("Project summary is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        estimated_value: form.estimated_value.trim() || null,
        idempotency_key: idempotencyKey,
      };
      const res = await fetch("/api/proxy/leads/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = typeof data?.detail === "string" ? data.detail : null;
        const nonField = Array.isArray(data?.non_field_errors) ? data.non_field_errors.join(" ") : null;
        throw new Error(detail ?? nonField ?? "Could not create lead.");
      }
      setIdempotencyKey(newIdempotencyKey());
      router.push(`/dashboard/leads/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="app-pagebar">
        <div>
          <h1>New lead</h1>
          <p>
            <Link href="/dashboard/leads" className="btn btn-back">← Back to leads</Link>
            {" · Add a customer request without leaving Workmento."}
          </p>
        </div>
        <div className="app-pagebar-actions">
          <button type="button" className="btn btn-brand" onClick={submit} disabled={saving}>
            {saving ? "Creating…" : "Create lead"}
          </button>
        </div>
      </div>

      <div className="app-content">
        {error && <div className="banner-error">{error}</div>}
        <article className="dash-card new-lead-card">
          <div className="dash-card-head">
            <h2>Customer and project</h2>
            <span className="dash-card-meta">Native Workmento form</span>
          </div>

          <div className="settings-form">
            <Field label="Customer name">
              <input className="text-input" value={form.customer_name} onChange={(e) => update("customer_name", e.target.value)} placeholder="Jordan Miles" />
            </Field>
            <Field label="Phone">
              <input className="text-input" type="tel" value={form.customer_phone} onChange={(e) => update("customer_phone", e.target.value)} placeholder="+1 (555) 010-1010" />
            </Field>
            <Field label="Email">
              <input className="text-input" type="email" value={form.customer_email} onChange={(e) => update("customer_email", e.target.value)} placeholder="customer@example.test" />
            </Field>
            <Field label="Estimated value">
              <input className="text-input" inputMode="decimal" value={form.estimated_value} onChange={(e) => update("estimated_value", e.target.value)} placeholder="2500" />
            </Field>
            <Field label="Status">
              <select className="text-input" value={form.status} onChange={(e) => update("status", e.target.value)}>
                {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </Field>
            <label className="settings-field settings-field-full">
              <span className="settings-field-label">Project summary</span>
              <textarea className="text-input new-lead-summary" value={form.project_summary} onChange={(e) => update("project_summary", e.target.value)} placeholder="Customer needs a quote for..." />
              <span className="settings-field-hint">Keep it practical. Demi can enrich this later from calls and messages.</span>
            </label>
          </div>
        </article>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="settings-field">
      <span className="settings-field-label">{label}</span>
      {children}
    </label>
  );
}
