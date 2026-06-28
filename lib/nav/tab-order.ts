// Tab order for directional page transitions on mobile.
// When navigating between tabs, we slide left/right based on relative position.
//
// Tabs visible in the bottom bar:                  index
//   /dashboard                                     0
//   /fixed                                         1
//   /variable                                      2  (center)
//   /income                                        3
//   "More" tab + its children (savings/etc.)       4
//
// Auth & marketing pages are not part of the tab bar — they get no
// directional type so they fall through to the default (no animation).

export const TAB_ORDER: { prefix: string; index: number }[] = [
  { prefix: "/dashboard", index: 0 },
  { prefix: "/fixed", index: 1 },
  { prefix: "/variable", index: 2 },
  { prefix: "/income", index: 3 },
  { prefix: "/savings", index: 4 },
  { prefix: "/categories", index: 4 },
  { prefix: "/settings", index: 4 },
];

export function tabIndexOf(pathname: string | null | undefined): number | null {
  if (!pathname) return null;
  for (const { prefix, index } of TAB_ORDER) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return index;
    }
  }
  return null;
}

export type NavDirection = "nav-forward" | "nav-back";

export function directionFromTo(
  from: string | null | undefined,
  to: string,
): NavDirection | null {
  const a = tabIndexOf(from);
  const b = tabIndexOf(to);
  if (a == null || b == null) return null;
  if (a === b) return null;
  return a < b ? "nav-forward" : "nav-back";
}
