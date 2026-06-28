"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { VariableQuickAdd } from "@/features/variable/components/VariableQuickAdd";
import { NumpadQuickLog } from "@/features/variable/components/NumpadQuickLog";
import type { PlainCategory } from "@/db/repositories/categories";
import type { PlainQuickPreset } from "@/db/repositories/settings";

type Props = {
  categories: PlainCategory[];
  defaultCurrency: string;
  defaultLocale: string;
  presets?: PlainQuickPreset[];
};

export function GlobalQuickLog({
  categories,
  defaultCurrency,
  defaultLocale,
  presets,
}: Props) {
  const [open, setOpen] = useState(false);
  // Numpad on phone (thumb-reach optimized), keyboard form on desktop
  // (real keyboard available, mouse is bad at tapping huge numpad buttons).
  // Default to mobile so SSR matches the most common surface; switch on
  // hydration if we're actually on desktop.
  const [isDesktop, setIsDesktop] = useState(false);
  // Hide the FAB while a page is in bulk-select mode — the bottom area
  // is taken over by a context-specific action bar there.
  const [selectMode, setSelectMode] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("pocketbook:open-quick-log", handler);
    return () => window.removeEventListener("pocketbook:open-quick-log", handler);
  }, []);

  useEffect(() => {
    const onSelect = (e: Event) => {
      setSelectMode((e as CustomEvent<boolean>).detail === true);
    };
    window.addEventListener("pocketbook:select-mode", onSelect);
    return () =>
      window.removeEventListener("pocketbook:select-mode", onSelect);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      {selectMode ? null : (
        <button
          type="button"
          aria-label="Quick log expense"
          onClick={() => setOpen(true)}
          className="fixed right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-(--border) bg-(--accent) text-(--accent-fg) shadow-[var(--shadow-sheet)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg) lg:right-8"
          style={{
            bottom:
              "calc(var(--mobile-tabbar-h) + var(--safe-bottom) + 0.75rem)",
            viewTransitionName: "global-fab",
          }}
        >
          <Plus className="h-5 w-5" aria-hidden />
          <span className="sr-only">Quick log expense (press N)</span>
        </button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        {isDesktop ? (
          <SheetContent
            className="max-w-lg gap-4 overflow-y-auto"
            aria-describedby="quick-log-desc"
          >
            <SheetHeader>
              <SheetTitle>
                <span className="font-display text-2xl tracking-tight">
                  Quick log
                </span>
              </SheetTitle>
              <SheetDescription id="quick-log-desc">
                Log a variable expense for today &middot; press{" "}
                <kbd className="rounded border border-(--border) bg-(--surface-2) px-1 font-mono text-[10px]">
                  N
                </kbd>{" "}
                from anywhere
              </SheetDescription>
            </SheetHeader>

            <VariableQuickAdd
              categories={categories}
              defaultCurrency={defaultCurrency}
              defaultLocale={defaultLocale}
              compact
            />
          </SheetContent>
        ) : (
          <SheetContent
            side="bottom"
            className="gap-4 overflow-y-auto rounded-t-[var(--radius-card)]"
            aria-describedby="quick-log-desc"
          >
            <SheetHeader>
              <SheetTitle>
                <span className="font-display text-2xl tracking-tight">
                  Quick log
                </span>
              </SheetTitle>
              <SheetDescription id="quick-log-desc">
                Today's variable expense — no keyboard needed.
              </SheetDescription>
            </SheetHeader>

            <NumpadQuickLog
              categories={categories}
              defaultCurrency={defaultCurrency}
              defaultLocale={defaultLocale}
              {...(presets ? { presets } : {})}
              onLogged={() => setOpen(false)}
            />
          </SheetContent>
        )}
      </Sheet>
    </>
  );
}
