"use client";

import { useState, type ReactNode } from "react";
import { LogOut } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { signOutAndClearCaches } from "@/lib/pwa/sign-out";

type Props = {
  children: ReactNode;
  /** Called right before sign-out fires — e.g. to close the parent sheet. */
  onBeforeSignOut?: () => void;
};

/**
 * Confirmation dialog for sign-out. Wraps a trigger element (DialogTrigger
 * asChild) so callers just hand it their existing button. The Confirm
 * button uses the `danger` variant — the app's pastel red — to signal a
 * destructive action without breaking the soft palette elsewhere.
 */
export function SignOutDialog({ children, onBeforeSignOut }: Props) {
  const [signingOut, setSigningOut] = useState(false);

  async function handleConfirm() {
    setSigningOut(true);
    onBeforeSignOut?.();
    await signOutAndClearCaches("/auth/login");
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="z-[70] gap-4"
        overlayClassName="z-[60] backdrop-blur-[6px] bg-black/40"
      >
        <div className="flex flex-col gap-2 pr-8">
          <DialogTitle className="font-display text-2xl tracking-tight">
            Sign out?
          </DialogTitle>
          <DialogDescription>
            You&apos;ll need to sign back in to use Pocketbook on this device.
            Your saved data stays put.
          </DialogDescription>
        </div>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={signingOut}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="danger"
            onClick={handleConfirm}
            disabled={signingOut}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
