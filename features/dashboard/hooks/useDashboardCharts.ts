"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchDashboardChartsAction } from "../actions";
import type { DashboardChartsData } from "../queries";

/**
 * Loads the heavy slice of the dashboard (per-day spend reconstruction,
 * monthly category breakdowns) on the client with stale-while-revalidate.
 *
 * - First paint: skeletons render while the action runs.
 * - Re-entry within 5 minutes: cache hit, instant paint, refresh in
 *   the background.
 * - Window focus: refetches if stale (>60s).
 *
 * All three chart components subscribe to the same key, so there is only
 * one network call regardless of how many cards are mounted.
 */
export function useDashboardCharts(): UseQueryResult<DashboardChartsData> {
  return useQuery({
    queryKey: ["dashboard", "charts"],
    queryFn: fetchDashboardChartsAction,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
}
