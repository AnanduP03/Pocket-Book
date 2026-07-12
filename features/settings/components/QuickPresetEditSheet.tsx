"use client";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PlainCategory } from "@/db/repositories/categories";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { MoneyInput } from "@/features/shared/components/MoneyInput";
import { Check, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export type PresetDraft = {
  id: string;
  label: string;
  amountPaise: number;
  categoryId: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: PresetDraft | null;
  variableCategories: PlainCategory[];
  defaultCurrency: string;
  locale: string;
  onSave: (preset: PresetDraft) => void;
  onDelete?: (() => void) | undefined;
};

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function QuickPresetEditSheet({
  open,
  onOpenChange,
  preset,
  variableCategories,
  defaultCurrency,
  locale,
  onSave,
  onDelete,
}: Props) {
  const isEditing = preset != null;
  const [isDesktop, setIsDesktop] = useState(false);

  const [label, setLabel] = useState("");
  const [amountPaise, setAmountPaise] = useState(0);
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width:1024px)");
    setIsDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLabel(preset?.label ?? "");
    setAmountPaise(preset?.amountPaise ?? 0);
    setCategoryId(preset?.categoryId ?? variableCategories[0]?.id ?? "");
  }, [open, preset, variableCategories]);

  const trimmedLabel = label.trim();
  const canSave =
    trimmedLabel.length > 0 &&
    trimmedLabel.length <= 24 &&
    amountPaise > 0 &&
    categoryId.length > 0;

  function save() {
    if (!canSave) return;
    onSave({
      id: preset?.id ?? makeId(),
      label: trimmedLabel,
      amountPaise,
      categoryId,
    });
    onOpenChange(false);
  }

  const title = isEditing ? "Edit preset" : "New preset";
  const description = isEditing
    ? "Update this quick-log preset"
    : "Create a one-tap preset for the quick-log sheet";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={
          isDesktop
            ? "max-w-lg gap-4 overflow-auto"
            : "gap-4 overflow-y-auto rounded-t-[var(--radius-card)]"
        }
        aria-describedby="preset-sheet-desc"
      >
        <SheetHeader>
          <SheetTitle>
            <span className="font-display text-2xl tracking-tight">
              {title}
            </span>
          </SheetTitle>
          <SheetDescription id="preset-sheet-desc">
            {description}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4">
          <FormField>
            <Label htmlFor="preset-sheet-label">Preset name</Label>
            <Input
              id="preset-sheet-label"
              placeholder="Coffee"
              maxLength={24}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoComplete="off"
            />
          </FormField>

          <FormField>
            <Label htmlFor="preset-sheet-amount">Amount</Label>
            <MoneyInput
              id="preset-sheet-amount"
              valueMinor={amountPaise}
              onChangeMinor={setAmountPaise}
              currency={defaultCurrency}
              locale={locale}
            />
          </FormField>

          <FormField>
            <Label htmlFor="preset-sheet-category">Category</Label>
            <Select
              value={categoryId}
              onValueChange={setCategoryId}
              disabled={variableCategories.length === 0}
            >
              <SelectTrigger
                id="preset-sheet-category"
                aria-label="Category"
                className="h-11 text-base sm:h-9 sm:text-sm"
              >
                <SelectValue
                  placeholder={
                    variableCategories.length === 0
                      ? "No Variable categories yet"
                      : "Pick a category"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {variableCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <CategoryIcon name={c.icon} color="c.color" size="sm" />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <SheetFooter>
          {isEditing && onDelete ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                onDelete();
                onOpenChange(false);
              }}
              className="sm:mr-auto"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Delete
            </Button>
          ) : null}
          <Button type="button" onClick={save} disabled={!canSave}>
            <Check className="h-4 w-4" aria-hidden />
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
