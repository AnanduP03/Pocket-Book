"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon } from "./CategoryIcon";
import type { PlainCategory } from "@/db/repositories/categories";

type Props = {
  categories: PlainCategory[];
  onEdit: (c: PlainCategory) => void;
  onDelete: (c: PlainCategory) => void;
  busyId?: string | null;
};

export function CategoryGrid({
  categories,
  onEdit,
  onDelete,
  busyId,
}: Props) {
  if (categories.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-(--border) bg-(--surface) p-8 text-center">
        <p className="text-sm text-(--muted)">No categories in this group.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {categories.map((c) => {
        const busy = busyId === c.id;
        return (
          <li
            key={c.id}
            className="flex items-center gap-3 rounded-[var(--radius-card)] border border-(--border) bg-(--surface) p-4"
          >
            <CategoryIcon name={c.icon} color={c.color} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-(--text)">{c.name}</p>
              <Badge tone="muted" className="mt-1">
                {c.type}
              </Badge>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Edit ${c.name}`}
                disabled={busy}
                onClick={() => onEdit(c)}
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete ${c.name}`}
                disabled={busy}
                onClick={() => onDelete(c)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
