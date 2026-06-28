"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnlineStatus } from "@/lib/pwa/online-status";
import { usePullToRefresh } from "@/lib/pwa/use-pull-to-refresh";

const THRESHOLD = 80;

/**
 * Mounts the pull-to-refresh gesture for the dashboard route. On a
 * threshold-exceeded release it:
 *   - invalidates the React Query "dashboard" key (charts refetch)
 *   - calls `router.refresh()` so the SSR'd core data re-runs too
 *
 * Renders a fixed-top puck that follows the pull and morphs into a
 * spinner during refresh. Disabled while offline (so the puck doesn't
 * collide with the offline banner) and when reduced motion is preferred.
 */
export function DashboardPullToRefresh() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const { progress, pullDistance, refreshing } = usePullToRefresh({
    enabled: online && !reducedMotion,
    threshold: THRESHOLD,
    onRefresh: async () => {
      // Charts (React Query) + core SSR (router.refresh) in parallel.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        new Promise<void>((resolve) => {
          router.refresh();
          // router.refresh is fire-and-forget; give the new RSC tree a
          // beat to land before we collapse the indicator.
          setTimeout(resolve, 350);
        }),
      ]);
    },
  });

  const visible = pullDistance > 4 || refreshing;
  const settled = !refreshing && pullDistance === 0;
  const offset = Math.min(pullDistance, THRESHOLD);
  const armed = progress >= 1;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-x-0 z-30 flex justify-center",
        visible ? "opacity-100" : "opacity-0",
        settled ? "transition-opacity duration-200" : null,
      )}
      style={{
        top: "calc(var(--safe-top) + 4px)",
        transform: `translateY(${offset}px)`,
        transition: settled
          ? "transform 220ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms"
          : refreshing
            ? "transform 200ms cubic-bezier(0.32, 0.72, 0, 1)"
            : undefined,
      }}
    >
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border bg-(--surface) shadow-(--shadow-sheet)",
          armed || refreshing ? "border-(--accent)" : "border-(--border)",
        )}
      >
        {refreshing ? (
          <Loader2 className="h-4 w-4 animate-spin text-(--accent)" />
        ) : (
          <ArrowDown
            className="h-4 w-4 text-(--accent)"
            style={{
              transform: `rotate(${armed ? 180 : 0}deg)`,
              transition: "transform 160ms cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          />
        )}
      </div>
    </div>
  );
}
