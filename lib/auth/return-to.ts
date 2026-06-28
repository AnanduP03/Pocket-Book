const DEFAULT_RETURN_TO = "/variable";

export function safeReturnTo(
  raw: string | undefined | null,
  fallback: string = DEFAULT_RETURN_TO,
): string {
  if (typeof raw !== "string" || raw.length === 0) return fallback;
  if (raw.length > 512) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[\x00-\x1f]/.test(raw)) return fallback;
  return raw;
}
