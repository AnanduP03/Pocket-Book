import { type ReactNode, ViewTransition } from "react";
import { Wallet } from "lucide-react";
import { TabNav } from "./TabNav";
import { ThemeToggle } from "./ThemeToggle";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { MobileTabBar } from "./MobileTabBar";
import { OfflineBanner } from "./OfflineBanner";
import { SwUpdateToast } from "./SwUpdateToast";
import { StatusBarShield } from "./StatusBarShield";
import { IosInstallHint } from "./IosInstallHint";
import { UserMenu } from "./UserMenu";
import { GlobalQuickLog } from "./GlobalQuickLog";
import { getCurrentUser } from "@/lib/auth/server";
import { listCategories } from "@/db/repositories/categories";
import { getSettings } from "@/db/repositories/settings";

export async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const [categories, settings] = user
    ? await Promise.all([listCategories(user.id), getSettings(user.id)])
    : [[], null];

  return (
    <div className="min-h-screen min-h-dvh overflow-x-clip bg-(--bg)">
      <KeyboardShortcuts />
      <StatusBarShield />
      <OfflineBanner />
      <SwUpdateToast />

      <div
        className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 lg:flex-row lg:gap-8 lg:px-8 lg:py-10"
        style={{
          paddingTop: "max(var(--safe-top), 1rem)",
          paddingBottom:
            "calc(var(--mobile-tabbar-h) + var(--safe-bottom) + 1rem)",
          paddingLeft: "max(var(--safe-left), 1rem)",
          paddingRight: "max(var(--safe-right), 1rem)",
        }}
      >
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
        <main className="min-w-0 flex-1">
          <ViewTransition
            enter={{
              "nav-forward": "nav-forward",
              "nav-back": "nav-back",
              default: "none",
            }}
            exit={{
              "nav-forward": "nav-forward",
              "nav-back": "nav-back",
              default: "none",
            }}
            default="none"
          >
            {children}
          </ViewTransition>
        </main>
      </div>

      <MobileTabBar
        user={user ? { name: user.name, email: user.email } : null}
      />
      <IosInstallHint />

      {user && settings ? (
        <GlobalQuickLog
          categories={categories}
          defaultCurrency={settings.defaultCurrency}
          defaultLocale={settings.locale}
          presets={settings.quickPresets}
        />
      ) : null}
    </div>
  );
}
