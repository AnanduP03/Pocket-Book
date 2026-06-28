import { ImageResponse } from "next/og";

export const dynamic = "force-static";

const ALLOWED_SIZES = new Set([
  "1290x2796",
  "1179x2556",
  "1170x2532",
  "1125x2436",
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  if (!ALLOWED_SIZES.has(size)) {
    return new Response("Unknown splash size", { status: 404 });
  }
  const [wStr, hStr] = size.split("x");
  const w = parseInt(wStr!, 10);
  const h = parseInt(hStr!, 10);
  const min = Math.min(w, h);
  const glyph = Math.round(min * 0.32);
  const radius = Math.round(glyph * 0.22);
  const wordmark = Math.round(min * 0.06);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#16121c",
      }}
    >
      <div
        style={{
          width: glyph,
          height: glyph,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #c8b6e2 0%, #b8a4d4 60%, #9c83be 100%)",
          borderRadius: radius,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: Math.round(glyph * 0.62),
            fontWeight: 700,
            fontFamily: "ui-serif, Georgia, serif",
            color: "#1f1a28",
            letterSpacing: -Math.round(glyph * 0.025),
            lineHeight: 1,
            paddingBottom: Math.round(glyph * 0.04),
          }}
        >
          P
        </div>
      </div>
      <div
        style={{
          marginTop: Math.round(min * 0.06),
          fontSize: wordmark,
          fontFamily: "ui-serif, Georgia, serif",
          color: "#ece5f0",
          letterSpacing: -Math.round(wordmark * 0.04),
        }}
      >
        Pocketbook
      </div>
    </div>,
    { width: w, height: h },
  );
}
