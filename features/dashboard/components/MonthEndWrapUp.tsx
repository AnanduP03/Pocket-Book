"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  PartyPopper,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { fetchMonthEndWrapupAction } from "../wrapup-actions";
import type { MonthEndWrapup, WrapupTone } from "../wrapup-queries";
import { formatCurrency } from "@/lib/format/money";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "pocketbook:wrapup-seen";
const GRACE_DAYS = 5;

const TONE_COPY: Record<WrapupTone, { hint: string; bg: string }> = {
  tight: {
    hint: "Lean — let's see where the rupees went.",
    bg: "bg-(--warning)/15",
  },
  brisk: {
    hint: "Spending ran a touch ahead of usual.",
    bg: "bg-(--accent)/15",
  },
  steady: {
    hint: "Right where you usually land.",
    bg: "bg-(--surface-2)/40",
  },
  surplus: {
    hint: "Room to spare. Worth sweeping.",
    bg: "bg-(--success)/15",
  },
};

function getSeenMonths(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.filter((x) => typeof x === "string"));
  } catch {
    /* ignore */
  }
  return new Set();
}

function recordSeen(monthId: string) {
  if (typeof window === "undefined") return;
  try {
    const set = getSeenMonths();
    set.add(monthId);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

/**
 * Auto-opens on the first dashboard visit of each new month (within a
 * 5-day grace window) and only if it hasn't been seen yet — tracked in
 * localStorage by month-id.
 *
 * The card is dismissible. Once dismissed (or completed), this month's
 * wrap-up won't reappear.
 */
export function MonthEndWrapUp() {
  // Only fetch + render after mount — avoids SSR flash for a feature
  // that's strictly client-driven.
  const [eligible, setEligible] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const day = new Date().getUTCDate();
    if (day <= GRACE_DAYS) setEligible(true);
  }, []);

  const { data: wrapup } = useQuery<MonthEndWrapup | null>({
    queryKey: ["dashboard", "wrapup"],
    queryFn: fetchMonthEndWrapupAction,
    enabled: eligible,
    staleTime: 60_000,
  });

  // Auto-open when wrapup lands and the user hasn't seen this month yet.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!wrapup || autoOpenedRef.current) return;
    const seen = getSeenMonths();
    if (!seen.has(wrapup.monthId)) {
      autoOpenedRef.current = true;
      setOpen(true);
    }
  }, [wrapup]);

  if (!wrapup) return null;

  return (
    <WrapUpSheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) recordSeen(wrapup.monthId);
      }}
      data={wrapup}
    />
  );
}

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: MonthEndWrapup;
};

function WrapUpSheet({ open, onOpenChange, data }: SheetProps) {
  const [step, setStep] = useState(0);
  const total = 5;

  // Reset to first screen every time the sheet opens.
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const screens = useMemo(() => buildScreens(data), [data]);
  const isLast = step === total - 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="gap-4 overflow-y-auto rounded-t-[var(--radius-card)]"
      >
        <SheetHeader>
          <SheetTitle>
            <span className="font-display text-xl tracking-tight">
              {data.monthLabel} {data.year}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex items-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= step ? "bg-(--accent)" : "bg-(--surface-2)",
              )}
            />
          ))}
        </div>

        <div className="min-h-[260px] flex flex-col">
          {screens[step]}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {isLast ? "Close" : "Skip"}
          </Button>
          {!isLast ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setStep((s) => Math.min(s + 1, total - 1))}
            >
              Next <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <PartyPopper className="h-4 w-4" aria-hidden />
              Wrap up
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function buildScreens(d: MonthEndWrapup): React.ReactNode[] {
  const tone = TONE_COPY[d.tone];
  const fmt = (paise: number) => formatCurrency(paise, "INR", "en-IN");
  const dateFmt = (iso: string) => {
    const [y, m, day] = iso.split("-").map(Number);
    return new Date(Date.UTC(y!, m! - 1, day!)).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  return [
    // 1. Headline
    <div
      key="headline"
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] p-6 text-center",
        tone.bg,
      )}
    >
      <span
        aria-hidden
        className="flex h-10 w-10 items-center justify-center rounded-full bg-(--accent)/30"
      >
        <Sparkles className="h-5 w-5 text-(--text)" />
      </span>
      <p className="font-display text-3xl tracking-tight text-(--text)">
        {d.headline}
      </p>
      <p className="text-sm text-(--muted)">{tone.hint}</p>
    </div>,

    // 2. Top categories
    <div
      key="categories"
      className="flex flex-1 flex-col gap-3"
    >
      <p className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
        Where the rupees went
      </p>
      {d.topCategories.length === 0 ? (
        <div className="rounded-[var(--radius-input)] border border-dashed border-(--border) bg-(--surface-2)/30 p-4 text-center text-sm text-(--muted)">
          No variable spend logged.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {d.topCategories.map((c, i) => {
            const max = d.topCategories[0]?.paise ?? 1;
            const pct = (c.paise / max) * 100;
            return (
              <li key={`${c.name}-${i}`} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-(--text)">
                    {c.name}
                  </span>
                  <span className="tabular-nums text-sm text-(--text)">
                    {fmt(c.paise)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-(--surface-2)">
                  <div
                    className="h-full transition-[width] duration-500"
                    style={{ width: `${pct}%`, background: c.color }}
                    aria-hidden
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>,

    // 3. Standout day
    <div
      key="standout"
      className="flex flex-1 flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] bg-(--surface-2)/30 p-6 text-center"
    >
      <p className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
        Biggest day
      </p>
      {d.standoutDay ? (
        <>
          <p className="font-display text-2xl tracking-tight text-(--text)">
            {dateFmt(d.standoutDay.date)}
          </p>
          <p className="tabular-nums text-3xl font-semibold text-(--text)">
            {fmt(d.standoutDay.totalPaise)}
          </p>
          {d.standoutDay.topCategoryName ? (
            <p className="text-sm text-(--muted)">
              Mostly {d.standoutDay.topCategoryName}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-(--muted)">
          No single day stood out — pretty even spread.
        </p>
      )}
    </div>,

    // 4. Streak
    <div
      key="streak"
      className="flex flex-1 flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] bg-(--success)/10 p-6 text-center"
    >
      <span
        aria-hidden
        className="flex h-10 w-10 items-center justify-center rounded-full bg-(--success)/40"
      >
        <TrendingUp className="h-5 w-5 text-(--text)" />
      </span>
      <p className="font-display text-2xl tracking-tight text-(--text)">
        {d.daysUnderAverage} of {d.daysInMonth} days
      </p>
      <p className="text-sm text-(--muted)">
        Stayed at or under your daily average.
      </p>
    </div>,

    // 5. Bottom line
    <div
      key="bottom"
      className="flex flex-1 flex-col gap-3 rounded-[var(--radius-card)] bg-(--accent)/15 p-6 text-center"
    >
      <p className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
        Savings
      </p>
      <p
        className={cn(
          "font-display text-3xl tabular-nums tracking-tight",
          d.savingsDeltaPaise >= 0 ? "text-(--text)" : "text-(--warning)",
        )}
      >
        {d.savingsDeltaPaise >= 0 ? "+" : "−"}
        {fmt(Math.abs(d.savingsDeltaPaise))}
      </p>
      {d.topGoalName !== null && d.topGoalProgressPct !== null ? (
        <div className="flex flex-col items-center gap-1.5 pt-1">
          <span className="inline-flex items-center gap-1.5 text-sm text-(--muted)">
            <Target className="h-3.5 w-3.5" aria-hidden />
            {d.topGoalProgressPct}% to <strong className="text-(--text)">{d.topGoalName}</strong>
          </span>
        </div>
      ) : null}
      <p className="text-xs text-(--muted)">
        New month — fresh slate. Onward.
      </p>
    </div>,
  ];
}
