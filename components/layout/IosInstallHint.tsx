"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";
import { useStandalone } from "@/lib/pwa/use-standalone";

const DISMISS_KEY = "pb:ios-install-dismissed-v1";

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  // Exclude in-app webviews (FB/IG/Line) where Add-to-Home-Screen isn't available.
  const isWebView = /FBAN|FBAV|Instagram|Line\//.test(ua);
  return isIos && !isWebView;
}

/**
 * iOS Safari never fires `beforeinstallprompt`, so users who don't already
 * know about Add-to-Home-Screen never install the PWA. Show a one-time,
 * dismissible hint above the bottom tab bar. Hidden once the user is in
 * standalone mode or has dismissed it.
 */
export function IosInstallHint() {
  const standalone = useStandalone();
  const [eligible, setEligible] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setEligible(isIosSafari());
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (standalone || !eligible || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode — banner just stays dismissed for the session */
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Install Pocketbook"
      className="fixed inset-x-3 z-40 flex items-start gap-3 rounded-[var(--radius-card)] border border-(--border) bg-(--surface)/95 px-3 py-2.5 text-xs text-(--text) shadow-(--shadow-sheet) backdrop-blur lg:hidden"
      style={{
        bottom:
          "calc(var(--mobile-tabbar-h) + var(--safe-bottom) + 0.5rem)",
      }}
    >
      <Share className="mt-0.5 h-4 w-4 flex-shrink-0 text-(--accent)" aria-hidden />
      <p className="flex-1 leading-snug">
        Install Pocketbook: tap{" "}
        <span className="font-medium text-(--text)">Share</span>, then{" "}
        <span className="font-medium text-(--text)">Add to Home Screen</span>.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install hint"
        className="-mr-2 -my-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-(--radius-input) text-(--muted) hover:bg-(--surface-2) hover:text-(--text)"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
