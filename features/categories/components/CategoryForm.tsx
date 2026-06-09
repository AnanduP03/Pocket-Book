"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { ColorPicker } from "./ColorPicker";
import { IconPicker } from "./IconPicker";
import { CategoryIcon } from "./CategoryIcon";
import { TypePicker } from "./TypePicker";
import { categoryInputSchema, type CategoryInput } from "../schema";
import {
  createCategoryAction,
  updateCategoryAction,
  type ActionResult,
} from "../actions";
import type { PlainCategory } from "@/db/repositories/categories";
import { CATEGORY_PALETTE } from "@/lib/theme/palette";

const FALLBACK_COLOR = CATEGORY_PALETTE[0]!.hex;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: PlainCategory;
};

export function CategoryForm({ open, onOpenChange, category }: Props) {
  const editing = Boolean(category);
  const queryClient = useQueryClient();

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categoryInputSchema),
    defaultValues: {
      name: category?.name ?? "",
      icon: category?.icon ?? "ShoppingCart",
      color: category?.color ?? FALLBACK_COLOR,
      type: category?.type ?? "Variable",
    },
    values: {
      name: category?.name ?? "",
      icon: category?.icon ?? "ShoppingCart",
      color: category?.color ?? FALLBACK_COLOR,
      type: category?.type ?? "Variable",
    },
  });

  const watchedIcon = form.watch("icon");
  const watchedColor = form.watch("color");
  const watchedName = form.watch("name");
  const watchedType = form.watch("type");

  const mutation = useMutation<ActionResult<PlainCategory>, Error, CategoryInput>({
    mutationFn: (values) =>
      editing && category
        ? updateCategoryAction(category.id, values)
        : createCategoryAction(values),
    onSuccess: async (res) => {
      if (!res.ok) {
        if (res.error.field === "name") {
          form.setError("name", { message: res.error.message });
        } else {
          form.setError("root", { message: res.error.message });
        }
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(editing ? "Category updated" : "Category created");
      onOpenChange(false);
      form.reset();
    },
    onError: (err) => {
      form.setError("root", { message: err.message });
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{editing ? "Edit category" : "New category"}</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="flex flex-1 flex-col gap-5"
          noValidate
        >
          <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-(--border) bg-(--surface-2)/50 p-3">
            <CategoryIcon
              name={watchedIcon}
              color={watchedColor}
              size="lg"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-(--text)">
                {watchedName.trim() || "Preview"}
              </p>
              <p className="text-xs text-(--muted)">{watchedType} · live preview</p>
            </div>
          </div>

          <FormField>
            <Label>Type</Label>
            <TypePicker
              value={watchedType}
              onChange={(t) =>
                form.setValue("type", t, { shouldDirty: true })
              }
            />
            <FormError message={form.formState.errors.type?.message} />
          </FormField>

          <FormField>
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              autoFocus
              placeholder="Groceries"
              {...form.register("name")}
              aria-invalid={Boolean(form.formState.errors.name)}
            />
            <FormError message={form.formState.errors.name?.message} />
          </FormField>

          <FormField>
            <Label>Icon</Label>
            <IconPicker
              value={watchedIcon}
              onChange={(v) => form.setValue("icon", v, { shouldDirty: true })}
            />
            <FormError message={form.formState.errors.icon?.message} />
          </FormField>

          <FormField>
            <Label>Color</Label>
            <ColorPicker
              value={watchedColor}
              onChange={(v) => form.setValue("color", v, { shouldDirty: true })}
            />
            <FormError message={form.formState.errors.color?.message} />
          </FormField>

          <FormError message={form.formState.errors.root?.message} />

          <SheetFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : editing ? "Save changes" : "Create"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
