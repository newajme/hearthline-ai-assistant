"use client";

import { useEffect, useState } from "react";
import {
  startConversation,
  getStoredIdentity,
  setStoredIdentity,
} from "../lib/supportClient";
import { useI18n } from "../lib/i18n";
import { MarketingFooter, MarketingTopbar } from "../MarketingShell";

type Status = "idle" | "submitting" | "success" | "error";

const SALES_EMAIL = "sales@workmento.com";
const SUPPORT_EMAIL = "support@workmento.com";

export default function ContactPage() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredIdentity();
    if (stored.name) setName(stored.name);
    if (stored.email) setEmail(stored.email);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !body.trim()) {
      setError(t("contact.error.required"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("contact.error.email"));
      return;
    }
    setStatus("submitting");
    try {
      const r = await startConversation({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim() || "(no subject)",
        body: body.trim(),
      });
      setStoredIdentity(name.trim(), email.trim());
      setTicketId(r.conversation_id);
      setBody("");
      setSubject("");
      setStatus("success");
    } catch (err) {
      setError((err as Error).message || t("contact.error.fallback"));
      setStatus("error");
    }
  }

  return (
    <>
      <MarketingTopbar />
      <main className="contact-page">
        <section className="shell hero hero-tight">
          <span className="hero-meet">
            <span className="hero-meet-avatar">@</span>
            <span>{t("contact.heroEyebrow")}</span>
          </span>
          <h1 className="hero-title">
            {t("contact.heroT1")}<br />
            <span className="hero-title-em">{t("contact.heroT2")}</span>
          </h1>
          <p className="hero-sub">{t("contact.heroSub")}</p>
        </section>

        <section className="shell section-tight">
          <div className="contact-grid">
            {/* LEFT — channels */}
            <aside className="contact-channels">
              <ChannelCard
                icon={<CalIcon />}
                title={t("contact.ch1.title")}
                body={t("contact.ch1.body")}
                cta={`${t("contact.ch1.cta")} →`}
                href={`mailto:${SALES_EMAIL}`}
                accent="#00C95C"
              />
              <ChannelCard
                icon={<MailIcon />}
                title={t("contact.ch2.title")}
                body={t("contact.ch2.body")}
                cta={SUPPORT_EMAIL}
                href={`mailto:${SUPPORT_EMAIL}`}
                accent="#2563eb"
              />
              <ChannelCard
                icon={<TicketIcon />}
                title={t("contact.ch3.title")}
                body={t("contact.ch3.body")}
                cta={t("contact.ch3.cta")}
                href="#contact-form"
                accent="#16a34a"
              />
            </aside>

            {/* RIGHT — ticket form */}
            <div id="contact-form" className="contact-card">
              <div className="contact-card-head">
                <h2 className="contact-card-title">{t("contact.cardTitle")}</h2>
                <p className="contact-card-sub">{t("contact.cardSub")}</p>
              </div>

              {status === "success" ? (
                <div className="contact-success">
                  <div className="contact-success-mark" aria-hidden>✓</div>
                  <h2>{t("contact.success.title")}</h2>
                  <p>
                    {name.split(" ")[0]} — <strong>{email}</strong>
                  </p>
                  {ticketId && (
                    <p className="contact-success-ref">
                      <code>{ticketId.slice(0, 8)}</code>
                    </p>
                  )}
                  <button
                    type="button"
                    className="contact-success-again"
                    onClick={() => {
                      setStatus("idle");
                      setTicketId(null);
                    }}
                  >
                    {t("contact.success.again")}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="contact-form">
                  <div className="contact-row">
                    <label className="contact-field">
                      <span>{t("contact.f.name")}</span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Doe"
                        required
                      />
                    </label>
                    <label className="contact-field">
                      <span>{t("contact.f.email")}</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jane@example.com"
                        required
                      />
                    </label>
                  </div>
                  <label className="contact-field">
                    <span>{t("contact.f.subject")}</span>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={t("contact.f.subjectPh")}
                    />
                  </label>
                  <label className="contact-field">
                    <span>{t("contact.f.body")}</span>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={6}
                      placeholder={t("contact.f.bodyPh")}
                      required
                    />
                  </label>

                  {error && <div className="contact-error">{error}</div>}

                  <div className="contact-actions">
                    <button
                      type="submit"
                      className="contact-submit"
                      disabled={status === "submitting"}
                    >
                      {status === "submitting" ? t("contact.f.sending") : `${t("contact.f.send")} →`}
                    </button>
                    <span className="contact-hint">{t("contact.f.hint")}</span>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

        <MarketingFooter />
      </main>
    </>
  );
}

function ChannelCard({
  icon,
  title,
  body,
  cta,
  href,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  href: string;
  accent: string;
}) {
  const external = href.startsWith("http") || href.startsWith("mailto:");
  return (
    <a
      href={href}
      target={external && !href.startsWith("mailto:") ? "_blank" : undefined}
      rel={external && !href.startsWith("mailto:") ? "noreferrer" : undefined}
      className="contact-channel"
      style={{ ["--accent" as string]: accent }}
    >
      <span className="contact-channel-icon" aria-hidden>{icon}</span>
      <div className="contact-channel-body">
        <strong>{title}</strong>
        <span>{body}</span>
        <span className="contact-channel-cta">{cta}</span>
      </div>
    </a>
  );
}

function CalIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M8 9h8M8 13h5" />
    </svg>
  );
}
function Globe() { return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>; }
function Yt() { return <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1 31.3 31.3 0 0 0 .5-5.8 31.3 31.3 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6z"/></svg>; }
function In() { return <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 1 1 8.3 6.5a1.78 1.78 0 0 1-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0 0 13 14.19a.66.66 0 0 0 0 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 0 1 2.7-1.4c1.55 0 3.36.86 3.36 3.66z"/></svg>; }
function X() { return <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>; }
