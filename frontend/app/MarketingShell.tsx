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
};

export function MarketingTopbar({
  links,
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
