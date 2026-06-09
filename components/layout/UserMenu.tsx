"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  name: string;
  email: string;
};

export function UserMenu({ name, email }: Props) {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut({ callbackUrl: "/auth/login" });
  }

  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-input)] border border-(--border) bg-(--surface-2)/40 px-2 py-1.5">
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--accent)/40"
      >
        <UserIcon className="h-3.5 w-3.5 text-(--text)" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-(--text)">{name}</p>
        <p className="truncate text-[10px] text-(--muted)">{email}</p>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Sign out"
        onClick={handleSignOut}
        disabled={signingOut}
      >
        <LogOut className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
