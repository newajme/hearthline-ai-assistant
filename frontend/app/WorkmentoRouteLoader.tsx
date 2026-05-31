"use client";

import { useEffect, useState } from "react";

const LOADER_MESSAGES = [
  "Preparing your workspace…",
  "Demi is organizing your front desk…",
  "Almost there. Your dashboard is coming into focus.",
];

export default function WorkmentoRouteLoader() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % LOADER_MESSAGES.length);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="workmento-route-loader" role="status" aria-live="polite" aria-busy="true">
      <img
        className="workmento-route-loader-gif"
        src="/branding/workmento-loader.gif"
        alt=""
      />
      <span className="workmento-route-loader-text">{LOADER_MESSAGES[messageIndex]}</span>
    </div>
  );
}
