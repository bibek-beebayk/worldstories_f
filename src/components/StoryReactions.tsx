import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { storyApi } from "@/api/story";
import type { ReactionType, StoryReactionsResponse } from "@/api/types";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useAuthModal } from "@/context/AuthModalContext";

/** The emoji belongs here rather than in the database: it is presentation, and
 *  the API already sends a written label for each type. */
const REACTION_EMOJI: Record<ReactionType, string> = {
  loved: "❤️",
  funny: "😂",
  surprising: "😮",
  emotional: "😢",
  thought_provoking: "🧠",
};

/**
 * "How did this story make you feel?"
 *
 * One tap, one answer — deliberately lighter than a review, which stays exactly
 * as it was (§10.1). Tapping the reaction you already gave removes it, so the
 * control behaves the way it looks.
 *
 * Totals are shown to everyone, including signed-out readers: seeing that 231
 * people loved a story is worth something before you have an account, and it
 * is the reason to make one. Tapping while signed out opens the login modal
 * rather than failing silently or hiding the panel.
 */
const StoryReactions = ({ storySlug }: { storySlug: string }) => {
  const isLoggedIn = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();
  const queryClient = useQueryClient();
  const queryKey = ["story-reactions", storySlug];

  const { data } = useQuery({
    queryKey,
    queryFn: () => storyApi.getStoryReactions(storySlug),
    enabled: Boolean(storySlug),
  });

  const react = useMutation({
    mutationFn: (reactionType: ReactionType) =>
      storyApi.setStoryReaction(storySlug, reactionType),
    onSuccess: (response: StoryReactionsResponse) => {
      // The server returns the fresh totals, so there is nothing to refetch.
      queryClient.setQueryData(queryKey, response);
    },
  });

  if (!data) return null;

  return (
    <section
      className="relative overflow-hidden rounded-sm bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 p-4 text-white shadow-lg sm:p-5"
      aria-labelledby="reactions-heading"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 left-1/4 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
      <Heart className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 animate-flicker text-white/10" style={{ animationDuration: "3s" }} />

      <h3 id="reactions-heading" className="font-display relative text-sm font-bold sm:text-base">
        How did this story make you feel?
      </h3>

      <div className="relative mt-3 flex flex-wrap gap-2">
        {data.reactions.map((reaction) => {
          const isMine = data.my_reaction === reaction.type;
          return (
            <button
              key={reaction.type}
              type="button"
              aria-pressed={isMine}
              aria-label={`${reaction.label}, ${reaction.count} ${
                reaction.count === 1 ? "reader" : "readers"
              }`}
              disabled={react.isPending}
              onClick={() => {
                if (!isLoggedIn) {
                  openLoginModal();
                  return;
                }
                react.mutate(reaction.type);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all disabled:opacity-60 ${
                isMine
                  ? "border-white bg-white font-medium text-rose-600 shadow-md"
                  : "border-white/30 bg-white/15 text-white hover:scale-105 hover:bg-white/25"
              }`}
            >
              <span aria-hidden="true">{REACTION_EMOJI[reaction.type]}</span>
              <span>{reaction.label}</span>
              {reaction.count > 0 && (
                <span className={`text-xs ${isMine ? "text-rose-500" : "text-white/75"}`}>{reaction.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {!isLoggedIn && data.total > 0 && (
        <p className="relative mt-3 text-xs text-white/80">
          Sign in to add yours.
        </p>
      )}
    </section>
  );
};

export default StoryReactions;
