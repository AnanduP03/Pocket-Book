"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/features/shared/components/ConfirmDialog";
import { VariableForm } from "./VariableForm";
import { VariableList } from "./VariableList";
import { VariableQuickAdd } from "./VariableQuickAdd";
import {
  VariableFilters,
  type VariableFiltersState,
} from "./VariableFilters";
import {
  deleteVariableAction,
  fetchVariable,
  type VariablePage,
} from "../actions";
import { formatCurrency } from "@/lib/format/money";
import type { PlainCategory } from "@/db/repositories/categories";
import type { PlainVariable } from "@/db/repositories/variable";

const PAGE_SIZE = 20;

type Props = {
  initial: VariablePage;
  categories: PlainCategory[];
  defaultCurrency: string;
  defaultLocale: string;
};

export function VariableListView({
  initial,
  categories,
  defaultCurrency,
  defaultLocale,
}: Props) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<VariableFiltersState>({
    start: null,
    end: null,
    categoryIds: [],
    text: "",
  });
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PlainVariable | null>(null);
  const [deleting, setDeleting] = useState<PlainVariable | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isFresh =
    page === 1 &&
    !filters.start &&
    !filters.end &&
    filters.categoryIds.length === 0 &&
    filters.text === "";

  const { data = initial, isFetching } = useQuery<VariablePage>({
    queryKey: [
      "variable",
      {
        start: filters.start?.toISOString() ?? null,
        end: filters.end?.toISOString() ?? null,
        categoryIds: filters.categoryIds,
        text: filters.text,
        page,
      },
    ],
    queryFn: () =>
      fetchVariable({
        start: filters.start?.toISOString() ?? null,
        end: filters.end?.toISOString() ?? null,
        categoryIds: filters.categoryIds,
        text: filters.text,
        page,
        pageSize: PAGE_SIZE,
      }),
    ...(isFresh ? { initialData: initial } : {}),
  });

  const totalPaise = useMemo(
    () => data.items.reduce((s, e) => s + e.amountPaise, 0),
    [data.items],
  );

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  const deleteMutation = useMutation({
    mutationFn: deleteVariableAction,
    onMutate: (id) => setBusyId(id),
    onSettled: async () => {
      setBusyId(null);
      await queryClient.invalidateQueries({ queryKey: ["variable"] });
    },
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Expense deleted");
      setDeleting(null);
    },
  });

  function updateFilters(next: VariableFiltersState) {
    setFilters(next);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-(--text)">
          Variable expenses
        </h1>
        <Button onClick={() => setCreating(true)} disabled={categories.length === 0}>
          <Plus className="h-4 w-4" aria-hidden /> New variable expense
        </Button>
      </header>

      <VariableQuickAdd
        categories={categories}
        defaultCurrency={defaultCurrency}
        defaultLocale={defaultLocale}
      />

      <VariableFilters
        filters={filters}
        onChange={updateFilters}
        categories={categories}
      />

      <div className="flex items-center justify-between text-sm text-(--muted)">
        <span>
          {data.total === 0
            ? "No matches"
            : `${data.total} ${data.total === 1 ? "expense" : "expenses"} · page ${page} of ${totalPages}`}
          {isFetching ? " · updating…" : null}
        </span>
        <span className="tabular-nums">
          {data.items.length > 0
            ? `Page total: ${formatCurrency(totalPaise)}`
            : null}
        </span>
      </div>

      <VariableList
        items={data.items}
        categories={categories}
        onEdit={(e) => setEditing(e)}
        onDelete={(e) => setDeleting(e)}
        busyId={busyId}
        emptyMessage={
          filters.start ||
          filters.end ||
          filters.categoryIds.length > 0 ||
          filters.text
            ? "No expenses match these filters."
            : "No expenses yet — log your first to see it here."
        }
      />

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isFetching}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden /> Prev
          </Button>
          <span className="text-xs text-(--muted)">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isFetching}
          >
            Next <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ) : null}

      <VariableForm
        open={creating}
        onOpenChange={setCreating}
        categories={categories}
        defaultCurrency={defaultCurrency}
      />
      <VariableForm
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        categories={categories}
        defaultCurrency={defaultCurrency}
        {...(editing ? { expense: editing } : {})}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete this expense?"
        description={
          deleting
            ? `${formatCurrency(deleting.amountPaise, deleting.currency)} · ${
                deleting.note ?? "no note"
              }`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        busy={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id);
        }}
      />
    </div>
  );
}
