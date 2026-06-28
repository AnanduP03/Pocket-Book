import { ImageResponse } from "next/og";

export const contentType = "image/png";

export function generateImageMetadata() {
  return [
    { id: "192", size: { width: 192, height: 192 }, contentType: "image/png" },
    { id: "512", size: { width: 512, height: 512 }, contentType: "image/png" },
  ];
}

export default async function Icon({
  id,
}: {
  id: Promise<string | number>;
}) {
  const variant = await id;
  const px = variant === "192" ? 192 : 512;
  const radius = Math.round(px * 0.22);
  const fontSize = Math.round(px * 0.62);
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
          borderRadius: radius,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize,
            fontWeight: 700,
            fontFamily: "ui-serif, Georgia, serif",
            color: "#1f1a28",
            letterSpacing: -Math.round(px * 0.025),
            lineHeight: 1,
            paddingBottom: Math.round(px * 0.04),
          }}
        >
          P
        </div>
      </div>
    ),
    { width: px, height: px },
  );
}
