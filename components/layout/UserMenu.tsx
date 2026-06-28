"use client";

import { LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignOutDialog } from "./SignOutDialog";

type Props = {
  name: string;
  email: string;
};

export function UserMenu({ name, email }: Props) {
  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2)/40 px-2 py-1.5">
      <span
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--accent)/40"
      >
        <UserIcon className="h-4 w-4 text-(--text)" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-(--text)">{name}</p>
        <p className="truncate text-xs text-(--muted)">{email}</p>
      </div>
      <SignOutDialog>
        <Button
          type="button"
          size="icon-touch"
          variant="ghost"
          aria-label="Sign out"
          className="text-(--danger)/80 hover:bg-(--danger)/15 hover:text-(--danger)"
        >
          <LogOut className="h-4 w-4" aria-hidden />
        </Button>
      </SignOutDialog>
    </div>
  );
}
