import { CSSProperties } from "react";

/**
 * iOS PWA / Safari with `viewport-fit: cover` + `statusBarStyle:
 * black-translucent` lets content scroll under the status bar, which makes
 * the time / Dynamic Island / wifi indicators sit on top of arbitrary page
 * content. This is a fixed, translucent frosted-glass backdrop covering
 * exactly the safe-area-top region so the OS chrome always reads against
 * a clean surface — same trick UIKit uses for navigation bars.
 *
 * Hidden on lg+ (no notch / no PWA chrome at desktop sizes). Height
 * collapses to 0 on devices without an inset, so it auto-disables.
 *
 * z-30 sits below OfflineBanner (z-50) and SwUpdateToast (z-40), so when
 * either banner is showing it covers this shield naturally.
 */
const SHIELD_STYLE: CSSProperties = {
  height: "var(--safe-top)",
  background: "color-mix(in oklab, var(--bg) 30%, transparent)",
  WebkitBackdropFilter: "blur(14px) saturate(180%)",
  backdropFilter: "blur(14px) saturate(180%)",
};

export function StatusBarShield() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-30 lg:hidden"
      style={SHIELD_STYLE}
    />
  );
}
