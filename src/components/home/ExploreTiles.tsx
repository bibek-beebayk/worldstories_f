import { useState, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { Dices, Map as MapIcon, Route, Smile } from "lucide-react";
import { storyApi } from "@/api/story";
import MoodPicker from "@/components/MoodPicker";
import SurpriseMeCard from "@/components/SurpriseMeCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type TileIcon = ComponentType<{ className?: string }>;

const TILE_CLASS =
  "group flex min-w-0 flex-col items-start gap-1 rounded-sm border border-border bg-card p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md sm:p-4";

const TileBody = ({ icon: Icon, title, hint }: { icon: TileIcon; title: string; hint: string }) => (
  <>
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
      <Icon className="h-[18px] w-[18px]" />
    </span>
    <span className="mt-1 text-sm font-semibold leading-tight group-hover:text-primary">{title}</span>
    <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">{hint}</span>
  </>
);

/**
 * One compact row of four ways into the catalogue: Story Journeys, the Story
 * Map, Surprise Me and Pick a mood. Replaces the large Journeys banner. Surprise
 * Me and the mood picker open the existing components in a dialog, so there is
 * a single implementation of each. A tile that would lead nowhere (no journeys
 * or no moods yet) is left out.
 */
const ExploreTiles = ({ title = "Explore" }: { title?: string }) => {
  const [open, setOpen] = useState<"surprise" | "mood" | null>(null);

  const journeys = useQuery({ queryKey: ["journeys"], queryFn: storyApi.getJourneys });
  const moods = useQuery({ queryKey: ["moods"], queryFn: storyApi.getMoods, staleTime: 5 * 60 * 1000 });

  const hasJourneys = journeys.data ? journeys.data.journeys.length > 0 : true;
  const hasMoods = moods.data ? moods.data.moods.some((mood) => mood.stories_count > 0) : true;

  return (
    <section aria-label={title}>
      {title && <h2 className="mb-3 text-lg font-bold tracking-tight sm:text-xl">{title}</h2>}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {hasJourneys && (
          <Link to="/journeys" className={TILE_CLASS}>
            <TileBody icon={Route} title="Story Journeys" hint="Curated paths through countries, genres and themes" />
          </Link>
        )}
        <Link to="/story-map" className={TILE_CLASS}>
          <TileBody icon={MapIcon} title="Story Map" hint="Follow a story back to where it comes from" />
        </Link>
        <button type="button" className={TILE_CLASS} onClick={() => setOpen("surprise")}>
          <TileBody icon={Dices} title="Surprise Me" hint="One story, picked for you" />
        </button>
        {hasMoods && (
          <button type="button" className={TILE_CLASS} onClick={() => setOpen("mood")}>
            <TileBody icon={Smile} title="Pick a mood" hint="Choose a feeling instead of a genre" />
          </button>
        )}
      </div>

      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto p-0 sm:rounded-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{open === "mood" ? "Pick a mood" : "Surprise me"}</DialogTitle>
            <DialogDescription>
              {open === "mood" ? "Choose a feeling to browse stories by." : "Let us pick a story for you."}
            </DialogDescription>
          </DialogHeader>
          {open === "surprise" && <SurpriseMeCard />}
          {open === "mood" && <MoodPicker />}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ExploreTiles;
