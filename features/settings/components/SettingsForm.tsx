"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Moon, Sun, Monitor } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, FormField } from "@/components/ui/form-field";
import { settingsInputSchema, type SettingsInput } from "../schema";
import { updateSettingsAction, type ActionResult } from "../actions";
import type { PlainSettings } from "@/db/repositories/settings";
import { cn } from "@/lib/utils";

type Props = {
  initial: PlainSettings;
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

export function SettingsForm({ initial }: Props) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const form = useForm<SettingsInput>({
    resolver: zodResolver(settingsInputSchema),
    defaultValues: {
      defaultCurrency: initial.defaultCurrency,
      weekStart: initial.weekStart,
      locale: initial.locale,
    },
  });

  const weekStart = form.watch("weekStart");

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
      form.reset(res.data);
    },
    onError: (err) => form.setError("root", { message: err.message }),
  });

  return (
    <div className="flex flex-col gap-4">
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

      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
        </CardHeader>

        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="flex flex-col gap-5"
          noValidate
        >
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
        </form>
      </Card>
    </div>
  );
}
