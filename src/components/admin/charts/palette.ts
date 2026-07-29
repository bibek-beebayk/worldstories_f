// Mirrors the accent colors already used for admin summary cards (see AdminHome.tsx
// statAccentClasses) so charts feel consistent with the rest of the admin UI.
export const CHART_PALETTE = [
  "hsl(var(--primary))",
  "#0ea5e9", // sky-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#f43f5e", // rose-500
];

export const emptyStateClass =
  "flex h-full min-h-[220px] items-center justify-center text-sm text-muted-foreground";
