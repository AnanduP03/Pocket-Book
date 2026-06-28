"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Tag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDialog } from "@/features/shared/components/ConfirmDialog";
import { VariableForm } from "./VariableForm";
import { VariableList } from "./VariableList";
import { VariableAnchorBar } from "./VariableAnchorBar";
import { VariableFilterPill } from "./VariableFilterPill";
import { CollapsibleSection } from "./CollapsibleSection";
import { TagReflection } from "./TagReflection";
import { RitualChips } from "./RitualChips";
import { TaxExportCard } from "./TaxExportCard";
import { buildTagInsights } from "../lib/build-tag-insights";
import { detectRituals } from "../lib/detect-rituals";
import type { VariableFiltersState } from "./VariableFilters";
import {
  bulkDeleteVariableAction,
  bulkSetCategoryAction,
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
  initialFilterStart: Date;
  initialFilterEnd: Date;
  categories: PlainCategory[];
  defaultCurrency: string;
  defaultLocale: string;
};

export function VariableListView({
  initial,
  initialFilterStart,
  initialFilterEnd,
  categories,
  defaultCurrency,
  defaultLocale,
}: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<VariableFiltersState>(() => {
    const cat = searchParams.get("cat");
    const q = searchParams.get("q");
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    return {
      start: start ? new Date(`${start}T00:00:00.000Z`) : initialFilterStart,
      end: end ? new Date(`${end}T00:00:00.000Z`) : initialFilterEnd,
      categoryIds: cat ? cat.split(",").filter(Boolean) : [],
      text: q ?? "",
    };
  });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<PlainVariable | null>(null);
  const [deleting, setDeleting] = useState<PlainVariable | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const [ritualPrefill, setRitualPrefill] = useState<{
    amountPaise: number;
    categoryId: string;
  } | null>(null);
  const [creatingFromRitual, setCreatingFromRitual] = useState(false);

  // SSR initialData hits when the user first lands (matches the
  // initialFilter* range). Filter / page changes invalidate the cache
  // and refetch — anchor numbers come along on the same response.
  const isInitialKey =
    page === 1 &&
    filters.start?.getTime() === initialFilterStart.getTime() &&
    filters.end?.getTime() === initialFilterEnd.getTime() &&
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
    ...(isInitialKey ? { initialData: initial } : {}),
  });

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  // Precompute insights/rituals once so the wrapping collapsibles can
  // auto-hide when they'd render nothing. Both helpers are pure, so
  // useMemo is correctness-preserving (cheap on item-count changes).
  const tagInsights = useMemo(
    () => buildTagInsights(data.items, categories),
    [data.items, categories],
  );
  const rituals = useMemo(() => detectRituals(data.items), [data.items]);

  const deleteWithUndo = (item: PlainVariable) => {
    // Optimistically remove from every cached page that contains this id.
    queryClient.cancelQueries({ queryKey: ["variable"] });
    const snapshot = queryClient.getQueriesData<VariablePage>({
      queryKey: ["variable"],
    });
    for (const [key, page] of snapshot) {
      if (!page) continue;
      if (!page.items.some((x) => x.id === item.id)) continue;
      queryClient.setQueryData<VariablePage>(key, {
        ...page,
        items: page.items.filter((x) => x.id !== item.id),
        total: Math.max(0, page.total - 1),
      });
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      const res = await deleteVariableAction(item.id);
      if (!res.ok) {
        // Restore on failure so the user isn't silently inconsistent.
        for (const [key, page] of snapshot) {
          if (page) queryClient.setQueryData(key, page);
        }
        toast.error(res.error.message);
      }
      await queryClient.invalidateQueries({ queryKey: ["variable"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }, 6000);

    toast("Expense deleted", {
      duration: 6000,
      action: {
        label: "Undo",
        onClick: () => {
          cancelled = true;
          clearTimeout(timer);
          for (const [key, page] of snapshot) {
            if (page) queryClient.setQueryData(key, page);
          }
        },
      },
    });
  };

  function updateFilters(next: VariableFiltersState) {
    setFilters(next);
    setPage(1);

    const params = new URLSearchParams();
    if (next.categoryIds.length > 0)
      params.set("cat", next.categoryIds.join(","));
    if (next.text) params.set("q", next.text);
    if (
      next.start &&
      next.start.getTime() !== initialFilterStart.getTime()
    ) {
      params.set("start", next.start.toISOString().slice(0, 10));
    }
    if (next.end && next.end.getTime() !== initialFilterEnd.getTime()) {
      params.set("end", next.end.toISOString().slice(0, 10));
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  // Tell global chrome (FAB, mobile tab bar) when select mode is on so
  // they hide and surrender the bottom safe area to the action bar.
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("pocketbook:select-mode", { detail: selectMode }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("pocketbook:select-mode", { detail: false }),
      );
    };
  }, [selectMode]);

  function toggleSelect(item: PlainVariable) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }

  async function runBulkDelete() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const res = await bulkDeleteVariableAction(ids);
    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }
    toast.success(
      `Deleted ${res.data.deleted} ${res.data.deleted === 1 ? "expense" : "expenses"}`,
    );
    exitSelectMode();
    setConfirmingBulkDelete(false);
    await queryClient.invalidateQueries({ queryKey: ["variable"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  async function runBulkSetCategory(categoryId: string) {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const res = await bulkSetCategoryAction(ids, categoryId);
    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }
    toast.success(
      `Recategorized ${res.data.updated} ${res.data.updated === 1 ? "expense" : "expenses"}`,
    );
    exitSelectMode();
    await queryClient.invalidateQueries({ queryKey: ["variable"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  const variableCategories = useMemo(
    () => categories.filter((c) => c.type === "Variable"),
    [categories],
  );

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div className="rise-in" style={{ animationDelay: "0ms" }}>
        <PageHeader
          eyebrow="Day-to-day"
          title="Variable expenses"
          description="One-off purchases. The floating button (or press N from anywhere) opens the quick-log."
        />
      </div>

      <div className="rise-in" style={{ animationDelay: "60ms" }}>
        <VariableAnchorBar
          monthTotalPaise={data.monthTotalPaise}
          todayTotalPaise={data.todayTotalPaise}
          todayCount={data.todayCount}
          currency={defaultCurrency}
          locale={defaultLocale}
        />
      </div>

      <div className="rise-in" style={{ animationDelay: "120ms" }}>
        <VariableFilterPill
          filters={filters}
          onChange={updateFilters}
          categories={categories}
        />
      </div>

      <div className="rise-in flex items-center justify-between text-xs text-(--muted)" style={{ animationDelay: "150ms" }}>
        <span>
          {data.total === 0
            ? "No matches"
            : `${data.total} ${data.total === 1 ? "expense" : "expenses"} · page ${page} of ${totalPages}`}
          {isFetching ? " · updating…" : null}
        </span>
      </div>

      <div className="rise-in" style={{ animationDelay: "200ms" }}>
        <VariableList
          items={data.items}
          categories={categories}
          locale={defaultLocale}
          onEdit={(e) => setEditing(e)}
          onDelete={(e) => setDeleting(e)}
          selectMode={selectMode}
          selectedIds={selectedIds}
          onLongPress={(e) => {
            setSelectMode(true);
            setSelectedIds(new Set([e.id]));
          }}
          onSelectToggle={toggleSelect}
          emptyMessage={
            filters.start ||
            filters.end ||
            filters.categoryIds.length > 0 ||
            filters.text
              ? "Nothing matches those filters. Loosen them or clear them out."
              : "Nothing logged yet. Tap the floating + and your day starts paying attention."
          }
        />
      </div>

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

      <div className="rise-in flex flex-col gap-3" style={{ animationDelay: "260ms" }}>
        <CollapsibleSection
          title="Patterns this month"
          hidden={tagInsights.length === 0}
        >
          <TagReflection
            items={data.items}
            categories={categories}
            currency={defaultCurrency}
            locale={defaultLocale}
            insights={tagInsights}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Your usuals"
          hidden={rituals.length === 0}
        >
          <RitualChips
            items={data.items}
            categories={categories}
            currency={defaultCurrency}
            locale={defaultLocale}
            rituals={rituals}
            onLog={(init) => {
              setRitualPrefill(init);
              setCreatingFromRitual(true);
            }}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Tools">
          <TaxExportCard />
        </CollapsibleSection>
      </div>

      <VariableForm
        open={creatingFromRitual}
        onOpenChange={(open) => {
          setCreatingFromRitual(open);
          if (!open) setRitualPrefill(null);
        }}
        categories={categories}
        defaultCurrency={defaultCurrency}
        recentForPrediction={data.items}
        {...(ritualPrefill ? { initialDefaults: ritualPrefill } : {})}
      />
      <VariableForm
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        categories={categories}
        defaultCurrency={defaultCurrency}
        recentForPrediction={data.items}
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
        onConfirm={() => {
          if (deleting) {
            const target = deleting;
            setDeleting(null);
            deleteWithUndo(target);
          }
        }}
      />

      <ConfirmDialog
        open={confirmingBulkDelete}
        onOpenChange={(open) => {
          if (!open) setConfirmingBulkDelete(false);
        }}
        title={`Delete ${selectedIds.size} ${selectedIds.size === 1 ? "expense" : "expenses"}?`}
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={runBulkDelete}
      />

      {selectMode ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-(--border) bg-(--surface)/95 px-3 pt-3 backdrop-blur-sm"
          style={{ paddingBottom: "calc(var(--safe-bottom) + 0.75rem)" }}
        >
          <div
            role="toolbar"
            aria-label="Bulk actions"
            className="mx-auto flex max-w-2xl items-center gap-2"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Cancel selection"
              onClick={exitSelectMode}
            >
              <X className="h-3.5 w-3.5" aria-hidden /> Cancel
            </Button>
            <span className="whitespace-nowrap px-1 text-sm tabular-nums text-(--text)">
              {selectedIds.size} selected
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      selectedIds.size === 0 || variableCategories.length === 0
                    }
                  >
                    <Tag className="h-3.5 w-3.5" aria-hidden />
                    <span className="hidden sm:inline">Recategorize</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[12rem]">
                  {variableCategories.map((c) => (
                    <DropdownMenuItem
                      key={c.id}
                      onSelect={() => runBulkSetCategory(c.id)}
                    >
                      <CategoryIcon name={c.icon} color={c.color} size="sm" />
                      {c.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={() => setConfirmingBulkDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
