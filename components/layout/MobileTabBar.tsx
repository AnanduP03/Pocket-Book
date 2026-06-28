"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Repeat,
  ArrowDownToLine,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { directionFromTo } from "@/lib/nav/tab-order";
import { MobileMoreSheet, type MobileMoreSheetUser } from "./MobileMoreSheet";

type Tab = {
  href?: string;
  label: string;
  icon: LucideIcon;
  matches?: (pathname: string) => boolean;
  isMore?: boolean;
};

const TABS: Tab[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/fixed", label: "Fixed", icon: Repeat },
  { href: "/variable", label: "Variable", icon: Receipt },
  { href: "/income", label: "Income", icon: ArrowDownToLine },
  {
    label: "More",
    icon: MoreHorizontal,
    isMore: true,
    matches: (p) =>
      p.startsWith("/savings") ||
      p.startsWith("/categories") ||
      p.startsWith("/settings"),
  },
];

type Props = {
  user: MobileMoreSheetUser | null;
};

export function MobileTabBar({ user }: Props) {
  const pathname = usePathname() ?? "";
  const [moreOpen, setMoreOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);

  useEffect(() => {
    const onSelect = (e: Event) => {
      setSelectMode((e as CustomEvent<boolean>).detail === true);
    };
    window.addEventListener("pocketbook:select-mode", onSelect);
    return () =>
      window.removeEventListener("pocketbook:select-mode", onSelect);
  }, []);

  if (selectMode) return null;

  return (
    <>
      <nav
        aria-label="Primary"
        role="tablist"
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-(--border) bg-(--surface)/95 backdrop-blur-sm lg:hidden"
        style={{
          paddingBottom: "var(--safe-bottom)",
          paddingLeft: "var(--safe-left)",
          paddingRight: "var(--safe-right)",
          viewTransitionName: "mobile-tabbar",
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.isMore
            ? moreOpen || (tab.matches?.(pathname) ?? false)
            : tab.href === pathname || pathname.startsWith(`${tab.href}/`);

          const content = (
            <span
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium tracking-wide",
                active ? "text-(--text)" : "text-(--muted)",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform",
                  active ? "scale-105" : "scale-100",
                )}
                aria-hidden
                strokeWidth={active ? 2.4 : 1.8}
              />
              {tab.label}
            </span>
          );

          if (tab.isMore) {
            return (
              <button
                key="more"
                type="button"
                role="tab"
                aria-selected={active}
                aria-label="More — Savings, Categories, Settings"
                onClick={() => setMoreOpen(true)}
                className="relative flex h-14 flex-1 items-center justify-center"
              >
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-4 top-0 h-[2px] rounded-b-full bg-(--accent)"
                  />
                ) : null}
                {content}
              </button>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href!}
              role="tab"
              aria-selected={active}
              aria-current={active ? "page" : undefined}
              {...(() => {
                const dir = directionFromTo(pathname, tab.href!);
                return dir ? { transitionTypes: [dir] } : {};
              })()}
              className="relative flex h-14 flex-1 items-center justify-center"
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute inset-x-4 top-0 h-[2px] rounded-b-full bg-(--accent)"
                />
              ) : null}
              {content}
            </Link>
          );
        })}
      </nav>

      <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} user={user} />
    </>
  );
}
