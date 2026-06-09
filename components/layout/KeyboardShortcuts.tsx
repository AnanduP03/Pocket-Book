"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const ROUTES: Record<string, string> = {
  d: "/dashboard",
  i: "/income",
  f: "/fixed",
  v: "/variable",
  c: "/categories",
  s: "/settings",
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

function focusFirstSearch() {
  const explicit = document.querySelector<HTMLInputElement>(
    'input[id="filter-text"]',
  );
  if (explicit) {
    explicit.focus();
    explicit.select();
    return;
  }
  const fallback = document.querySelector<HTMLInputElement>(
    'input[type="search"], input[placeholder*="Find" i], input[placeholder*="Search" i]',
  );
  if (fallback) {
    fallback.focus();
    fallback.select();
  }
}

function focusQuickAdd() {
  const el = document.querySelector<HTMLInputElement>("#quick-add-amount");
  if (el) {
    el.focus();
    el.select();
    return true;
  }
  return false;
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const armedRef = useRef(false);
  const armedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function disarm() {
      armedRef.current = false;
      if (armedTimeoutRef.current) {
        clearTimeout(armedTimeoutRef.current);
        armedTimeoutRef.current = null;
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      if (e.key === "/") {
        e.preventDefault();
        focusFirstSearch();
        disarm();
        return;
      }

      if (e.key.toLowerCase() === "n") {
        if (focusQuickAdd()) {
          e.preventDefault();
          disarm();
          return;
        }
      }

      if (armedRef.current) {
        const path = ROUTES[e.key.toLowerCase()];
        if (path) {
          e.preventDefault();
          router.push(path);
        }
        disarm();
        return;
      }

      if (e.key.toLowerCase() === "g") {
        armedRef.current = true;
        armedTimeoutRef.current = setTimeout(disarm, 1500);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      disarm();
    };
  }, [router]);

  return null;
}
