"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowDownToLine,
  Repeat,
  Receipt,
  PiggyBank,
  Tags,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/income", label: "Income", icon: ArrowDownToLine },
  { href: "/fixed", label: "Fixed", icon: Repeat },
  { href: "/variable", label: "Variable", icon: Receipt },
  { href: "/savings", label: "Savings", icon: PiggyBank },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function TabNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            {...(onNavigate ? { onClick: onNavigate } : {})}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius-input)] px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-(--accent)/30 text-(--text)"
                : "text-(--muted) hover:bg-(--surface-2) hover:text-(--text)",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                active ? "text-(--text)" : "text-(--muted)",
              )}
              aria-hidden
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
