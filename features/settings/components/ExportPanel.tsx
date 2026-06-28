"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  exportAllJsonAction,
  exportDomainCsvAction,
  type ExportDomain,
} from "../actions/export-data";

const DOMAINS: { key: ExportDomain; label: string }[] = [
  { key: "income", label: "Income" },
  { key: "fixed", label: "Fixed expenses" },
  { key: "variable", label: "Variable expenses" },
  { key: "payments", label: "Bill payments" },
  { key: "savings", label: "Savings entries" },
  { key: "categories", label: "Categories" },
];

function downloadBlob(text: string, mime: string, filename: string) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportPanel() {
  const [busy, setBusy] = useState<ExportDomain | "json" | null>(null);

  const jsonMutation = useMutation({
    mutationFn: () => exportAllJsonAction(),
    onMutate: () => setBusy("json"),
    onSettled: () => setBusy(null),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      downloadBlob(res.data.json, "application/json", res.data.filename);
      toast.success("Exported all data");
    },
  });

  const csvMutation = useMutation({
    mutationFn: (domain: ExportDomain) => exportDomainCsvAction(domain),
    onMutate: (domain) => setBusy(domain),
    onSettled: () => setBusy(null),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      downloadBlob(res.data.csv, "text/csv", res.data.filename);
      toast.success(
        res.data.rowCount === 0
          ? "Exported (no rows)"
          : `Exported ${res.data.rowCount} ${res.data.rowCount === 1 ? "row" : "rows"}`,
      );
    },
  });

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-input)] bg-(--accent)/30"
          >
            <Database className="h-3.5 w-3.5 text-(--text)" />
          </span>
          <div>
            <CardTitle>Export your data</CardTitle>
            <CardDescription>
              Download a full JSON archive for backup, or a per-domain CSV for
              spreadsheet analysis. Money is exported as paise integers to
              preserve precision.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <div className="flex flex-col gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
            Full archive
          </p>
          <Button
            type="button"
            onClick={() => jsonMutation.mutate()}
            disabled={busy !== null}
            className="mt-2"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            {busy === "json" ? "Preparing…" : "Download JSON"}
          </Button>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
            CSV per domain
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DOMAINS.map(({ key, label }) => (
              <Button
                key={key}
                type="button"
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => csvMutation.mutate(key)}
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                {busy === key ? `${label}…` : label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
