import { type ReactNode } from "react";

type Props = {
  children: ReactNode;
  trailing?: ReactNode;
};

export function SectionLabel({ children, trailing }: Props) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--muted)">
        {children}
      </h2>
      <span className="h-px flex-1 bg-(--border)" aria-hidden />
      {trailing ? (
        <span className="text-[11px] uppercase tracking-[0.18em] text-(--muted)">
          {trailing}
        </span>
      ) : null}
    </div>
  );
}
