"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionLabel } from "@/components/layout/SectionLabel";
import { ConfirmDialog } from "@/features/shared/components/ConfirmDialog";
import { CategoryForm } from "./CategoryForm";
import { CategoryGrid } from "./CategoryGrid";
import { deleteCategoryAction, fetchCategories } from "../actions";
import type { PlainCategory } from "@/db/repositories/categories";

type Props = {
  initial: PlainCategory[];
};

export function CategoryListView({ initial }: Props) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PlainCategory | null>(null);
  const [deleting, setDeleting] = useState<PlainCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data = initial } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(),
    initialData: initial,
  });

  const grouped = useMemo(() => {
    const fixed = data.filter((c) => c.type === "Fixed");
    const variable = data.filter((c) => c.type === "Variable");
    return { fixed, variable };
  }, [data]);

  const deleteMutation = useMutation({
    mutationFn: deleteCategoryAction,
    onMutate: (id) => setBusyId(id),
    onSettled: async () => {
      setBusyId(null);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Category deleted");
      setDeleting(null);
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="rise-in" style={{ animationDelay: "0ms" }}>
        <PageHeader
          eyebrow="Organize"
          title="Categories"
          description="Tag every expense with a category so the dashboard can group and trend it. Pick from variable (one-off) or fixed (recurring)."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden /> New category
            </Button>
          }
        />
      </div>

      <section
        className="rise-in flex flex-col gap-3"
        style={{ animationDelay: "60ms" }}
      >
        <SectionLabel
          trailing={`${grouped.fixed.length} ${grouped.fixed.length === 1 ? "category" : "categories"}`}
        >
          Fixed
        </SectionLabel>
        <CategoryGrid
          categories={grouped.fixed}
          onEdit={(c) => setEditing(c)}
          onDelete={(c) => setDeleting(c)}
          busyId={busyId}
        />
      </section>

      <section
        className="rise-in flex flex-col gap-3"
        style={{ animationDelay: "120ms" }}
      >
        <SectionLabel
          trailing={`${grouped.variable.length} ${grouped.variable.length === 1 ? "category" : "categories"}`}
        >
          Variable
        </SectionLabel>
        <CategoryGrid
          categories={grouped.variable}
          onEdit={(c) => setEditing(c)}
          onDelete={(c) => setDeleting(c)}
          busyId={busyId}
        />
      </section>

      <CategoryForm open={creating} onOpenChange={setCreating} />
      <CategoryForm
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        {...(editing ? { category: editing } : {})}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={`Delete ${deleting?.name ?? "category"}?`}
        description="If any fixed or variable expense is using this category, the deletion will be blocked."
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
