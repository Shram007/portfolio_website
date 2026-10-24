import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME} - Portfolio`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 96,
          background: "linear-gradient(135deg, #0a0a0a 0%, #1e1b4b 100%)",
          color: "white",
        }}
      >
        <div style={{ fontSize: 88, fontWeight: 700 }}>{SITE_NAME}</div>
        <div style={{ fontSize: 40, marginTop: 24, color: "#a5b4fc" }}>{SITE_DESCRIPTION}</div>
        <div style={{ fontSize: 28, marginTop: 48, color: "#a3a3a3" }}>shram-kadia.vercel.app</div>
      </div>
    ),
    size
  );
}
