import type { MiniDifficulty } from "@/lib/games/miniCrossword";

const CHIP_STYLES: Record<Exclude<MiniDifficulty, "">, { label: string; cls: string }> = {
  easy: {
    label: "Easy",
    cls: "border-emerald-300 bg-emerald-100 text-emerald-900",
  },
  medium: {
    label: "Medium",
    cls: "border-amber-300 bg-amber-100 text-amber-950",
  },
  hard: {
    label: "Hard",
    cls: "border-red-300 bg-red-100 text-red-900",
  },
};

export default function MiniDifficultyChip({
  difficulty,
}: {
  difficulty?: MiniDifficulty | string | null;
}) {
  const key = (difficulty || "").toLowerCase();
  if (key !== "easy" && key !== "medium" && key !== "hard") {
    return null;
  }
  const style = CHIP_STYLES[key];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${style.cls}`}
    >
      {style.label}
    </span>
  );
}
