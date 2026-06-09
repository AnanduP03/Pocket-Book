import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-input)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg) disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-(--accent) text-(--accent-fg) hover:bg-(--accent)/85 active:bg-(--accent)/90",
        secondary:
          "bg-(--surface-2) text-(--text) hover:bg-(--border)",
        ghost: "hover:bg-(--surface-2) text-(--text)",
        danger:
          "bg-(--danger) text-(--accent-fg) hover:bg-(--danger)/85",
        outline:
          "border border-(--border) bg-(--surface) text-(--text) hover:bg-(--surface-2)",
      },
      size: {
        default: "h-10 px-4 py-2 sm:h-9",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        // Touch-friendly icon button: 40px on mobile (close to Material 48 guideline),
        // 36px on sm+ where pointer precision is higher.
        icon: "h-10 w-10 sm:h-9 sm:w-9",
        // Use this for primary mobile actions that need the full 44×44 Apple HIG target.
        "icon-touch": "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
