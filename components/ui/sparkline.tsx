import { cn } from "@/lib/utils";

type Props = {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  ariaLabel?: string;
  fill?: boolean;
};

export function Sparkline({
  values,
  width = 120,
  height = 28,
  className,
  ariaLabel,
  fill = true,
}: Props) {
  if (values.length < 2) {
    return (
      <div
        aria-hidden
        className={cn("h-7 w-full rounded-full bg-(--surface-2)/40", className)}
        style={{ height }}
      />
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padY = 2;
  const innerH = height - padY * 2;
  const stepX = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * stepX;
    const norm = (v - min) / range;
    const y = padY + (1 - norm) * innerH;
    return [x, y] as const;
  });

  const linePath =
    "M " +
    points
      .map(([x, y], i) =>
        i === 0 ? `${x.toFixed(1)} ${y.toFixed(1)}` : `L ${x.toFixed(1)} ${y.toFixed(1)}`,
      )
      .join(" ");

  const areaPath = fill
    ? `${linePath} L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z`
    : null;

  const last = points[points.length - 1]!;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("text-(--accent)", className)}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      preserveAspectRatio="none"
    >
      {areaPath ? (
        <path d={areaPath} fill="currentColor" opacity={0.18} />
      ) : null}
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill="currentColor" />
    </svg>
  );
}
