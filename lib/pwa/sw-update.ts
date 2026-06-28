"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SwUpdateDetail = { registration: ServiceWorkerRegistration };

/**
 * Listens for `pb:sw-update` events dispatched by ServiceWorkerRegister and
 * exposes an `applyUpdate()` to skip waiting + reload. The event is fired
 * after a new SW reaches the `installed` state alongside an existing
 * controller — i.e. there's a newer version parked, ready to take over.
 *
 * The SW already handles `{ type: "SKIP_WAITING" }` (see public/sw.js). After
 * skipWaiting resolves, the new SW takes control on the next navigation, so
 * we follow up with a reload to immediately show the new build.
 */
export function useSwUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SwUpdateDetail>).detail;
      if (!detail?.registration) return;
      registrationRef.current = detail.registration;
      setUpdateAvailable(true);
    };
    window.addEventListener("pb:sw-update", handler);
    return () => window.removeEventListener("pb:sw-update", handler);
  }, []);

  const applyUpdate = useCallback(() => {
    const registration = registrationRef.current;
    const waiting = registration?.waiting;
    if (!waiting) {
      window.location.reload();
      return;
    }

    // After the new SW transitions to `activated`, the controllerchange
    // event fires. Reload only then, so we don't race the swap.
    const onControllerChange = () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    waiting.postMessage({ type: "SKIP_WAITING" });
  }, []);

  return { updateAvailable, applyUpdate };
}
