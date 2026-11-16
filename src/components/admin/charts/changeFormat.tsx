// How a metric's change against the previous period is shown, shared by every
// Analytics card so the rules are the same everywhere:
//  - counts: a percentage once the previous value is big enough to mean
//    something, otherwise the absolute change ("+2 (was 1)") — a jump from 1
//    to 3 is "+200%" arithmetically and noise in practice;
//  - rates (0-1): the change in percentage points, never a percentage of a
//    percentage;
//  - colour follows whether the direction is *good* for that metric.

export type GoodDirection = "up" | "down" | "neutral";

/** Below this previous count a percentage change is misleading, so the absolute change is shown. */
export const MIN_PREVIOUS_FOR_PERCENT = 5;

export interface ChangeDisplay {
  arrow: "▲" | "▼" | "•";
  text: string;
  tone: "good" | "bad" | "neutral";
  title: string;
}

const toneFor = (delta: number, goodDirection: GoodDirection): ChangeDisplay["tone"] => {
  if (delta === 0 || goodDirection === "neutral") return "neutral";
  return (delta > 0) === (goodDirection === "up") ? "good" : "bad";
};

const arrowFor = (delta: number): ChangeDisplay["arrow"] => (delta > 0 ? "▲" : delta < 0 ? "▼" : "•");

const number = (value: number, decimals: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: 0 });

/** Change in a count (or a quantity such as minutes). Null when there is no previous period. */
export function formatCountChange(
  current: number,
  previous: number | null | undefined,
  options: { goodDirection?: GoodDirection; unit?: string; decimals?: number } = {}
): ChangeDisplay | null {
  if (previous === null || previous === undefined) return null;
  const { goodDirection = "up", unit = "", decimals = 0 } = options;
  const delta = current - previous;
  const rounded = Number(delta.toFixed(decimals));
  if (rounded === 0) {
    return { arrow: "•", text: "no change", tone: "neutral", title: `Same as the previous period (${number(previous, decimals)}${unit})` };
  }
  const sign = delta > 0 ? "+" : "−";
  if (Math.abs(previous) < MIN_PREVIOUS_FOR_PERCENT) {
    return {
      arrow: arrowFor(delta),
      text: `${sign}${number(Math.abs(delta), decimals)}${unit} (was ${number(previous, decimals)}${unit})`,
      tone: toneFor(delta, goodDirection),
      title: `${number(previous, decimals)}${unit} in the previous period — too few for a percentage`,
    };
  }
  const percent = (Math.abs(delta) / Math.abs(previous)) * 100;
  return {
    arrow: arrowFor(delta),
    text: `${percent.toFixed(1)}%`,
    tone: toneFor(delta, goodDirection),
    title: `${number(previous, decimals)}${unit} in the previous period`,
  };
}

/** Change in a rate between 0 and 1, in percentage points. */
export function formatRateChange(
  current: number | null,
  previous: number | null | undefined,
  options: { goodDirection?: GoodDirection } = {}
): ChangeDisplay | null {
  if (current === null || previous === null || previous === undefined) return null;
  const { goodDirection = "up" } = options;
  const points = Number(((current - previous) * 100).toFixed(1));
  if (points === 0) {
    return { arrow: "•", text: "no change", tone: "neutral", title: `Same as the previous period (${Math.round(previous * 100)}%)` };
  }
  return {
    arrow: arrowFor(points),
    text: `${Math.abs(points).toFixed(1)} pts`,
    tone: toneFor(points, goodDirection),
    title: `${Math.round(previous * 100)}% in the previous period`,
  };
}

const TONE_CLASS: Record<ChangeDisplay["tone"], string> = {
  good: "text-emerald-600",
  bad: "text-rose-600",
  neutral: "text-muted-foreground",
};

export const TONE_PILL_CLASS: Record<ChangeDisplay["tone"], string> = {
  good: "bg-emerald-500/10 text-emerald-600",
  bad: "bg-rose-500/10 text-rose-600",
  neutral: "bg-muted text-muted-foreground",
};

export const ChangeChip = ({ display }: { display: ChangeDisplay }) => (
  <span className={`whitespace-nowrap text-xs font-semibold ${TONE_CLASS[display.tone]}`} title={display.title}>
    {display.arrow} {display.text}
  </span>
);
