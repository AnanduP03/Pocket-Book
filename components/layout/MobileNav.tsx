"use client";

import { useState } from "react";
import { Menu, Wallet } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TabNav } from "./TabNav";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu">
          <Menu className="h-4 w-4" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="max-w-[280px] gap-5">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] bg-(--accent)/40"
              aria-hidden
            >
              <Wallet className="h-4 w-4 text-(--text)" />
            </span>
            <SheetTitle>Pocketbook</SheetTitle>
          </div>
        </SheetHeader>
        <TabNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
