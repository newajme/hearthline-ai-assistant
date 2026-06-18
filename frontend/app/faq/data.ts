export type FaqCategory = "Setup" | "Product" | "Pricing" | "Security" | "Integrations" | "Support";

export type FaqItem = {
  q: string;
  category: FaqCategory;
  aText: string;
  aHtml?: string;
};

export const FAQS: FaqItem[] = [
  {
    q: "How long does setup take?",
    category: "Setup",
    aText:
      "About 30 minutes for the basics — business hours, service area, pricing rules, and a phone number to forward. Tuning Demi's voice and pricing rules to your exact business is a few hours of iteration after that.",
  },
  {
    q: "Does Demi sound like a robot?",
    category: "Product",
    aText:
      "No — Demi runs on the latest neural voices (ElevenLabs by default; configurable). You pick the voice; most customers can't tell it's AI in a short call.",
  },
  {
    q: "What languages does Demi support?",
    category: "Product",
    aText:
      "English, French, Spanish, German, Italian, Dutch, and Portuguese out of the box. Other languages work too — they just haven't been tuned to a brand voice yet.",
  },
  {
    q: "Can I keep my existing phone number?",
    category: "Setup",
    aText:
      "Yes. We forward your existing line to Workmento, or you can publish a new dedicated number. SMS / WhatsApp routing works the same way.",
  },
  {
    q: "Which CRMs do you sync with?",
    category: "Integrations",
    aText:
      "HubSpot, Pipedrive, Salesforce, Zoho, and ServiceTitan have first-class integrations. Other tools can be connected through supported workflow integrations or a custom API connection.",
  },
  {
    q: "What happens if Demi can't answer something?",
    category: "Product",
    aText:
      "She politely takes a detailed message, files it as a hot lead in your CRM, and pings whoever's on call. No customer is left hanging.",
  },
  {
    q: "Is my data secure?",
    category: "Security",
    aText:
      "All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We do not train on your customer data. SOC 2 Type II audit is on the roadmap as the hosted offering scales.",
  },
  {
    q: "How is pricing structured?",
    category: "Pricing",
    aText:
      "Pricing depends on the channels you use, call volume, AI provider, and setup needs. Book a demo for a quote based on your business and expected usage.",
  },
  {
    q: "Can I try Workmento before paying?",
    category: "Pricing",
    aText:
      "Yes. We can walk through a demo, configure a pilot workflow, and let your team review how Demi handles realistic calls before committing to a rollout.",
  },
  {
    q: "Which AI providers can I use?",
    category: "Setup",
    aText:
      "Workmento supports Claude, OpenAI, Gemini, and Groq. You can choose a provider during setup and update it later from your settings.",
  },
  {
    q: "How do I get support during setup?",
    category: "Support",
    aText:
      "Use the contact page or live chat to send your question. Include the channel, provider, or dashboard area you're configuring so the team can help faster.",
  },
];
