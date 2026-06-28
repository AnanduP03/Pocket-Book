"use client";

import { useEffect, useState } from "react";

type Props = {
  /** Changing this value triggers a one-shot confetti burst. Pass a
   *  truthy/identity-based value (boolean toggle, count, milestone name)
   *  — equality is reference-based, so `true → true` won't refire. */
  trigger: unknown;
  /** Number of particles to fire. Caps at 60 to keep runtime cheap. */
  count?: number;
  /** Duration in ms before the burst clears itself. */
  duration?: number;
};

const COLORS = [
  "var(--accent)",
  "var(--success)",
  "var(--warning)",
  "var(--text)",
];

const SHAPES = ["circle", "square", "tri"] as const;

type Particle = {
  id: string;
  left: number;
  delay: number;
  duration: number;
  rotate: number;
  drift: number;
  color: string;
  shape: (typeof SHAPES)[number];
};

function makeParticles(count: number, seed: number): Particle[] {
  // Pseudo-random based on seed so SSR matches CSR. Cheap LCG.
  let s = seed || 1;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: count }, (_, i) => ({
    id: `${seed}-${i}`,
    left: rand() * 100,
    delay: rand() * 120,
    duration: 700 + rand() * 600,
    rotate: rand() * 360,
    drift: (rand() - 0.5) * 80,
    color: COLORS[Math.floor(rand() * COLORS.length)] ?? COLORS[0]!,
    shape: SHAPES[Math.floor(rand() * SHAPES.length)] ?? "circle",
  }));
}

/**
 * One-shot confetti burst, triggered on changes to the `trigger` prop.
 * Particles are positioned across the top of the viewport and fall down
 * with light horizontal drift. Reduced-motion users see nothing.
 */
export function Confetti({ trigger, count = 36, duration = 1400 }: Props) {
  const [activeKey, setActiveKey] = useState<number | null>(null);

  useEffect(() => {
    if (trigger === undefined || trigger === null || trigger === false) return;
    if (typeof window !== "undefined") {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    }
    const key = Date.now();
    setActiveKey(key);
    const t = setTimeout(() => setActiveKey(null), duration + 400);
    return () => clearTimeout(t);
  }, [trigger, duration]);

  if (activeKey == null) return null;

  const particles = makeParticles(Math.min(60, count), activeKey);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className={
            p.shape === "circle"
              ? "absolute h-2 w-2 rounded-full"
              : p.shape === "square"
                ? "absolute h-2 w-2"
                : "absolute h-0 w-0 border-l-[5px] border-r-[5px] border-b-[8px] border-l-transparent border-r-transparent"
          }
          style={{
            top: "calc(var(--safe-top) + 20px)",
            left: `${p.left}%`,
            backgroundColor: p.shape === "tri" ? undefined : p.color,
            borderBottomColor: p.shape === "tri" ? p.color : undefined,
            animation: `pb-confetti-fall ${p.duration}ms ease-out ${p.delay}ms forwards`,
            ["--pb-rotate" as string]: `${p.rotate}deg`,
            ["--pb-drift" as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
