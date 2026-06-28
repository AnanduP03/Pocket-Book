"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  /** Suggested tags drawn from the user's history. Tapping one adds it. */
  suggestions?: string[];
  placeholder?: string;
  max?: number;
};

const MAX_LEN = 24;

function normalize(raw: string): string {
  return raw.trim().slice(0, MAX_LEN).toLowerCase();
}

export function TagInput({
  id,
  value,
  onChange,
  suggestions = [],
  placeholder = "Add a tag…",
  max = 6,
}: Props) {
  const [draft, setDraft] = useState("");

  const addTag = (raw: string) => {
    const next = normalize(raw);
    if (!next) return;
    if (value.includes(next)) {
      setDraft("");
      return;
    }
    if (value.length >= max) return;
    onChange([...value, next]);
    setDraft("");
  };

  const removeAt = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      removeAt(value.length - 1);
    }
  };

  const fresh = suggestions
    .map(normalize)
    .filter((s, i, arr) => s && !value.includes(s) && arr.indexOf(s) === i)
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-[var(--radius-input)] border border-(--border) bg-(--surface) px-2 py-1.5 focus-within:ring-2 focus-within:ring-(--ring)">
        {value.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-(--accent)/20 px-2 py-0.5 text-[11px] text-(--text)"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => removeAt(i)}
              className="-mr-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-(--surface-2)"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </span>
        ))}
        <Input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
          onKeyDown={onKeyDown}
          onBlur={() => draft && addTag(draft)}
          placeholder={value.length >= max ? `Max ${max}` : placeholder}
          disabled={value.length >= max}
          className="min-w-[6rem] flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        />
      </div>
      {fresh.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {fresh.map((tag) => (
            <Button
              key={tag}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addTag(tag)}
              className="h-8 rounded-full px-2.5 text-xs font-normal"
            >
              + {tag}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
