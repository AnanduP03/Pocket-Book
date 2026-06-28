"use server";

import { fetchMonthEndWrapup as fetchMonthEndWrapupServer } from "./wrapup-queries";
import type { MonthEndWrapup } from "./wrapup-queries";

export async function fetchMonthEndWrapupAction(): Promise<MonthEndWrapup | null> {
  return fetchMonthEndWrapupServer();
}
