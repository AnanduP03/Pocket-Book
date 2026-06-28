"use client";

import { signOut } from "next-auth/react";

/**
 * Sign out, but first ask the service worker to drop its caches so that
 * cached HTML / static responses from the previous session can't leak to
 * a different user (or back to the same user expecting a fresh state).
 */
export async function signOutAndClearCaches(callbackUrl = "/auth/login") {
  if (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    navigator.serviceWorker.controller
  ) {
    navigator.serviceWorker.controller.postMessage({ type: "CLEAR_CACHES" });
  }
  await signOut({ callbackUrl });
}
