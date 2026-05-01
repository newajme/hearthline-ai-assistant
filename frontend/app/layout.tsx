import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Hearthline — The 24/7 AI front-desk for home-service teams",
  description:
    "Phone, SMS, WhatsApp, email, chat — every customer touchpoint qualified, photo-quoted, and dispatched without anyone picking up the phone.",
};

const THEME_INIT = `(function(){try{var s=localStorage.getItem('hl-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s||(m?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {children}
      </body>
    </html>
  );
}
