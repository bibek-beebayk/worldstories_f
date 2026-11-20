import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getCountryLabel } from "@/lib/countries";
import { getLanguageLabel } from "@/lib/languages";
import type { AdminStory } from "@/api/types";
import { storyStatus, STATUS_LABEL } from "./storyList";

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 text-sm break-words">{children || "-"}</dd>
  </div>
);

const Chips = ({ label, names }: { label: string; names: string[] }) => (
  <div>
    <p className="mb-1 text-xs text-muted-foreground">{label}</p>
    {names.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {names.map((name) => (
          <span key={name} className="rounded-md border bg-muted/30 px-2 py-1 text-xs">
            {name}
          </span>
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">-</p>
    )}
  </div>
);

export interface StoryDetailLabels {
  type: string;
  author: string;
  genres: string[];
  categories: string[];
  tags: string[];
  themes: string[];
  submittedBy: string;
}

/** Basics, Publishing, Taxonomy and About — the story's existing data, grouped. */
const StoryDetailsTab = ({ story, labels }: { story: AdminStory; labels: StoryDetailLabels }) => {
  const status = storyStatus(story);
  return (
    <Card>
      <CardContent className="space-y-6 p-4 sm:p-5">
        <section aria-labelledby="story-basics">
          <h3 id="story-basics" className="mb-3 text-sm font-semibold">
            Basics
          </h3>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Field label="Title">{story.title}</Field>
            <Field label="Slug">{`/${story.slug}`}</Field>
            <Field label="Type">{labels.type}</Field>
            <Field label="Language">{getLanguageLabel(story.language)}</Field>
            <Field label="Country">{story.country ? getCountryLabel(story.country) : ""}</Field>
            <Field label="Author">{labels.author}</Field>
            <Field label="Submitted by">{labels.submittedBy}</Field>
            <Field label="Original published date">{story.published_date_label || ""}</Field>
            <Field label="Completed">{story.is_completed ? "Yes" : "No"}</Field>
          </dl>
        </section>

        <section aria-labelledby="story-publishing">
          <h3 id="story-publishing" className="mb-3 text-sm font-semibold">
            Publishing
          </h3>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Field label="Status">{STATUS_LABEL[status]}</Field>
            <Field label="Published on site date">{story.site_published_date || ""}</Field>
            {story.is_published && story.publish_at && (
              <Field label={new Date(story.publish_at) > new Date() ? "Scheduled for" : "Went live at"}>
                {new Date(story.publish_at).toLocaleString()}
              </Field>
            )}
            <Field label="Rating">{story.rating.toFixed(1)}</Field>
            <Field label="Views">{story.views.toLocaleString()}</Field>
          </dl>
        </section>

        <section aria-labelledby="story-taxonomy" className="space-y-3">
          <h3 id="story-taxonomy" className="text-sm font-semibold">
            Taxonomy
          </h3>
          <Chips label="Genres" names={labels.genres} />
          <Chips label="Categories" names={labels.categories} />
          <Chips label="Tags" names={labels.tags} />
          <Chips label="Themes" names={labels.themes} />
        </section>

        <section aria-labelledby="story-about">
          <h3 id="story-about" className="mb-2 text-sm font-semibold">
            About
          </h3>
          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm whitespace-pre-wrap">{story.about || "-"}</p>
        </section>
      </CardContent>
    </Card>
  );
};

export default StoryDetailsTab;
