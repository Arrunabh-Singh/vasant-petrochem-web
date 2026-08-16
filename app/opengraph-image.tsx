import { ImageResponse } from "next/og";
import { site } from "./content";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1a4a3a",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 8, color: "#34d399", textTransform: "uppercase" }}>
          {site.name}
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, textAlign: "center", maxWidth: 900, lineHeight: 1.15, marginTop: 24, display: "flex" }}>
          Advanced Petrochemical Solutions
        </div>
        <div style={{ fontSize: 24, color: "#cbd5e1", marginTop: 24, display: "flex" }}>
          Base Oils · Bitumen · Industrial Fuels · Solvents
        </div>
      </div>
    ),
    { ...size }
  );
}
