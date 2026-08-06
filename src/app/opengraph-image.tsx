import { ImageResponse } from "next/og";

export const alt = "CleanPic — ajuste e converta imagens em lote";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c0a09",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 22,
              background: "#6f73d2",
            }}
          />
          <div style={{ display: "flex", color: "#fafaf9", fontSize: 100, fontWeight: 700 }}>
            CleanPic
          </div>
        </div>
        <div
          style={{
            display: "flex",
            color: "#a8a29e",
            fontSize: 34,
            marginTop: 28,
            maxWidth: 900,
            textAlign: "center",
          }}
        >
          Corte, redimensione, recolorir e converta imagens em PNG, SVG ou ICO
        </div>
      </div>
    ),
    { ...size }
  );
}
