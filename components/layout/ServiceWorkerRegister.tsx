"use client";

import { useEffect } from "react";

/**
 * Registers the service worker once on mount. Production-only — in dev we'd
 * end up caching HMR responses and breaking refresh.
 *
 * In dev, we actively *unregister* any SW left over from a previous
 * `npm start` session and drop its caches. Without this, an old SW
 * keeps intercepting `/_next/static/*` with stale chunks, which causes
 * hydration mismatches against freshly built dev HTML.
 *
 * The SW lives at /sw.js (see public/sw.js).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Dev: unregister any pre-existing SW and dump its caches.
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
      if ("caches" in window) {
        void caches.keys().then((keys) => {
          for (const k of keys) void caches.delete(k);
        });
      }
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // When the browser finds a newer sw.js it installs alongside the
        // running one and parks it as `registration.waiting`. Surface that
        // to the UI so we can prompt for a refresh — otherwise users keep
        // running stale code until every tab is closed.
        const notify = () => {
          window.dispatchEvent(
            new CustomEvent("pb:sw-update", {
              detail: { registration },
            }),
          );
        };

        if (registration.waiting && navigator.serviceWorker.controller) {
          notify();
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              notify();
            }
          });
        });
      })
      .catch(() => {
        /* silent — SW is best-effort */
      });
  }, []);

  return null;
}
