import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const alt = "Workmento — The 24/7 AI front desk for home services";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const WORKMENTO_MARK = path.join(process.cwd(), "public", "branding", "workmento-mark.png");

export default async function OpengraphImage() {
  const mark = await readFile(WORKMENTO_MARK);
  const markSrc = `data:image/png;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #07110c 0%, #0d1c14 60%, #123923 100%)",
          color: "#f1fff7",
          display: "flex",
          flexDirection: "column",
          padding: "72px 88px",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 28,
            color: "#78FFBE",
            letterSpacing: 1,
          }}
        >
          <img
            src={markSrc}
            alt="Workmento logo mark"
            width={36}
            height={36}
            style={{ objectFit: "contain" }}
          />
          <span style={{ fontWeight: 600 }}>Workmento</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
            gap: 28,
          }}
        >
          <div
            style={{
              fontSize: 84,
              lineHeight: 1.05,
              fontWeight: 600,
              letterSpacing: -2,
              maxWidth: 980,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            The 24/7 AI front desk for home services.
          </div>
          <div
            style={{
              fontSize: 30,
              color: "#cde6d8",
              maxWidth: 920,
              lineHeight: 1.35,
              fontFamily: "sans-serif",
            }}
          >
            Demi answers, qualifies, and books — so your crew sleeps and your calendar fills itself.
          </div>
          <div
            style={{
              display: "flex",
              gap: 16,
              fontSize: 22,
              color: "#92aa9f",
              fontFamily: "sans-serif",
            }}
          >
            <span>Open-source · AGPL-3.0</span>
            <span>·</span>
            <span>Self-hostable AI receptionist</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
