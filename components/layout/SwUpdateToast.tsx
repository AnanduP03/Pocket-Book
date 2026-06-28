"use client";

import { RefreshCw } from "lucide-react";
import { useSwUpdate } from "@/lib/pwa/sw-update";

/**
 * Shows a thin top banner when a new service worker has installed, prompting
 * the user to refresh into the new build. Mirrors the position/styling of
 * OfflineBanner so they don't fight for the same slot — only one is ever
 * visible at a time in practice (you'd need to be online to download a new
 * SW). When both could appear, the offline banner wins on z-index.
 */
export function SwUpdateToast() {
  const { updateAvailable, applyUpdate } = useSwUpdate();
  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-40 flex items-center justify-center gap-3 border-b border-(--accent)/30 bg-(--accent)/95 px-3 py-1.5 text-xs font-medium text-(--accent-fg) backdrop-blur"
      style={{ paddingTop: "calc(var(--safe-top) + 0.375rem)" }}
    >
      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
      <span>A new version is available.</span>
      <button
        type="button"
        onClick={applyUpdate}
        className="rounded-(--radius-input) bg-(--accent-fg)/10 px-2 py-0.5 font-semibold underline-offset-2 hover:underline"
      >
        Refresh
      </button>
    </div>
  );
}
