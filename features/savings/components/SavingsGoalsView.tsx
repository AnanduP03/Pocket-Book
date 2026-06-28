"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Target, Trash2 } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, FormField } from "@/components/ui/form-field";
import { MoneyInput } from "@/features/shared/components/MoneyInput";
import {
  updateSavingsGoalsAction,
  type ActionResult,
} from "@/features/settings/actions";
import type { PlainNamedSavingsGoal, PlainSettings } from "@/db/repositories/settings";
import { formatCurrency } from "@/lib/format/money";
import { cn } from "@/lib/utils";

type Props = {
  initialGoals: PlainNamedSavingsGoal[];
  currency: string;
  locale: string;
  currentBalancePaise: number;
};

type EditableGoal = PlainNamedSavingsGoal & { _localId?: string };

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `g${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toDateInput(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateInput(s: string): Date | null {
  if (!s) return null;
  const parts = s.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function defaultTargetDate(): Date {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Even-distribute shares across N goals; remainder goes to the last entry.
 */
function evenShares(n: number): number[] {
  if (n === 0) return [];
  const base = Math.floor(100 / n);
  const remainder = 100 - base * n;
  const out = Array.from({ length: n }, () => base);
  if (n > 0) out[n - 1] = (out[n - 1] ?? 0) + remainder;
  return out;
}

export function SavingsGoalsView({
  initialGoals,
  currency,
  locale,
  currentBalancePaise,
}: Props) {
  const [goals, setGoals] = useState<EditableGoal[]>(() =>
    initialGoals.map((g) => ({ ...g })),
  );
  const [error, setError] = useState<string | null>(null);

  const totalShare = useMemo(
    () => goals.reduce((s, g) => s + (Number.isFinite(g.sharePct) ? g.sharePct : 0), 0),
    [goals],
  );

  const totalTargetPaise = useMemo(
    () => goals.reduce((s, g) => s + g.amountPaise, 0),
    [goals],
  );

  function patch(idx: number, partial: Partial<EditableGoal>) {
    setGoals((prev) => prev.map((g, i) => (i === idx ? { ...g, ...partial } : g)));
  }

  function addGoal() {
    setGoals((prev) => {
      const next: EditableGoal = {
        id: newId(),
        name: "",
        amountPaise: 0,
        targetDate: defaultTargetDate(),
        sharePct: 0,
      };
      const arr = [...prev, next];
      // Auto-balance shares evenly when adding the first goal or when no
      // goal has a non-zero share (fresh start).
      const hasShares = arr.some((g) => g.sharePct > 0);
      if (!hasShares) {
        const dist = evenShares(arr.length);
        arr.forEach((g, i) => (g.sharePct = dist[i] ?? 0));
      }
      return arr;
    });
  }

  function removeGoal(idx: number) {
    setGoals((prev) => prev.filter((_, i) => i !== idx));
  }

  function balanceShares() {
    setGoals((prev) => {
      if (prev.length === 0) return prev;
      const dist = evenShares(prev.length);
      return prev.map((g, i) => ({ ...g, sharePct: dist[i] ?? 0 }));
    });
  }

  const mutation = useMutation<ActionResult<PlainSettings>, Error>({
    mutationFn: () =>
      updateSavingsGoalsAction(
        goals.map((g) => ({
          id: g.id,
          name: g.name,
          amountPaise: g.amountPaise,
          targetDate: g.targetDate,
          sharePct: g.sharePct,
        })),
      ),
    onSuccess: (res) => {
      if (!res.ok) {
        setError(res.error.message);
        toast.error(res.error.message);
        return;
      }
      setError(null);
      toast.success("Goals saved");
    },
    onError: (err) => {
      setError(err.message);
      toast.error(err.message);
    },
  });

  function save() {
    setError(null);
    if (goals.length === 0) {
      mutation.mutate();
      return;
    }
    for (const [i, g] of goals.entries()) {
      if (!g.name.trim()) {
        setError(`Goal ${i + 1}: give it a name`);
        return;
      }
      if (g.amountPaise <= 0) {
        setError(`Goal ${i + 1}: target amount must be positive`);
        return;
      }
    }
    if (Math.abs(totalShare - 100) > 0.5) {
      setError(`Shares must sum to 100% (got ${Math.round(totalShare)}%)`);
      return;
    }
    mutation.mutate();
  }

  const sharesOk = Math.abs(totalShare - 100) <= 0.5 || goals.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rise-in flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-(--border) bg-(--surface) p-4"
        style={{ animationDelay: "60ms" }}
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
            Reserve
          </p>
          <p className="font-display text-2xl tabular-nums tracking-tight text-(--text)">
            {formatCurrency(currentBalancePaise, currency, locale)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
            Total target
          </p>
          <p className="tabular-nums text-base font-semibold text-(--text)">
            {formatCurrency(totalTargetPaise, currency, locale)}
          </p>
        </div>
      </div>

      {goals.length === 0 ? (
        <div
          className="rise-in rounded-[var(--radius-card)] border border-dashed border-(--border) bg-(--surface) p-8 text-center"
          style={{ animationDelay: "120ms" }}
        >
          <span
            aria-hidden
            className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-(--accent)/30"
          >
            <Target className="h-5 w-5 text-(--text)" />
          </span>
          <p className="text-sm text-(--text)">
            No goals yet. Name what you're saving for — an emergency fund, a
            trip, a bike — and the dashboard tracks pace.
          </p>
          <Button type="button" className="mt-4" onClick={addGoal}>
            <Plus className="h-4 w-4" aria-hidden /> Add your first goal
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {goals.map((g, i) => (
            <li
              key={g.id}
              className="rise-in flex flex-col gap-3 rounded-[var(--radius-card)] border border-(--border) bg-(--surface) p-4"
              style={{ animationDelay: `${120 + i * 40}ms` }}
            >
              <div className="flex flex-wrap items-start gap-3">
                <FormField className="min-w-0 flex-1">
                  <Label htmlFor={`goal-name-${i}`}>Name</Label>
                  <Input
                    id={`goal-name-${i}`}
                    value={g.name}
                    placeholder="Emergency fund"
                    maxLength={40}
                    onChange={(e) => patch(i, { name: e.target.value })}
                  />
                </FormField>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove goal"
                  onClick={() => removeGoal(i)}
                  className="self-end"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField>
                  <Label htmlFor={`goal-amt-${i}`}>Target amount</Label>
                  <MoneyInput
                    id={`goal-amt-${i}`}
                    valueMinor={g.amountPaise}
                    onChangeMinor={(v) => patch(i, { amountPaise: v })}
                    currency={currency}
                    locale={locale}
                  />
                </FormField>
                <FormField>
                  <Label htmlFor={`goal-date-${i}`}>Target date</Label>
                  <Input
                    id={`goal-date-${i}`}
                    type="date"
                    value={toDateInput(new Date(g.targetDate))}
                    onChange={(e) => {
                      const d = parseDateInput(e.target.value);
                      if (d) patch(i, { targetDate: d });
                    }}
                  />
                </FormField>
                <FormField>
                  <Label htmlFor={`goal-share-${i}`}>Share of sweeps</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`goal-share-${i}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(g.sharePct)}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (Number.isFinite(n)) {
                          patch(i, { sharePct: Math.min(100, Math.max(0, n)) });
                        }
                      }}
                      className="text-center"
                    />
                    <span className="text-sm text-(--muted)">%</span>
                  </div>
                </FormField>
              </div>
            </li>
          ))}
        </ul>
      )}

      {goals.length > 0 ? (
        <div
          className="rise-in flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-(--border) bg-(--surface-2)/30 p-3 text-sm"
          style={{ animationDelay: `${120 + goals.length * 40 + 40}ms` }}
        >
          <p className="text-(--muted)">
            Total share:{" "}
            <span
              className={cn(
                "tabular-nums font-medium",
                sharesOk ? "text-(--success)" : "text-(--warning)",
              )}
            >
              {Math.round(totalShare)}%
            </span>
          </p>
          {!sharesOk ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={balanceShares}
            >
              Auto-balance
            </Button>
          ) : null}
        </div>
      ) : null}

      <FormError message={error ?? undefined} />

      <div
        className="rise-in flex flex-wrap items-center justify-end gap-2"
        style={{ animationDelay: `${120 + goals.length * 40 + 80}ms` }}
      >
        {goals.length > 0 && goals.length < 12 ? (
          <Button type="button" variant="outline" onClick={addGoal}>
            <Plus className="h-4 w-4" aria-hidden /> Add another
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={save}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Saving…" : "Save goals"}
        </Button>
      </div>
    </div>
  );
}
