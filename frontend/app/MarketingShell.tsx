"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";

import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import WorkmentoLogo from "./WorkmentoLogo";
import WorkmentoRouteLoader from "./WorkmentoRouteLoader";
import { useI18n } from "./lib/i18n";

const DEMO_URL = "/contact";
const REPO_URL = "https://github.com/workmento/workmento";
const DASHBOARD_LOGIN_HREF = "/login?next=/dashboard";
const DASHBOARD_LOGIN_MIN_LOAD_MS = 3000;

export type NavLink = { href: string; label: string };

function defaultLinks(t: (k: string) => string): NavLink[] {
  return [
    { href: "/#story", label: t("nav.how") },
    { href: "/#features", label: t("nav.features") },
    { href: "/#industries", label: t("nav.industries") },
  ];
}

type TopbarProps = {
  links?: NavLink[];
  ossPill?: string;
};

export function MarketingTopbar({
  links,
  ossPill,
}: TopbarProps) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);
  const resolvedLinks = links ?? defaultLinks(t);
  const enhanceLoginCta = pathname === "/";

  function onDashboardLoginClick(ev: MouseEvent<HTMLAnchorElement>) {
    if (!enhanceLoginCta) return;
    ev.preventDefault();
    if (openingDashboard) {
      return;
    }
    setOpen(false);
    setOpeningDashboard(true);
    router.prefetch(DASHBOARD_LOGIN_HREF);
    window.setTimeout(() => {
      router.push(DASHBOARD_LOGIN_HREF);
    }, DASHBOARD_LOGIN_MIN_LOAD_MS);
  }

  useEffect(() => {
    if (!enhanceLoginCta) return;
    router.prefetch(DASHBOARD_LOGIN_HREF);
  }, [enhanceLoginCta, router]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
    <div className={`topbar-wrap ${scrolled ? "is-scrolled" : ""}`}>
      <header className="topbar">
        <div className="brand-cluster">
          <Link href="/" className="brand" aria-label="Workmento home">
            <span className="brand-logo-desktop"><WorkmentoLogo variant="wordmark" /></span>
            <span className="brand-logo-compact"><WorkmentoLogo variant="wordmark" /></span>
            {ossPill && <span className="oss-pill">{ossPill}</span>}
          </Link>
        </div>

        <nav className="nav-links" aria-label="Primary">
          {resolvedLinks.map((l) => (
            <Link key={l.href} href={l.href} className="nav-link">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="topbar-right">
          <LanguageSwitcher />
          <ThemeToggle />
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="topbar-icon-link"
            aria-label={t("topbar.starGh")}
            title={t("topbar.starGh")}
          >
            <Github />
          </a>
          <Link
            href={DASHBOARD_LOGIN_HREF}
            className="btn btn-ghost topbar-cta topbar-login-cta"
            aria-busy={enhanceLoginCta && openingDashboard ? "true" : undefined}
            aria-disabled={enhanceLoginCta && openingDashboard ? "true" : undefined}
            onClick={onDashboardLoginClick}
          >
            {enhanceLoginCta && openingDashboard ? "Opening dashboard…" : "Log in to dashboard"}
          </Link>
          <a
            href={DEMO_URL}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary topbar-cta"
          >
            {t("btn.bookDemo")}
          </a>
          <button
            type="button"
            className="topbar-burger"
            aria-label={open ? t("menu.close") : t("menu.open")}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className={`burger ${open ? "open" : ""}`}>
              <i /><i /><i />
            </span>
          </button>
        </div>
      </header>
    </div>

      {open && (
        <div className="mobile-sheet" role="dialog" aria-modal="true" aria-label={t("menu.open")}>
          <nav className="mobile-sheet-nav">
            {resolvedLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="mobile-sheet-link"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link href="/faq" className="mobile-sheet-link" onClick={() => setOpen(false)}>
              {t("footer.faq")}
            </Link>
            <Link href="/contact" className="mobile-sheet-link" onClick={() => setOpen(false)}>
              {t("nav.contact")}
            </Link>
            <Link href="/login" className="mobile-sheet-link" onClick={() => setOpen(false)}>
              {t("btn.signIn")}
            </Link>
          </nav>
          <div className="mobile-sheet-actions">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost mobile-sheet-btn"
            >
              <Github /> {t("topbar.starGh")}
            </a>
            <Link
              href={DASHBOARD_LOGIN_HREF}
              className="btn btn-ghost mobile-sheet-btn"
              aria-busy={enhanceLoginCta && openingDashboard ? "true" : undefined}
              aria-disabled={enhanceLoginCta && openingDashboard ? "true" : undefined}
              onClick={onDashboardLoginClick}
            >
              {enhanceLoginCta && openingDashboard ? "Opening dashboard…" : "Log in to dashboard"}
            </Link>
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary mobile-sheet-btn"
            >
              {t("btn.bookDemo")} →
            </a>
          </div>
        </div>
      )}

      {enhanceLoginCta && openingDashboard && <WorkmentoRouteLoader />}
    </>
  );
}

export function MarketingFooter() {
  return <MarketingFooterInner />;
}

function MarketingFooterInner() {
  const { t } = useI18n();
  return (
    <footer className="shell footer">
      <div>
        <div className="brand" style={{ marginBottom: 12 }}>
          <WorkmentoLogo variant="wordmark" />
        </div>
        <p className="footer-tag">{t("footer.tag")}</p>
      </div>
      <div className="footer-col">
        <h5>{t("footer.product")}</h5>
        <Link href="/#features">{t("nav.features")}</Link>
        <Link href="/#industries">{t("nav.industries")}</Link>
        <Link href="/#apps">Mobile apps</Link>
        <Link href="/login">{t("btn.signIn")}</Link>
      </div>
      <div className="footer-col">
        <h5>{t("footer.resources")}</h5>
        <Link href="/faq">{t("footer.faq")}</Link>
        <Link href="/docs">{t("nav.docs")}</Link>
        <Link href="/contact">{t("nav.contact")}</Link>
        <a href={DEMO_URL} target="_blank" rel="noreferrer">{t("btn.bookDemo")}</a>
      </div>
      <div className="footer-col">
        <h5>{t("footer.legal")}</h5>
        <Link href="/privacy">{t("footer.privacy")}</Link>
        <Link href="/terms">{t("footer.terms")}</Link>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Workmento. {t("footer.copyright")}</span>
      </div>
    </footer>
  );
}

function Github() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.79-.01 3.16 0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}
