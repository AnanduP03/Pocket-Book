import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #c8b6e2 0%, #b8a4d4 60%, #9c83be 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 112,
            fontWeight: 700,
            fontFamily: "ui-serif, Georgia, serif",
            color: "#1f1a28",
            letterSpacing: -4,
            lineHeight: 1,
            paddingBottom: 8,
          }}
        >
          P
        </div>
      </div>
    ),
    { ...size },
  );
}
