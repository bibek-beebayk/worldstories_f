import { toast } from "@/components/ui/sonner";
import type { EarnedAchievement } from "@/api/types";

/**
 * Tells the reader they have earned something.
 *
 * Lightweight by instruction (§6.4) and by circumstance: this fires just after
 * a story ends, often alongside a country unlock, so it stays a toast and
 * never a modal — two dialogs stacked over someone who has just finished
 * reading would be worse than saying nothing.
 *
 * Exactly-once is the server's guarantee, not this function's: it is only ever
 * called with the achievements a response reports as earned *by that write*,
 * which a conditional update makes impossible to report twice. See
 * apps/stats/achievements.py.
 */
export function announceAchievements(achievements: EarnedAchievement[] | undefined) {
  for (const achievement of achievements ?? []) {
    toast.success(`${achievement.icon} Achievement unlocked`.trim(), {
      description: achievement.name,
      action: {
        label: "View",
        onClick: () => {
          window.location.href = "/profile?section=reader&view=achievements";
        },
      },
    });
  }
}
