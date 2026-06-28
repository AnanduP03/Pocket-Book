"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { ArrowRight, Moon, Sun, Monitor, Plus, Target, Trash2, Zap } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, FormField } from "@/components/ui/form-field";
import { MoneyInput } from "@/features/shared/components/MoneyInput";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { settingsInputSchema, type SettingsInput } from "../schema";
import { updateSettingsAction, type ActionResult } from "../actions";
import type { PlainSettings } from "@/db/repositories/settings";
import type { PlainCategory } from "@/db/repositories/categories";
import { cn } from "@/lib/utils";

type Props = {
  initial: PlainSettings;
  categories: PlainCategory[];
};

const WEEK_START_OPTIONS: { value: 0 | 1; label: string }[] = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
];

const THEMES = [
  { value: "light" as const, label: "Light", icon: Sun },
  { value: "dark" as const, label: "Dark", icon: Moon },
  { value: "system" as const, label: "System", icon: Monitor },
];

function toDateInputValue(d: Date): string {
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

export function SettingsForm({ initial, categories }: Props) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const variableCategories = categories.filter((c) => c.type === "Variable");
  const categoryById = new Map(categories.map((c) => [c.id, c] as const));
  const savingsGoalsCount = initial.savingsGoals.length;

  const form = useForm<SettingsInput>({
    resolver: zodResolver(settingsInputSchema),
    defaultValues: {
      defaultCurrency: initial.defaultCurrency,
      weekStart: initial.weekStart,
      locale: initial.locale,
      quickPresets: initial.quickPresets ?? [],
    },
  });

  const weekStart = form.watch("weekStart");
  const quickPresets = form.watch("quickPresets") ?? [];

  const mutation = useMutation<ActionResult<PlainSettings>, Error, SettingsInput>({
    mutationFn: (values) => updateSettingsAction(values),
    onSuccess: (res) => {
      if (!res.ok) {
        if (res.error.field) {
          form.setError(res.error.field as keyof SettingsInput, {
            message: res.error.message,
          });
        } else {
          form.setError("root", { message: res.error.message });
        }
        return;
      }
      toast.success("Saved");
      form.reset({
        defaultCurrency: res.data.defaultCurrency,
        weekStart: res.data.weekStart,
        locale: res.data.locale,
        quickPresets: res.data.quickPresets ?? [],
      });
    },
    onError: (err) => form.setError("root", { message: err.message }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="rise-in" style={{ animationDelay: "60ms" }}>
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <div role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => {
              const active = mounted ? theme === value : value === "system";
              return (
                <Button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  variant={active ? "secondary" : "outline"}
                  onClick={() => setTheme(value)}
                >
                  <Icon className="h-4 w-4" aria-hidden /> {label}
                </Button>
              );
            })}
          </div>
        </Card>
      </div>

      <form
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="rise-in" style={{ animationDelay: "90ms" }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-input)] bg-(--accent)/40"
                >
                  <Target className="h-3.5 w-3.5 text-(--text)" />
                </span>
                <div>
                  <CardTitle>Savings goals</CardTitle>
                  <CardDescription>
                    {savingsGoalsCount > 0
                      ? `${savingsGoalsCount} ${savingsGoalsCount === 1 ? "goal" : "goals"} · split sweeps by share`
                      : "Name what you're saving for · sweeps split by share"}
                  </CardDescription>
                </div>
              </div>
              <Link
                href="/savings/goals"
                className="inline-flex items-center gap-1 text-xs font-medium text-(--accent) underline-offset-2 hover:underline"
              >
                Manage <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </CardHeader>
          </Card>
        </div>

        <div className="rise-in" style={{ animationDelay: "105ms" }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-input)] bg-(--accent)/40"
                >
                  <Zap className="h-3.5 w-3.5 text-(--text)" />
                </span>
                <div>
                  <CardTitle>Quick log presets</CardTitle>
                  <CardDescription>
                    Tap a preset in the quick-log sheet to log it instantly. Up to 6.
                  </CardDescription>
                </div>
              </div>
              {quickPresets.length < 6 && variableCategories.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next = [
                      ...quickPresets,
                      {
                        id:
                          typeof crypto !== "undefined" && "randomUUID" in crypto
                            ? crypto.randomUUID()
                            : `p${Date.now()}-${quickPresets.length}`,
                        label: "",
                        amountPaise: 0,
                        categoryId: variableCategories[0]?.id ?? "",
                      },
                    ];
                    form.setValue("quickPresets", next, {
                      shouldDirty: true,
                    });
                  }}
                >
                  <Plus className="h-4 w-4" aria-hidden /> Add
                </Button>
              ) : null}
            </CardHeader>

            {variableCategories.length === 0 ? (
              <p className="text-xs text-(--muted)">
                Add a Variable category before creating presets.
              </p>
            ) : quickPresets.length === 0 ? (
              <p className="text-xs text-(--muted)">
                No presets yet. Add one — say <em>Coffee · ₹250</em> — and it appears at the top of the quick-log sheet.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {quickPresets.map((p, i) => {
                  const cat = categoryById.get(p.categoryId);
                  return (
                    <li
                      key={p.id}
                      className="flex flex-col gap-2 rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2)/30 p-3 sm:flex-row sm:items-center"
                    >
                      <div className="flex items-center gap-2 sm:w-12">
                        {cat ? (
                          <CategoryIcon name={cat.icon} color={cat.color} size="sm" />
                        ) : (
                          <span
                            aria-hidden
                            className="h-7 w-7 rounded-[var(--radius-input)] bg-(--surface-2)"
                          />
                        )}
                      </div>
                      <FormField className="flex-1">
                        <Label htmlFor={`preset-label-${i}`} className="sr-only">
                          Preset label
                        </Label>
                        <Input
                          id={`preset-label-${i}`}
                          placeholder="Coffee"
                          maxLength={24}
                          value={p.label}
                          onChange={(e) => {
                            const next = [...quickPresets];
                            next[i] = { ...p, label: e.target.value };
                            form.setValue("quickPresets", next, {
                              shouldDirty: true,
                            });
                          }}
                        />
                      </FormField>
                      <FormField className="sm:w-32">
                        <Label htmlFor={`preset-amount-${i}`} className="sr-only">
                          Preset amount
                        </Label>
                        <MoneyInput
                          id={`preset-amount-${i}`}
                          valueMinor={p.amountPaise}
                          onChangeMinor={(v) => {
                            const next = [...quickPresets];
                            next[i] = { ...p, amountPaise: v };
                            form.setValue("quickPresets", next, {
                              shouldDirty: true,
                            });
                          }}
                          currency={initial.defaultCurrency}
                          locale={initial.locale}
                        />
                      </FormField>
                      <FormField className="sm:w-44">
                        <Label htmlFor={`preset-cat-${i}`} className="sr-only">
                          Category
                        </Label>
                        <select
                          id={`preset-cat-${i}`}
                          value={p.categoryId}
                          onChange={(e) => {
                            const next = [...quickPresets];
                            next[i] = { ...p, categoryId: e.target.value };
                            form.setValue("quickPresets", next, {
                              shouldDirty: true,
                            });
                          }}
                          className="flex h-11 w-full rounded-[var(--radius-input)] border border-(--border) bg-(--surface) px-3 text-base text-(--text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) sm:h-9 sm:text-sm"
                        >
                          {variableCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </FormField>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Delete preset"
                        onClick={() => {
                          const next = quickPresets.filter((_, j) => j !== i);
                          form.setValue("quickPresets", next, {
                            shouldDirty: true,
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="rise-in" style={{ animationDelay: "120ms" }}>
          <Card>
            <CardHeader>
              <CardTitle>Defaults</CardTitle>
            </CardHeader>

            <div className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField>
                  <Label htmlFor="settings-currency">Currency</Label>
                  <Input
                    id="settings-currency"
                    placeholder="INR"
                    maxLength={3}
                    {...form.register("defaultCurrency", {
                      setValueAs: (v: unknown) =>
                        typeof v === "string" ? v.toUpperCase().trim() : v,
                    })}
                    aria-invalid={Boolean(form.formState.errors.defaultCurrency)}
                    className="uppercase"
                  />
                  <FormError message={form.formState.errors.defaultCurrency?.message} />
                </FormField>

                <FormField>
                  <Label htmlFor="settings-locale">Locale</Label>
                  <Input
                    id="settings-locale"
                    placeholder="en-IN"
                    {...form.register("locale")}
                    aria-invalid={Boolean(form.formState.errors.locale)}
                  />
                  <FormError message={form.formState.errors.locale?.message} />
                </FormField>
              </div>

              <FormField>
                <Label>Week starts on</Label>
                <div role="radiogroup" aria-label="Week starts on" className="flex gap-2">
                  {WEEK_START_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={weekStart === opt.value}
                      onClick={() =>
                        form.setValue("weekStart", opt.value, { shouldDirty: true })
                      }
                      className={cn(
                        "rounded-[var(--radius-input)] border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)",
                        weekStart === opt.value
                          ? "border-(--accent) bg-(--accent)/30 text-(--text)"
                          : "border-(--border) bg-(--surface) text-(--muted) hover:bg-(--surface-2)",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </FormField>

              <FormError message={form.formState.errors.root?.message} />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    form.reset({
                      defaultCurrency: initial.defaultCurrency,
                      weekStart: initial.weekStart,
                      locale: initial.locale,
                      quickPresets: initial.quickPresets ?? [],
                    })
                  }
                  disabled={!form.formState.isDirty || mutation.isPending}
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  disabled={!form.formState.isDirty || mutation.isPending}
                >
                  {mutation.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
