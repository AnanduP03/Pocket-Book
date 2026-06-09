import { type ReactNode } from "react";
import { Wallet } from "lucide-react";
import { TabNav } from "./TabNav";
import { ThemeToggle } from "./ThemeToggle";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { MobileNav } from "./MobileNav";
import { UserMenu } from "./UserMenu";
import { getCurrentUser } from "@/lib/auth/server";

export async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen min-h-dvh bg-(--bg)">
      <KeyboardShortcuts />

      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-(--border) bg-(--bg)/85 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-input)] bg-(--accent)/40"
          >
            <Wallet className="h-3.5 w-3.5 text-(--text)" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-(--text)">
            Pocketbook
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <MobileNav />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 lg:flex-row lg:gap-8 lg:px-8 lg:py-10">
        <aside className="hidden lg:sticky lg:top-10 lg:block lg:h-[calc(100vh-5rem)] lg:w-60 lg:flex-shrink-0">
          <div className="flex h-full flex-col gap-6 rounded-[var(--radius-card)] border border-(--border) bg-(--surface) p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] bg-(--accent)/40"
                  aria-hidden
                >
                  <Wallet className="h-4 w-4 text-(--text)" />
                </span>
                <span className="text-sm font-semibold tracking-tight text-(--text)">
                  Pocketbook
                </span>
              </div>
              <ThemeToggle />
            </div>
            <TabNav />
            {user ? (
              <div className="mt-auto">
                <UserMenu name={user.name} email={user.email} />
              </div>
            ) : null}
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
