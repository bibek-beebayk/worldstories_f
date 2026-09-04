import { toast } from "@/components/ui/sonner";
import { getCountryFlag, getCountryLabel } from "@/lib/countries";

/**
 * Tells the reader a country has joined their passport.
 *
 * A toast, never a modal: §5.7 is explicit that this must not interrupt, and
 * this fires at the moment someone has just finished a story — the worst
 * possible time to put a dialog in front of them. It sits at the edge, says
 * one thing, and offers a way through to the passport for anyone who wants it.
 *
 * Exactly-once is the server's guarantee, not this function's: it is only
 * called with the `unlocked_country` a progress response carries, which is set
 * only on the write that first reached that country. See
 * apps/stats/completion.py.
 */
export function announceCountryUnlocked(code: string | null | undefined) {
  if (!code) return;
  const name = getCountryLabel(code);
  const flag = getCountryFlag(code);

  toast.success(`${flag} ${name} added to your Story Passport`.trim(), {
    description: "A new country on your reading map.",
    action: {
      label: "View passport",
      onClick: () => {
        window.location.href = "/story-passport";
      },
    },
  });
}
