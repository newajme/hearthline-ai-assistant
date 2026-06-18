"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type UserProfile = {
  id: number;
  username: string;
  display_name: string;
  email: string;
  avatar_url: string;
  initials: string;
  avatar_storage: "external_url_only";
};

type FormState = {
  display_name: string;
  avatar_url: string;
};

function pickEditable(profile: UserProfile): FormState {
  return {
    display_name: profile.display_name ?? "",
    avatar_url: profile.avatar_url ?? "",
  };
}

export default function UserProfileForm({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const initial = pickEditable(profile);
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const previewInitials = (form.display_name || profile.username || profile.email || "U").trim().slice(0, 2).toUpperCase();

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSavedAt(null);
    setError(null);
  }

  async function onSave() {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/auth/profile/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail ?? "Failed to save profile.");
      setSavedAt(new Date());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="dash-card settings-profile user-profile-card">
      <div className="settings-profile-head">
        <span className="settings-profile-mark user-profile-avatar">
          {form.avatar_url ? <img src={form.avatar_url} alt="" /> : previewInitials}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0 }}>Your profile</h2>
          <p className="settings-profile-sub">Signed-in user · {profile.email || profile.username}</p>
        </div>
        <div className="settings-saved">
          {error && <span className="settings-saved-err">{error}</span>}
          {!error && savedAt && <span className="settings-saved-ok">Saved · {savedAt.toLocaleTimeString()}</span>}
          {!error && !savedAt && dirty && <span className="settings-saved-dirty">Unsaved changes</span>}
        </div>
      </div>

      <div className="settings-form">
        <label className="settings-field">
          <span className="settings-field-label">Display name</span>
          <input className="text-input" value={form.display_name} onChange={(e) => update("display_name", e.target.value)} placeholder="Your name" />
        </label>
        <label className="settings-field">
          <span className="settings-field-label">Account email</span>
          <input className="text-input" value={profile.email} disabled readOnly />
          <span className="settings-field-hint">Email changes are not available from Workmento settings yet.</span>
        </label>
        <label className="settings-field settings-field-full">
          <span className="settings-field-label">Avatar URL</span>
          <input className="text-input" value={form.avatar_url} onChange={(e) => update("avatar_url", e.target.value)} placeholder="https://example.test/avatar.png" />
          <span className="settings-field-hint">Persistent avatar uploads need object storage. For now, use a hosted image URL or leave blank for initials.</span>
        </label>
      </div>

      <div className="settings-actions">
        <button type="button" className="btn btn-ghost" onClick={() => setForm(initial)} disabled={!dirty || saving}>Reset</button>
        <button type="button" className="btn btn-brand" onClick={onSave} disabled={!dirty || saving}>{saving ? "Saving…" : "Save profile"}</button>
      </div>
    </article>
  );
}
