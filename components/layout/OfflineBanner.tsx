"use client";

import { CloudOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/pwa/online-status";

/**
 * A thin, fixed-position banner that shows when the device is offline.
 * Pinned to the top of the viewport, respecting the iOS status-bar safe
 * area. Auto-hides when the connection returns.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 border-b border-(--warning)/30 bg-(--warning)/95 px-3 py-1.5 text-xs font-medium text-(--accent-fg) backdrop-blur"
      style={{
        paddingTop: "calc(var(--safe-top) + 0.375rem)",
        viewTransitionName: "offline-banner",
      }}
    >
      <CloudOff className="h-3.5 w-3.5" aria-hidden />
      <span>You're offline · viewing last-seen data</span>
    </div>
  );
}
