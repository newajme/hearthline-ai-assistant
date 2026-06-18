import Link from "next/link";

import { MarketingFooter, MarketingTopbar } from "../MarketingShell";

export const metadata = {
  title: "Help & Getting Started",
  description:
    "Set up Workmento for your business profile, AI provider, channels, knowledge base, Demi testing, and dashboard review.",
  alternates: { canonical: "/docs" },
  openGraph: {
    title: "Workmento · Help & Getting Started",
    description: "Customer onboarding help for setting up Workmento and Demi.",
    url: "/docs",
  },
};

const SETUP = [
  {
    tag: "Business profile",
    title: "Complete your company details",
    body: "Add your business name, service area, hours, trade focus, emergency rules, and the customer promises Demi should follow.",
  },
  {
    tag: "AI provider",
    title: "Choose Claude, OpenAI, Gemini, or Groq",
    body: "Pick the provider that matches your budget, response style, and compliance needs. You can update the provider from settings as your workflow changes.",
  },
  {
    tag: "Secure keys",
    title: "Enter API keys safely",
    body: "Paste provider keys only in the secure settings fields. Workmento stores keys for your workspace and never asks you to send them through chat or email.",
  },
  {
    tag: "Channels",
    title: "Connect phone, WhatsApp, SMS, and chat",
    body: "Add the channels your customers already use, then decide which ones Demi answers directly and which should route to your team.",
  },
  {
    tag: "Knowledge base",
    title: "Teach Demi your real rules",
    body: "Upload service descriptions, pricing guidance, warranty language, scheduling rules, and FAQs so Demi answers from your business policy.",
  },
  {
    tag: "Test call",
    title: "Test Demi before going live",
    body: "Run a simulated call, review the transcript, adjust your instructions, and repeat until the handoff feels right for your customers.",
  },
];

const REVIEW = [
  {
    stage: "Leads",
    body: "Review newly qualified leads, project details, urgency, estimated value, and recommended next actions.",
  },
  {
    stage: "Calls",
    body: "Open call records to inspect transcripts, summaries, customer intent, and any follow-up Demi scheduled.",
  },
  {
    stage: "Customers",
    body: "Keep contact details, preferences, and interaction history in one place for your office team.",
  },
  {
    stage: "Quotes",
    body: "Review AI-drafted quote details before sending or editing them for larger jobs that need human approval.",
  },
  {
    stage: "Support tickets",
    body: "Track customer issues across chat, email, WhatsApp, and SMS so nothing gets lost between channels.",
  },
];

const TOC = [
  { id: "start", label: "Start setup", group: "Onboarding" },
  { id: "providers", label: "AI providers", group: "Onboarding" },
  { id: "channels", label: "Channels", group: "Configuration" },
  { id: "knowledge", label: "Knowledge base", group: "Configuration" },
  { id: "test", label: "Test Demi", group: "Go live" },
  { id: "dashboard", label: "Review work", group: "Go live" },
  { id: "support", label: "Get support", group: "Help" },
];

export default function DocsPage() {
  const groups = Array.from(new Set(TOC.map((x) => x.group)));

  return (
    <>
      <MarketingTopbar
        links={[
          { href: "/", label: "Home" },
          { href: "#start", label: "Setup" },
          { href: "#providers", label: "AI providers" },
          { href: "#dashboard", label: "Dashboard" },
          { href: "#support", label: "Support" },
        ]}
      />

      <main className="docs-main">
        <div className="docs-shell">
          <aside className="docs-toc" aria-label="Help table of contents">
            <div className="docs-toc-inner">
              {groups.map((group) => (
                <div className="docs-toc-group" key={group}>
                  <p className="docs-toc-group-label">{group}</p>
                  <ul>
                    {TOC.filter((item) => item.group === group).map((item) => (
                      <li key={item.id}>
                        <a href={`#${item.id}`} className="docs-toc-link">
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="docs-toc-foot">
                <Link href="/contact" className="docs-toc-cta">
                  Contact support
                </Link>
              </div>
            </div>
          </aside>

          <article className="docs-body">
            <header className="docs-hero">
              <span className="docs-hero-eyebrow">
                <span className="dot" /> Workmento Help
              </span>
              <h1 className="docs-hero-title">Getting started with Workmento.</h1>
              <p className="docs-hero-sub">
                Use this guide to configure Demi, connect your customer channels, and review the work Workmento captures for your team.
              </p>
            </header>

            <section id="start" className="docs-section">
              <h2 className="docs-h2">Start with your business profile</h2>
              <p className="docs-p">
                Workmento works best when Demi has the same information your office team uses: where you serve, when you answer, what you sell, and when a customer should be escalated to a human.
              </p>
              <div className="docs-stack-grid">
                {SETUP.slice(0, 1).map((item) => (
                  <HelpCard key={item.title} {...item} />
                ))}
              </div>
            </section>

            <section id="providers" className="docs-section">
              <h2 className="docs-h2">Choose and secure your AI provider</h2>
              <p className="docs-p">
                Workmento supports Claude, OpenAI, Gemini, and Groq so you can match Demi's quality, speed, and cost to your operation.
              </p>
              <div className="docs-stack-grid">
                {SETUP.slice(1, 3).map((item) => (
                  <HelpCard key={item.title} {...item} />
                ))}
              </div>
            </section>

            <section id="channels" className="docs-section">
              <h2 className="docs-h2">Add customer channels</h2>
              <p className="docs-p">
                Connect the places customers already reach you, then define how Demi should respond when the request is urgent, high value, or outside your normal service area.
              </p>
              <div className="docs-stack-grid">
                {SETUP.slice(3, 4).map((item) => (
                  <HelpCard key={item.title} {...item} />
                ))}
              </div>
            </section>

            <section id="knowledge" className="docs-section">
              <h2 className="docs-h2">Configure the knowledge base</h2>
              <p className="docs-p">
                Add the answers your customers need most: pricing rules, warranty limits, service descriptions, scheduling policy, and what information Demi must collect before booking.
              </p>
              <div className="docs-stack-grid">
                {SETUP.slice(4, 5).map((item) => (
                  <HelpCard key={item.title} {...item} />
                ))}
              </div>
            </section>

            <section id="test" className="docs-section">
              <h2 className="docs-h2">Test Demi before launch</h2>
              <p className="docs-p">
                Use the test-call workflow to hear Demi answer, qualify, summarize, and hand off a realistic customer request before routing live traffic.
              </p>
              <div className="docs-stack-grid">
                {SETUP.slice(5).map((item) => (
                  <HelpCard key={item.title} {...item} />
                ))}
              </div>
            </section>

            <section id="dashboard" className="docs-section">
              <h2 className="docs-h2">Review captured work in the dashboard</h2>
              <p className="docs-p">
                After Demi handles a conversation, use the dashboard to verify the outcome, update records, and decide what your team should do next.
              </p>
              <ol className="docs-pipeline">
                {REVIEW.map((item, index) => (
                  <li key={item.stage} className="docs-pipeline-step">
                    <span className="docs-pipeline-num">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <div className="docs-pipeline-stage">{item.stage}</div>
                      <p className="docs-pipeline-body">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section id="support" className="docs-section">
              <h2 className="docs-h2">Contact Workmento support</h2>
              <p className="docs-p">
                If you need help with setup, provider keys, channels, knowledge-base tuning, or dashboard review, send a support ticket and include the business area you are configuring.
              </p>
              <div className="docs-cta">
                <Link href="/contact" className="btn btn-primary">
                  Contact support
                </Link>
                <Link href="/login" className="btn btn-ghost">
                  Sign in to dashboard
                </Link>
              </div>
            </section>
          </article>
        </div>

        <MarketingFooter />
      </main>
    </>
  );
}

function HelpCard({ tag, title, body }: { tag: string; title: string; body: string }) {
  return (
    <article className="docs-stack-card">
      <span className="docs-stack-tag">{tag}</span>
      <h3 className="docs-stack-title">{title}</h3>
      <p className="docs-stack-body">{body}</p>
    </article>
  );
}
