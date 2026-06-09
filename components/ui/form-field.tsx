"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export const FormField = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1.5", className)} {...props} />
  ),
);
FormField.displayName = "FormField";

export function FormError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-center gap-1.5 text-xs font-medium text-(--danger)"
    >
      <AlertCircle className="h-3.5 w-3.5" aria-hidden />
      {message}
    </p>
  );
}

export function FormHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-(--muted)">{children}</p>;
}
