"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  fromDateInputValue,
  toDateInputValue,
} from "@/lib/format/date";

type Props = {
  value: Date | null;
  onChange: (d: Date | null) => void;
  id?: string;
  ariaInvalid?: boolean;
  max?: Date;
  min?: Date;
};

export function DatePicker({ value, onChange, id, ariaInvalid, max, min }: Props) {
  return (
    <Input
      id={id}
      type="date"
      value={value ? toDateInputValue(value) : ""}
      onChange={(e) => onChange(fromDateInputValue(e.target.value))}
      aria-invalid={ariaInvalid}
      max={max ? toDateInputValue(max) : undefined}
      min={min ? toDateInputValue(min) : undefined}
    />
  );
}
