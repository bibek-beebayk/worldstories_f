import { Link } from "react-router";
import type { PassportCountry } from "@/api/types";
import { Button } from "@/components/ui/button";
import { pluralStories } from "@/lib/passport";

export default function NextStamps({ countries }: { countries: PassportCountry[] }) {
  if (countries.length === 0) return null;

  return (
    <section className="mb-8" aria-labelledby="next-stamp-heading">
      <h2 id="next-stamp-heading" className="text-xl font-bold tracking-tight sm:text-2xl">
        Your next stamp
      </h2>
      <div className="-mx-3 mt-4 flex snap-x gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
        {countries.map((country) => {
          const nextStory = country.next_story!;
          const minutes = nextStory.reading_time_minutes;
          return (
            <article
              key={country.code}
              className="flex min-w-[250px] snap-start flex-col rounded-xl border bg-card p-4 shadow-sm sm:min-w-0"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-primary/10 px-2 text-sm font-bold text-primary">
                  {country.code}
                </span>
                <h3 className="font-semibold">{country.name}</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {pluralStories(country.stories_available)}
                {minutes !== null ? ` · shortest about ${minutes} min` : ""}
              </p>
              <Button asChild size="sm" className="mt-5 min-h-11 w-full sm:w-fit">
                <Link to={`/story/${nextStory.slug}`}>
                  {minutes !== null ? "Start with a short read" : "Start reading"}
                </Link>
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
