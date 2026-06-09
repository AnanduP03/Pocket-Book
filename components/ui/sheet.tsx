"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export type SheetSide = "left" | "right";

type SheetContentProps = React.ComponentPropsWithoutRef<typeof Dialog.Content> & {
  side?: SheetSide;
};

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  SheetContentProps
>(({ className, children, side = "right", ...props }, ref) => (
  <Dialog.Portal>
    <Dialog.Overlay
      className={cn(
        "sheet-overlay fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]",
      )}
    />
    <Dialog.Content
      ref={ref}
      data-side={side}
      className={cn(
        "sheet-content fixed inset-y-0 z-50 flex h-full w-full max-w-md flex-col gap-6 bg-(--surface) p-6 shadow-[var(--shadow-sheet)] focus:outline-none",
        side === "right"
          ? "right-0 border-l border-(--border)"
          : "left-0 border-r border-(--border)",
        className,
      )}
      {...props}
    >
      {children}
      <Dialog.Close
        aria-label="Close"
        className="absolute right-4 top-4 rounded-[var(--radius-input)] p-1.5 text-(--muted) transition-colors hover:bg-(--surface-2) hover:text-(--text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
      >
        <X className="h-4 w-4" aria-hidden />
      </Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
));
SheetContent.displayName = "SheetContent";

export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)} {...props} />
  );
}

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof Dialog.Title>,
  React.ComponentPropsWithoutRef<typeof Dialog.Title>
>(({ className, ...props }, ref) => (
  <Dialog.Title
    ref={ref}
    className={cn("text-lg font-semibold tracking-tight text-(--text)", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof Dialog.Description>,
  React.ComponentPropsWithoutRef<typeof Dialog.Description>
>(({ className, ...props }, ref) => (
  <Dialog.Description
    ref={ref}
    className={cn("text-sm text-(--muted)", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

export function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}
