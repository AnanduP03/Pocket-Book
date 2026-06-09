"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import type { PlainCategory } from "@/db/repositories/categories";

type Props = {
  categories: PlainCategory[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  ariaInvalid?: boolean;
  id?: string;
};

export function CategorySelect({
  categories,
  value,
  onChange,
  placeholder = "Pick a category",
  ariaInvalid,
  id,
}: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-invalid={ariaInvalid}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {categories.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-(--muted)">
            No categories
          </div>
        ) : (
          categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <span className="flex items-center gap-2">
                <CategoryIcon name={c.icon} color={c.color} size="sm" />
                {c.name}
              </span>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
