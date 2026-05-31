"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Demi } from "./Demi";
import { useI18n } from "./lib/i18n";

type Phase = "ringing" | "live" | "ended";

type Bubble = { role: "in" | "out"; text: string };

const SCRIPT_KEYS: Array<{ role: "in" | "out"; key: string; afterMs: number }> = [
  { role: "out", key: "demiModal.line1", afterMs: 600 },
  { role: "in",  key: "demiModal.line2", afterMs: 2600 },
  { role: "out", key: "demiModal.line3", afterMs: 4800 },
  { role: "in",  key: "demiModal.line4", afterMs: 7000 },
  { role: "out", key: "demiModal.line5", afterMs: 9000 },
];

const DEMO_URL = "/contact";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function DemiDemoModal({ open, onClose }: Props) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("ringing");
  const [seconds, setSeconds] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [typingFor, setTypingFor] = useState<"in" | "out" | null>(null);
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    setPhase("ringing");
    setSeconds(0);
    setBubbles([]);
    setTypingFor(null);

    const ringTimer = setTimeout(() => {
      setPhase("live");
      setTypingFor("out");
    }, 2200);

    return () => clearTimeout(ringTimer);
  }, [open]);

  useEffect(() => {
    if (!open || phase !== "live") return;
    const tick = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, [open, phase]);

  useEffect(() => {
    if (!open || phase !== "live") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    SCRIPT_KEYS.forEach((entry, i) => {
      timers.push(
        setTimeout(() => {
          setBubbles((cur) => [...cur, { role: entry.role, text: t(entry.key) }]);
          const next = SCRIPT_KEYS[i + 1];
          setTypingFor(next ? next.role : null);
          if (i === SCRIPT_KEYS.length - 1) {
            timers.push(setTimeout(() => setPhase("ended"), 2200));
          }
        }, entry.afterMs),
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [open, phase, t]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");

  return createPortal(
    <div
      className="demi-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Demi live demo"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="demi-modal" ref={dialogRef}>
        <button
          ref={closeBtnRef}
          className="demi-modal-close"
          aria-label="Close demo"
          onClick={onClose}
          type="button"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="demi-modal-head">
          <span className="demi-modal-eyebrow">
            <span className="dot-pulse" aria-hidden /> {t("demiModal.eyebrow")}
          </span>
          <h3 className="demi-modal-title">{t("demiModal.title")}</h3>
        </div>

        <div className="demi-modal-stage">
          {/* Phone card */}
          <div className={`demi-phone phase-${phase}`}>
            <div className="demi-phone-glow" aria-hidden />
            <div className="demi-phone-avatar">
              {phase === "ringing" && (
                <>
                  <span className="phone-avatar-ring" />
                  <span className="phone-avatar-ring delay" />
                </>
              )}
              <Demi size={56} />
            </div>
            <div className="demi-phone-name">Demi · Workmento</div>
            <div className="demi-phone-status">
              {phase === "ringing" && t("demiModal.statusRinging")}
              {phase === "live" && (
                <>
                  <span className="dot-pulse" aria-hidden /> {t("demiModal.statusConnected")} · {mm}:{ss}
                </>
              )}
              {phase === "ended" && t("demiModal.statusEnded")}
            </div>
          </div>

          {/* Transcript feed */}
          <div className="demi-feed" aria-live="polite">
            {phase === "ringing" && (
              <div className="demi-feed-empty">
                <span className="demi-feed-empty-dots"><i /><i /><i /></span>
                <span>{t("demiModal.dialing")}</span>
              </div>
            )}
            {phase !== "ringing" && (
              <>
                {bubbles.map((b, i) => (
                  <div key={i} className={`demi-feed-bubble ${b.role}`}>
                    <span className="demi-feed-avatar">
                      {b.role === "out" ? "D" : (
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></svg>
                      )}
                    </span>
                    <span className="demi-feed-text">{b.text}</span>
                  </div>
                ))}
                {typingFor && phase === "live" && (
                  <div className={`demi-feed-bubble ${typingFor} typing`}>
                    <span className="demi-feed-avatar">
                      {typingFor === "out" ? "D" : (
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></svg>
                      )}
                    </span>
                    <span className="demi-feed-text">
                      <span className="typing-dots"><i /><i /><i /></span>
                    </span>
                  </div>
                )}
                {phase === "ended" && (
                  <div className="demi-feed-summary">
                    <div className="demi-feed-summary-title">{t("demiModal.summaryTitle")}</div>
                    <ul>
                      <li>{t("demiModal.summary1")}</li>
                      <li>{t("demiModal.summary2")}</li>
                      <li>{t("demiModal.summary3")}</li>
                      <li>{t("demiModal.summary4")}</li>
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="demi-modal-foot">
          <p className="demi-modal-foot-note">{t("demiModal.foot")}</p>
          <div className="demi-modal-actions">
            <a href={DEMO_URL} target="_blank" rel="noreferrer" className="btn btn-primary">
              {t("demiModal.bookReal")}
            </a>
            <Link href="/dashboard/test-call" className="btn btn-ghost" onClick={onClose}>
              {t("demiModal.openSim")} →
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
