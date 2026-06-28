"use server";

import { fetchDashboardCharts as fetchDashboardChartsServer } from "./queries";
import type { DashboardChartsData } from "./queries";

/**
 * Server action wrapping the heavy slice of the dashboard data.
 * Called from the client via React Query (`useDashboardCharts`) so the
 * dailySpend reconstruction and per-category breakdowns don't block the
 * dashboard's first paint.
 */
export async function fetchDashboardChartsAction(): Promise<DashboardChartsData> {
  return fetchDashboardChartsServer();
}
