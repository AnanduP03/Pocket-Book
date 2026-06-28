"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, Wallet, PiggyBank, Heart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "pocketbook:tour-seen-v1";

type Slide = {
  icon: typeof Sparkles;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    icon: Sparkles,
    title: "Calm by design",
    body: "Pocketbook is built to surface only what matters today. Hero numbers up top, gentle nudges underneath — never a wall of charts.",
  },
  {
    icon: Wallet,
    title: "Log on the fly",
    body: "Tap the + tab to open a numpad sheet. We pre-fill the category from your note and remember your most-used presets.",
  },
  {
    icon: PiggyBank,
    title: "Sweep what's left",
    body: "At month-end, any surplus shows up in your inbox. Sweep it to savings — split across goals if you have several — in one tap.",
  },
  {
    icon: Heart,
    title: "You've got this",
    body: "We won't ping you about every rupee. We'll quietly notice patterns, surface what's worth knowing, and stay out of your way.",
  },
];

/**
 * Self-mounting first-run mini-tour. Auto-opens the very first time a
 * user lands on the dashboard, then never again. State lives in
 * localStorage; clearing site data resets it.
 */
export function FirstRunTour() {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
      setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const slide = SLIDES[idx]!;
  const Icon = slide.icon;
  const isLast = idx === SLIDES.length - 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent className="max-w-sm p-0">
        <div className="flex flex-col gap-5 p-6">
          <DialogTitle className="sr-only">Welcome to Pocketbook</DialogTitle>

          <span
            aria-hidden
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-(--accent)/30"
          >
            <Icon className="h-6 w-6 text-(--text)" />
          </span>

          <div className="text-center">
            <h2 className="font-display text-2xl tracking-tight text-(--text)">
              {slide.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-(--muted)">
              {slide.body}
            </p>
          </div>

          <div className="flex items-center justify-center gap-1.5">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                aria-hidden
                className={`h-1.5 rounded-full transition-all ${
                  i === idx
                    ? "w-5 bg-(--accent)"
                    : "w-1.5 bg-(--surface-2)"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={idx === 0}
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Back
            </Button>

            {isLast ? (
              <Button type="button" onClick={dismiss}>
                Get started
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setIdx((i) => Math.min(SLIDES.length - 1, i + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            )}
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="text-center text-[11px] text-(--muted) underline-offset-2 hover:underline"
          >
            Skip tour
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
