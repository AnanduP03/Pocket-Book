import type { Metadata } from "next";
import { Wallet } from "lucide-react";

export const metadata: Metadata = {
  title: "Pocketbook — Sign in",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-(--bg) px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-input)] bg-(--accent)/40"
          aria-hidden
        >
          <Wallet className="h-4 w-4 text-(--text)" />
        </span>
        <span className="text-base font-semibold tracking-tight text-(--text)">
          Pocketbook
        </span>
      </div>
      <div className="w-full max-w-sm rounded-[var(--radius-card)] border border-(--border) bg-(--surface) p-6 shadow-(--shadow-sheet)">
        {children}
      </div>
    </div>
  );
}
