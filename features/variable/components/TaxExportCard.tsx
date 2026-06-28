"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { exportTaxDeductibleCsvAction } from "../actions";

/**
 * Triggers a CSV download of every variable expense in the chosen year
 * tagged "tax", "tax-deductible", or "deductible". Defaults to the year
 * just past — most people export after Dec 31 to file taxes.
 *
 * Auto-hides on mobile; this is a desktop-first power-user feature.
 */
export function TaxExportCard() {
  const now = new Date();
  const defaultYear =
    now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
  const [year, setYear] = useState(defaultYear);

  const mutation = useMutation({
    mutationFn: () => exportTaxDeductibleCsvAction(year),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      if (res.data.rowCount === 0) {
        toast.message("No tax-tagged expenses found", {
          description: `Tag expenses with "tax" or "tax-deductible" first.`,
        });
        return;
      }
      const blob = new Blob([res.data.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(
        `Exported ${res.data.rowCount} ${res.data.rowCount === 1 ? "row" : "rows"}`,
      );
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Export failed"),
  });

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-input)] bg-(--accent)/30"
          >
            <Download className="h-3.5 w-3.5 text-(--text)" />
          </span>
          <div>
            <CardTitle>Tax export</CardTitle>
            <CardDescription>
              Download every expense tagged{" "}
              <code className="rounded bg-(--surface-2) px-1 text-[11px]">
                tax
              </code>{" "}
              or{" "}
              <code className="rounded bg-(--surface-2) px-1 text-[11px]">
                deductible
              </code>{" "}
              as CSV.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor="tax-year"
          className="text-[11px] uppercase tracking-[0.18em] text-(--muted)"
        >
          Year
        </label>
        <input
          id="tax-year"
          type="number"
          min={2000}
          max={2100}
          value={year}
          onChange={(e) => setYear(Number(e.target.value) || defaultYear)}
          className="h-9 w-24 rounded-[var(--radius-input)] border border-(--border) bg-(--surface) px-3 text-sm tabular-nums"
        />
        <Button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Preparing…" : "Download CSV"}
        </Button>
      </div>
    </Card>
  );
}
