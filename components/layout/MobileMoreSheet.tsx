"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  EyeOff,
  LayoutGrid,
  LogOut,
  PiggyBank,
  Settings,
  Tags,
  User as UserIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "./ThemeToggle";
import { SignOutDialog } from "./SignOutDialog";
import { directionFromTo } from "@/lib/nav/tab-order";
import { useCalmMode } from "@/lib/preferences/use-calm-mode";
import { useDensity } from "@/lib/preferences/use-density";
import { cn } from "@/lib/utils";

export type MobileMoreSheetUser = {
  name: string;
  email: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: MobileMoreSheetUser | null;
};

const ITEMS = [
  { href: "/savings", label: "Savings", icon: PiggyBank },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function MobileMoreSheet({ open, onOpenChange, user }: Props) {
  const pathname = usePathname() ?? "";
  const { calm, toggle: toggleCalm } = useCalmMode();
  const { density, setDensity } = useDensity();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="gap-4 overflow-y-auto rounded-t-[var(--radius-card)]"
      >
        <SheetHeader>
          <SheetTitle>
            <span className="font-display text-2xl tracking-tight">More</span>
          </SheetTitle>
        </SheetHeader>

        <ul className="flex flex-col gap-1">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              href === pathname || pathname.startsWith(`${href}/`);
            const dir = directionFromTo(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => onOpenChange(false)}
                  {...(dir ? { transitionTypes: [dir] } : {})}
                  className={cn(
                    "flex items-center gap-3 rounded-[var(--radius-input)] px-3 py-3 text-sm font-medium",
                    active
                      ? "bg-(--accent)/30 text-(--text)"
                      : "text-(--text) hover:bg-(--surface-2)",
                  )}
                >
                  <Icon className="h-4 w-4 text-(--muted)" aria-hidden />
                  <span className="flex-1">{label}</span>
                  <ChevronRight className="h-4 w-4 text-(--muted)" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2)/40 px-3 py-2">
          <span className="text-sm text-(--muted)">Theme</span>
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-3 rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2)/40 px-3 py-2">
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--accent)/30"
          >
            <EyeOff className="h-4 w-4 text-(--text)" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-(--text)">Calm mode</p>
            <p className="truncate text-[11px] text-(--muted)">
              Blur amounts so you can scan without dwelling on rupees.
            </p>
          </div>
          <Switch
            checked={calm}
            onCheckedChange={toggleCalm}
            ariaLabel="Toggle calm mode"
          />
        </div>

        <div className="flex items-center gap-3 rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2)/40 px-3 py-2">
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--accent)/30"
          >
            <LayoutGrid className="h-4 w-4 text-(--text)" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-(--text)">Density</p>
            <p className="truncate text-[11px] text-(--muted)">
              Compact tightens cards and rows.
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="UI density"
            className="inline-flex rounded-full border border-(--border) bg-(--surface) p-0.5 text-[11px] font-medium"
          >
            {(["cozy", "compact"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={density === opt}
                onClick={() => setDensity(opt)}
                className={cn(
                  "rounded-full px-2.5 py-1 transition-colors",
                  density === opt
                    ? "bg-(--accent)/30 text-(--text)"
                    : "text-(--muted)",
                )}
              >
                {opt === "cozy" ? "Cozy" : "Compact"}
              </button>
            ))}
          </div>
        </div>

        {user ? (
          <div className="flex items-center gap-2 rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2)/40 px-3 py-2">
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--accent)/40"
            >
              <UserIcon className="h-4 w-4 text-(--text)" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-(--text)">
                {user.name}
              </p>
              <p className="truncate text-xs text-(--muted)">{user.email}</p>
            </div>
            <SignOutDialog onBeforeSignOut={() => onOpenChange(false)}>
              <button
                type="button"
                aria-label="Sign out"
                className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-input)] text-(--danger)/80 hover:bg-(--danger)/15 hover:text-(--danger)"
              >
                <LogOut className="h-4 w-4" aria-hidden />
              </button>
            </SignOutDialog>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
