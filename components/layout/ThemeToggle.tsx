"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ORDER = ["light", "dark", "system"] as const;
type Mode = (typeof ORDER)[number];

const ICONS: Record<Mode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const LABELS: Record<Mode, string> = {
  light: "Light theme",
  dark: "Dark theme",
  system: "System theme",
};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const current = (mounted ? theme : "system") as Mode;
  const Icon = ICONS[current] ?? Monitor;

  function cycle() {
    const idx = ORDER.indexOf(current);
    const next = ORDER[(idx + 1) % ORDER.length] ?? "system";
    setTheme(next);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={LABELS[current]}
      className={cn(className)}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </Button>
  );
}
