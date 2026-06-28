"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export type SheetSide = "left" | "right" | "bottom";

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
      aria-describedby={undefined}
      className={cn(
        "sheet-content fixed z-50 flex flex-col gap-6 bg-(--surface) px-6 shadow-[var(--shadow-sheet)] focus:outline-none",
        // Right/left sheets fill the height — on devices with a notch / Dynamic
        // Island the title + close button would slide under it without
        // safe-area-top padding. --safe-top falls back to 0 on desktop so the
        // visual padding stays at 1.5rem there.
        side === "right" &&
          "inset-y-0 right-0 h-full w-full max-w-md border-l border-(--border) pb-6 pt-[calc(var(--safe-top)+1.5rem)]",
        side === "left" &&
          "inset-y-0 left-0 h-full w-full max-w-md border-r border-(--border) pb-6 pt-[calc(var(--safe-top)+1.5rem)]",
        side === "bottom" &&
          "inset-x-0 bottom-0 max-h-[85dvh] w-full border-t border-(--border) pt-6 pb-[calc(var(--safe-bottom)+1.5rem)]",
        className,
      )}
      {...props}
    >
      {side === "bottom" ? (
        <span
          aria-hidden
          className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-(--border)"
        />
      ) : null}
      {children}
      <Dialog.Close
        aria-label="Close"
        className={cn(
          "absolute right-2 flex h-11 w-11 items-center justify-center rounded-[var(--radius-input)] text-(--muted) transition-colors hover:bg-(--surface-2) hover:text-(--text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)",
          side === "bottom"
            ? "top-2"
            : "top-[calc(var(--safe-top)+0.5rem)]",
        )}
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
