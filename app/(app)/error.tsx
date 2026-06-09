"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-(--danger)/50 bg-(--surface) p-6"
    >
      <p className="text-base font-medium text-(--text)">
        Something went wrong loading this page.
      </p>
      <p className="text-sm text-(--muted)">
        {error.message || "An unexpected error occurred."}
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-(--muted)">digest: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-2 inline-flex items-center justify-center rounded-[var(--radius-input)] bg-(--accent) px-4 py-2 text-sm font-medium text-(--accent-fg) hover:bg-(--accent)/85"
      >
        Try again
      </button>
    </div>
  );
}
