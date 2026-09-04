import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5" aria-labelledby="reactions-heading">
      <h3 id="reactions-heading" className="text-sm font-semibold sm:text-base">
        How did this story make you feel?
      </h3>

      <div className="mt-3 flex flex-wrap gap-2">
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
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-60 ${
                isMine
                  ? "border-primary bg-primary/10 font-medium text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <span aria-hidden="true">{REACTION_EMOJI[reaction.type]}</span>
              <span>{reaction.label}</span>
              {reaction.count > 0 && (
                <span className="text-xs text-muted-foreground">{reaction.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {!isLoggedIn && data.total > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Sign in to add yours.
        </p>
      )}
    </section>
  );
};

export default StoryReactions;
