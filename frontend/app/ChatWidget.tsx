"use client";

import { useEffect, useRef, useState } from "react";
import {
  startConversation,
  sendMessage,
  loadHistory,
  connectLiveSocket,
  hasLiveSession,
  resetLiveSession,
  closeConversation,
  getStoredIdentity,
  setStoredIdentity,
  type SupportMessage,
  type LiveSocket,
} from "./lib/supportClient";

type Msg = { role: "ai" | "user" | "system" | "staff"; text: string; ts: number };
type Mode = "ai" | "intake" | "live";

const SCRIPT: Array<{ user: string; ai: string[] }> = [
  {
    user: "Need a quote for 5 windows",
    ai: [
      "Got it — 5 windows. Are these standard PVC and around 1.2m × 1.4m?",
      "If yes, indicative price starts around $3,500 fitted.",
    ],
  },
  {
    user: "Can someone come Saturday morning?",
    ai: [
      "I have Saturday at 9 AM open with our window team.",
      "Want me to lock that in and text you the confirmation?",
    ],
  },
  {
    user: "Do solar panels qualify for the new state rebate?",
    ai: [
      "Yes — properties under $400k AV qualify for the 30% rebate this year.",
      "I can check your address and bundle the savings into your quote.",
    ],
  },
];

const INTRO: Msg = {
  role: "ai",
  text: "Hi! I'm Anna from Hearthline. Need a quote, want to book a job, or have a question on a recent visit?",
  ts: Date.now(),
};

const HANDOFF_INTRO: Msg = {
  role: "system",
  text: "Connecting you to a human teammate — they'll see this conversation and reply here.",
  ts: Date.now(),
};

function fromSupport(m: SupportMessage): Msg {
  return {
    role: m.author_type === "staff" ? "staff" : m.author_type === "system" ? "system" : "user",
    text: m.body,
    ts: new Date(m.created_at).getTime(),
  };
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [mode, setMode] = useState<Mode>("ai");
  const [messages, setMessages] = useState<Msg[]>([INTRO]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [liveStatus, setLiveStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [identity, setIdentity] = useState<{ name: string; email: string }>({ name: "", email: "" });
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const scriptIdx = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<LiveSocket | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  // Hydrate stored identity once on mount
  useEffect(() => {
    setIdentity(getStoredIdentity());
  }, []);

  // Reveal once visitor scrolls past hero
  useEffect(() => {
    function onScroll() {
      const trigger = Math.max(800, window.innerHeight * 1.4);
      if (window.scrollY > trigger) {
        setRevealed(true);
        setTeaser(true);
        window.removeEventListener("scroll", onScroll);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!teaser) return;
    const t = setTimeout(() => setTeaser(false), 8000);
    return () => clearTimeout(t);
  }, [teaser]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  // If a previous live session exists in localStorage, reload its history when widget opens
  useEffect(() => {
    if (!open || mode !== "ai") return;
    if (!hasLiveSession()) return;
    // Auto-resume live mode for returning visitors
    void resumeLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  function pushMessage(m: Msg, dedupKey?: string) {
    if (dedupKey) {
      if (seenIds.current.has(dedupKey)) return;
      seenIds.current.add(dedupKey);
    }
    setMessages((prev) => [...prev, m]);
  }

  function send(text: string) {
    if (!text.trim()) return;
    if (mode === "live") {
      void sendLive(text);
      return;
    }
    sendAI(text);
  }

  function sendAI(text: string) {
    pushMessage({ role: "user", text, ts: Date.now() });
    setDraft("");
    setThinking(true);
    const idx = scriptIdx.current % SCRIPT.length;
    const replies = SCRIPT[idx].ai;
    scriptIdx.current += 1;
    let delay = 900;
    replies.forEach((reply, i) => {
      setTimeout(() => {
        pushMessage({ role: "ai", text: reply, ts: Date.now() });
        if (i === replies.length - 1) setThinking(false);
      }, delay);
      delay += 1100;
    });
  }

  async function sendLive(text: string) {
    if (closed) return;
    pushMessage({ role: "user", text, ts: Date.now() });
    setDraft("");
    try {
      const msg = await sendMessage(text);
      // Mark as seen so the WS echo doesn't duplicate it
      seenIds.current.add(msg.id);
    } catch (e) {
      const msg = (e as Error).message || "";
      if (msg.includes("closed")) {
        setClosed(true);
        pushMessage({
          role: "system",
          text: "This conversation is closed. Start a new one to keep talking.",
          ts: Date.now(),
        });
      } else {
        pushMessage({
          role: "system",
          text: "Couldn't deliver that message — please try again in a moment.",
          ts: Date.now(),
        });
      }
      console.error(e);
    }
  }

  function requestLiveChat() {
    const stored = getStoredIdentity();
    if (stored.name && stored.email) {
      void startLiveChat();
      return;
    }
    setIntakeError(null);
    setMode("intake");
  }

  async function submitIntake(name: string, email: string) {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) { setIntakeError("Please enter your name."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setIntakeError("Please enter a valid email."); return;
    }
    setStoredIdentity(trimmedName, trimmedEmail);
    setIdentity({ name: trimmedName, email: trimmedEmail });
    await startLiveChat();
  }

  async function startLiveChat(prefill?: string) {
    setMode("live");
    setLiveStatus("connecting");
    pushMessage(HANDOFF_INTRO);

    const opener =
      prefill ||
      messages
        .filter((m) => m.role === "user")
        .slice(-1)[0]?.text ||
      "Hi, I'd like to talk to someone.";

    try {
      const stored = getStoredIdentity();
      const { message } = await startConversation({
        body: opener,
        name: stored.name,
        email: stored.email,
      });
      seenIds.current.add(message.id);

      // Reload existing history to surface staff replies if visitor was returning
      const history = await loadHistory();
      const newMsgs: Msg[] = history
        .filter((m) => !seenIds.current.has(m.id))
        .map((m) => {
          seenIds.current.add(m.id);
          return fromSupport(m);
        });
      if (newMsgs.length > 0) setMessages((prev) => [...prev, ...newMsgs]);

      // Open WebSocket for incoming staff replies (with auto-reconnect)
      wsRef.current?.close();
      wsRef.current = connectLiveSocket(
        (m) => {
          if (seenIds.current.has(m.id)) return;
          seenIds.current.add(m.id);
          if (m.author_type === "staff" || m.author_type === "system") {
            pushMessage(fromSupport(m));
          }
          if (m.author_type === "system" && /ended|resolved/i.test(m.body)) {
            setClosed(true);
          }
        },
        (status) => {
          setLiveStatus(
            status === "connected" ? "connected" : status === "connecting" ? "connecting" : "idle",
          );
        },
      );
    } catch (e) {
      console.error(e);
      pushMessage({
        role: "system",
        text: "We couldn't reach a human agent right now. Please try again shortly.",
        ts: Date.now(),
      });
      setLiveStatus("error");
      setMode("ai");
    }
  }

  async function resumeLive() {
    setMode("live");
    setLiveStatus("connecting");
    try {
      const history = await loadHistory();
      const fresh: Msg[] = history
        .filter((m) => {
          if (seenIds.current.has(m.id)) return false;
          seenIds.current.add(m.id);
          return true;
        })
        .map(fromSupport);
      if (fresh.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            text: "Welcome back — picking up where you left off.",
            ts: Date.now(),
          },
          ...fresh,
        ]);
      }
      wsRef.current?.close();
      wsRef.current = connectLiveSocket(
        (m) => {
          if (seenIds.current.has(m.id)) return;
          seenIds.current.add(m.id);
          if (m.author_type === "staff" || m.author_type === "system") {
            pushMessage(fromSupport(m));
          }
          if (m.author_type === "system" && /ended|resolved/i.test(m.body)) {
            setClosed(true);
          }
        },
        (status) => {
          setLiveStatus(
            status === "connected" ? "connected" : status === "connecting" ? "connecting" : "idle",
          );
        },
      );
    } catch {
      resetLiveSession();
      setMode("ai");
      setLiveStatus("idle");
    }
  }

  function endLiveChat() {
    if (!closed) {
      // Tell backend so staff get notified + DB updates.
      void closeConversation();
    }
    wsRef.current?.close();
    wsRef.current = null;
    resetLiveSession();
    seenIds.current.clear();
    setLiveStatus("idle");
    setMode("ai");
    setClosed(false);
    pushMessage({
      role: "system",
      text: "You're back with Anna. Want to ask something else?",
      ts: Date.now(),
    });
  }

  function trigger(presetText: string) {
    if (!open) setOpen(true);
    send(presetText);
  }

  return (
    <>
      {/* TEASER bubble */}
      {!open && revealed && teaser && (
        <div className="chat-teaser">
          <button
            type="button"
            className="chat-teaser-main"
            onClick={() => { setOpen(true); setTeaser(false); }}
            aria-label="Open Anna chat"
          >
            <span className="chat-teaser-avatar">A</span>
            <div>
              <div className="chat-teaser-title">Anna · Hearthline AI</div>
              <div className="chat-teaser-body">Hi! Need a quote or want to book? Ask me anything.</div>
            </div>
          </button>
          <button
            type="button"
            className="chat-teaser-close"
            onClick={() => setTeaser(false)}
            aria-label="Dismiss Anna teaser"
          >
            ×
          </button>
        </div>
      )}

      {/* FAB launcher */}
      {!open && revealed && (
        <button className="chat-fab" onClick={() => { setOpen(true); setTeaser(false); }} aria-label="Open chat">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="chat-fab-pulse" />
        </button>
      )}

      {/* PANEL */}
      {open && (
        <div className="chat-panel">
          <div className="chat-head">
            <div className="chat-head-left">
              <span className="chat-avatar">{mode === "live" ? "H" : "A"}</span>
              <div>
                <div className="chat-name">
                  {mode === "live" ? "Hearthline Support" : "Anna"} <span className="chat-online" />
                </div>
                <div className="chat-role">
                  {mode === "live"
                    ? liveStatus === "connected"
                      ? "Connected to a human · live"
                      : liveStatus === "connecting"
                      ? "Connecting…"
                      : "Live chat"
                    : "Hearthline AI · replies in seconds"}
                </div>
              </div>
            </div>
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">×</button>
          </div>

          {mode === "intake" ? (
            <IntakeForm
              initialName={identity.name}
              initialEmail={identity.email}
              error={intakeError}
              onCancel={() => setMode("ai")}
              onSubmit={submitIntake}
            />
          ) : (
            <>
              <div className="chat-messages" ref={scrollRef}>
                {messages.map((m, i) => (
                  <div key={i} className={`chat-msg ${m.role}`}>
                    {(m.role === "ai" || m.role === "staff") && (
                      <span className="chat-msg-avatar">{m.role === "staff" ? "H" : "A"}</span>
                    )}
                    <div className="chat-msg-bubble">{m.text}</div>
                  </div>
                ))}
                {thinking && (
                  <div className="chat-msg ai">
                    <span className="chat-msg-avatar">A</span>
                    <div className="chat-msg-bubble typing">
                      <span className="typing-dots"><i /><i /><i /></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick replies / mode controls */}
              <div className="chat-quick">
                {mode === "ai" ? (
                  <>
                    <button onClick={() => trigger("Need a quote for 5 windows")}>Get a quote</button>
                    <button onClick={() => trigger("Can someone come Saturday morning?")}>Book a visit</button>
                    <button
                      onClick={requestLiveChat}
                      style={{ background: "#0f172a", color: "white", borderColor: "#0f172a" }}
                    >
                      Talk to a human
                    </button>
                  </>
                ) : closed ? (
                  <button
                    onClick={endLiveChat}
                    style={{ background: "#0f172a", color: "white", borderColor: "#0f172a" }}
                  >
                    Start a new chat
                  </button>
                ) : (
                  <button onClick={endLiveChat}>End live chat</button>
                )}
              </div>

              {closed && mode === "live" ? (
                <div className="chat-closed-banner">
                  This conversation is closed. Start a new chat to send another message.
                </div>
              ) : (
                <form
                  className="chat-input"
                  onSubmit={(e) => { e.preventDefault(); send(draft); }}
                >
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={mode === "live" ? "Message a human…" : "Type a message…"}
                    autoFocus
                  />
                  <button type="submit" aria-label="Send">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

function IntakeForm({
  initialName,
  initialEmail,
  error,
  onCancel,
  onSubmit,
}: {
  initialName: string;
  initialEmail: string;
  error: string | null;
  onCancel: () => void;
  onSubmit: (name: string, email: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="chat-intake"
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
          await onSubmit(name, email);
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <div className="chat-intake-title">Before we connect you</div>
      <div className="chat-intake-sub">
        So our team knows who they're talking to.
      </div>
      <label className="chat-intake-field">
        <span>Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          autoFocus
          required
        />
      </label>
      <label className="chat-intake-field">
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
          required
        />
      </label>
      {error && <div className="chat-intake-error">{error}</div>}
      <div className="chat-intake-actions">
        <button type="button" className="chat-intake-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="chat-intake-submit" disabled={submitting}>
          {submitting ? "Connecting…" : "Start chat"}
        </button>
      </div>
    </form>
  );
}
