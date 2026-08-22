import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { storyApi } from "@/api/story";
import StoryCard from "@/components/StoryCard";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";

const BecauseYouFinishedRail = ({ storySlug, storyTitle }: { storySlug: string; storyTitle: string }) => {
  const isAuthenticated = useIsLoggedIn();
  const { data } = useQuery({
    queryKey: ["because-finished", storySlug],
    queryFn: () => storyApi.getBecauseFinished(storySlug),
    enabled: isAuthenticated && Boolean(storySlug),
  });

  if (!data || data.length === 0) return null;

  return (
    <section className="rounded-2xl border bg-primary/5 p-6" aria-labelledby="because-finished-heading">
      <div className="mb-5 flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-primary" />
        <div>
          <h2 id="because-finished-heading" className="text-xl font-bold sm:text-2xl">
            Because you finished {storyTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Picked for you, based on this story and your reading taste.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {data.map((story) => (
          <StoryCard key={story.id} {...story} />
        ))}
      </div>
    </section>
  );
};

export default BecauseYouFinishedRail;
