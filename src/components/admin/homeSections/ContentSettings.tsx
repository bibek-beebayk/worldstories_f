import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { storyApi } from "@/api/story";
import type { HomeSectionConfig, HomeSectionTypesMeta } from "@/api/types";
import { FeaturedStoryPickerModal } from "@/components/admin/FeaturedStoryPickerModal";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContentPickerDialog } from "./ContentPickerDialog";
import {
  ChipMultiSelect,
  LabeledField,
  OrderedIdList,
  RangeField,
  SegmentedControl,
  SettingGroup,
  SortPicker,
  type PickerOption,
} from "./controls";
import type { HomeSectionEditorDraft } from "./types";

const NONE = "none";

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      {label}
    </label>
  );
}

const taxonomyOptions = (rows: { id: number; name: string }[] | undefined): PickerOption<number>[] =>
  (rows ?? []).map((row) => ({ value: row.id, label: row.name }));

export function validateHomeSectionDraft(draft: HomeSectionEditorDraft): string | null {
  if (
    ["stories_query", "stories_manual", "videos", "blogs", "banner", "new_entries"].includes(draft.section_type) &&
    !draft.title.trim()
  ) {
    return "Add a section title before previewing or saving.";
  }
  if (draft.item_limit < 1 || draft.item_limit > 24) return "Items to show must be from 1 to 24.";
  const config = draft.config;
  if (draft.section_type === "stories_query") {
    const min = config.min_reading_minutes;
    const max = config.max_reading_minutes;
    if (min !== null && min !== undefined && (min < 1 || min > 600))
      return "Minimum reading time must be from 1 to 600 minutes.";
    if (max !== null && max !== undefined && (max < 1 || max > 600))
      return "Maximum reading time must be from 1 to 600 minutes.";
    if (min !== null && min !== undefined && max !== null && max !== undefined && min > max)
      return "Minimum reading time cannot exceed maximum reading time.";
    if (
      config.min_rating !== null &&
      config.min_rating !== undefined &&
      (config.min_rating < 0 || config.min_rating > 5)
    )
      return "Minimum rating must be from 0 to 5.";
    if (
      config.min_ratings_count !== null &&
      config.min_ratings_count !== undefined &&
      (config.min_ratings_count < 0 || config.min_ratings_count > 1000)
    )
      return "Minimum ratings count must be from 0 to 1000.";
  }
  if (draft.section_type === "videos") {
    const min = config.min_duration_seconds;
    const max = config.max_duration_seconds;
    if (min !== null && min !== undefined && min < 0) return "Minimum duration cannot be negative.";
    if (max !== null && max !== undefined && max < 0) return "Maximum duration cannot be negative.";
    if (min !== null && min !== undefined && max !== null && max !== undefined && min > max)
      return "Minimum duration cannot exceed maximum duration.";
  }
  return null;
}

export function ContentSettings({
  draft,
  meta,
  setConfig,
  setAllowRepeats,
}: {
  draft: HomeSectionEditorDraft;
  meta: HomeSectionTypesMeta;
  setConfig: (patch: Partial<HomeSectionConfig>) => void;
  setAllowRepeats: (value: boolean) => void;
}) {
  const config = draft.config;
  const contentType = draft.section_type;
  const needsTaxonomy = contentType === "stories_query" || contentType === "videos" || contentType === "blogs";
  const taxonomy = useQuery({
    queryKey: ["admin-home-section-taxonomy-v2"],
    enabled: needsTaxonomy,
    queryFn: async () => {
      const [genres, categories, tags, themes, moods, storyTypes] = await Promise.all([
        storyApi.getAdminGenres(),
        storyApi.getAdminCategories(),
        storyApi.getAdminTags(),
        storyApi.getAdminThemes(),
        storyApi.getAdminMoods(),
        storyApi.getAdminStoryTypes(),
      ]);
      return { genres, categories, tags, themes, moods, storyTypes };
    },
  });
  const authors = useQuery({
    queryKey: ["admin-authors"],
    queryFn: storyApi.getAdminAuthors,
    enabled: contentType === "stories_query",
  });
  const facets = useQuery({
    queryKey: ["admin-home-section-library-facets"],
    queryFn: () => storyApi.getLibraryFacets({}),
    enabled: contentType === "stories_query" || contentType === "videos",
  });
  const videoTypes = useQuery({
    queryKey: ["admin-video-types"],
    queryFn: storyApi.getAdminVideoTypes,
    enabled: contentType === "videos",
  });
  const blogTopics = useQuery({
    queryKey: ["admin-blog-topics"],
    queryFn: storyApi.getAdminBlogTopics,
    enabled: contentType === "blogs",
  });
  const [storyTarget, setStoryTarget] = useState<"exclude" | "pin" | null>(null);
  const [picker, setPicker] = useState<"video" | "pin_blog" | "blog" | null>(null);
  const [labels, setLabels] = useState<Record<number, string>>(() =>
    Object.fromEntries(draft.stories_detail.map((story) => [story.id, story.title])),
  );

  if (!(["stories_query", "videos", "blogs"] as string[]).includes(contentType)) return null;
  if (taxonomy.isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;

  const genres = taxonomyOptions(taxonomy.data?.genres);
  const languages = (facets.data?.languages ?? []).map((language) => ({
    value: language.value,
    label: language.value.toUpperCase(),
  }));
  const countryOptions = (facets.data?.countries ?? []).map((country) => ({
    value: country.value,
    label: country.label,
  }));
  const selectedStoryIds = storyTarget === "exclude" ? (config.exclude_story_ids ?? []) : (config.pin_story_ids ?? []);

  return (
    <div className="space-y-4">
      {contentType === "stories_query" && (
        <>
          <SettingGroup title="Sort order">
            <SortPicker
              options={meta.sorts.stories}
              value={config.sort ?? "newest"}
              onChange={(sort) => setConfig({ sort: sort as HomeSectionConfig["sort"] })}
            />
            {config.sort === "trending" && (
              <LabeledField label="Trending window">
                <Select
                  value={String(config.trending_days ?? 7)}
                  onValueChange={(value) => setConfig({ trending_days: Number(value) as 7 | 30 })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </LabeledField>
            )}
          </SettingGroup>
          <SettingGroup title="Include only">
            <div className="grid gap-4 sm:grid-cols-2">
              <ChipMultiSelect
                label="Genres"
                options={genres}
                selected={config.genres ?? []}
                onChange={(genres) => setConfig({ genres })}
              />
              <ChipMultiSelect
                label="Categories"
                options={taxonomyOptions(taxonomy.data?.categories)}
                selected={config.categories ?? []}
                onChange={(categories) => setConfig({ categories })}
              />
              <ChipMultiSelect
                label="Tags"
                options={taxonomyOptions(taxonomy.data?.tags)}
                selected={config.tags ?? []}
                onChange={(tags) => setConfig({ tags })}
              />
              <ChipMultiSelect
                label="Themes"
                options={taxonomyOptions(taxonomy.data?.themes)}
                selected={config.themes ?? []}
                onChange={(themes) => setConfig({ themes })}
              />
              <ChipMultiSelect
                label="Moods"
                options={(taxonomy.data?.moods ?? []).map((mood) => ({ value: mood.slug, label: mood.name }))}
                selected={config.moods ?? []}
                onChange={(moods) => setConfig({ moods })}
              />
              <ChipMultiSelect
                label="Countries"
                options={countryOptions}
                selected={config.countries ?? []}
                onChange={(countries) => setConfig({ countries })}
              />
              <ChipMultiSelect
                label="Authors"
                options={(authors.data ?? []).map((author) => ({ value: author.id, label: author.name }))}
                selected={config.authors ?? []}
                onChange={(authors) => setConfig({ authors })}
              />
              <LabeledField label="Story type">
                <Select
                  value={config.story_type ? String(config.story_type) : NONE}
                  onValueChange={(value) => setConfig({ story_type: value === NONE ? null : Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Any type</SelectItem>
                    {(taxonomy.data?.storyTypes ?? []).map((type) => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </LabeledField>
              <LabeledField label="Language">
                <Select
                  value={config.language || NONE}
                  onValueChange={(value) => setConfig({ language: value === NONE ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Any language</SelectItem>
                    {languages.map((language) => (
                      <SelectItem key={language.value} value={language.value}>
                        {language.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </LabeledField>
            </div>
          </SettingGroup>
          <SettingGroup title="Rules">
            <div className="grid gap-4 sm:grid-cols-2">
              <RangeField
                label="Reading time"
                suffix="min"
                minimum={1}
                minValue={config.min_reading_minutes}
                maxValue={config.max_reading_minutes}
                onMinChange={(min_reading_minutes) => setConfig({ min_reading_minutes })}
                onMaxChange={(max_reading_minutes) => setConfig({ max_reading_minutes })}
              />
              <LabeledField label="Published within">
                <Select
                  value={String(config.published_within_days ?? "any")}
                  onValueChange={(value) =>
                    setConfig({ published_within_days: value === "any" ? null : Number(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["any", "7", "30", "90", "365"].map((value) => (
                      <SelectItem key={value} value={value}>
                        {value === "any" ? "Any time" : `Last ${value} days`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </LabeledField>
              <LabeledField label="Minimum rating">
                <Input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={config.min_rating ?? ""}
                  onChange={(event) =>
                    setConfig({ min_rating: event.target.value === "" ? null : Number(event.target.value) })
                  }
                />
              </LabeledField>
              <LabeledField label="Minimum ratings count">
                <Input
                  type="number"
                  min={0}
                  max={1000}
                  value={config.min_ratings_count ?? ""}
                  onChange={(event) =>
                    setConfig({ min_ratings_count: event.target.value === "" ? null : Number(event.target.value) })
                  }
                />
              </LabeledField>
            </div>
            <div className="grid gap-1 sm:grid-cols-2">
              <CheckField
                label="Has a summary"
                checked={!!config.has_summary}
                onChange={(has_summary) => setConfig({ has_summary })}
              />
              <CheckField
                label="Has audio"
                checked={!!config.has_audio}
                onChange={(has_audio) => setConfig({ has_audio })}
              />
              <CheckField
                label="Has video"
                checked={!!config.has_video}
                onChange={(has_video) => setConfig({ has_video })}
              />
              <CheckField
                label="Has read-along"
                checked={!!config.has_read_along}
                onChange={(has_read_along) => setConfig({ has_read_along })}
              />
              <CheckField
                label="WorldStories Originals only"
                checked={!!config.original_only}
                onChange={(original_only) => setConfig({ original_only })}
              />
              <CheckField
                label="Must have a cover"
                checked={!!config.require_cover}
                onChange={(require_cover) => setConfig({ require_cover })}
              />
              <CheckField
                label="Allow repeats from sections above"
                checked={draft.allow_repeats}
                onChange={setAllowRepeats}
              />
            </div>
          </SettingGroup>
          <SettingGroup title="Exclude and pin" note="Pinned stories appear first. Explicit exclusions still win.">
            <ChipMultiSelect
              label="Exclude tags"
              options={taxonomyOptions(taxonomy.data?.tags)}
              selected={config.exclude_tags ?? []}
              onChange={(exclude_tags) => setConfig({ exclude_tags })}
            />
            <OrderedIdList
              label="Exclude stories"
              ids={config.exclude_story_ids ?? []}
              labels={labels}
              limit={50}
              onChange={(exclude_story_ids) => setConfig({ exclude_story_ids })}
              onAdd={() => setStoryTarget("exclude")}
            />
            <OrderedIdList
              label="Pin stories"
              ids={config.pin_story_ids ?? []}
              labels={labels}
              limit={12}
              onChange={(pin_story_ids) => setConfig({ pin_story_ids })}
              onAdd={() => setStoryTarget("pin")}
            />
          </SettingGroup>
        </>
      )}

      {contentType === "videos" && (
        <>
          <SettingGroup title="Sort order">
            <SortPicker
              options={meta.sorts.videos}
              value={config.video_sort ?? "newest"}
              onChange={(video_sort) => setConfig({ video_sort: video_sort as HomeSectionConfig["video_sort"] })}
            />
          </SettingGroup>
          <SettingGroup title="Filters">
            <SegmentedControl
              label="Format"
              value={config.format ?? "all"}
              options={[
                { value: "all", label: "All" },
                { value: "vertical", label: "Shorts" },
                { value: "landscape", label: "Landscape" },
              ]}
              onChange={(format) => setConfig({ format })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <LabeledField label="Video type">
                <Select
                  value={config.video_type ? String(config.video_type) : NONE}
                  onValueChange={(value) => setConfig({ video_type: value === NONE ? null : Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>All types</SelectItem>
                    {(videoTypes.data ?? []).map((type) => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </LabeledField>
              <RangeField
                label="Duration"
                suffix="sec"
                minValue={config.min_duration_seconds}
                maxValue={config.max_duration_seconds}
                onMinChange={(min_duration_seconds) => setConfig({ min_duration_seconds })}
                onMaxChange={(max_duration_seconds) => setConfig({ max_duration_seconds })}
              />
              <LabeledField label="Language">
                <Select
                  value={config.language || NONE}
                  onValueChange={(value) => setConfig({ language: value === NONE ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Any language</SelectItem>
                    {languages.map((language) => (
                      <SelectItem key={language.value} value={language.value}>
                        {language.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </LabeledField>
              <ChipMultiSelect
                label="Linked story genres"
                options={genres}
                selected={config.story_genres ?? []}
                onChange={(story_genres) => setConfig({ story_genres })}
              />
            </div>
            <CheckField
              label="Standalone videos only"
              checked={!!config.standalone_only}
              onChange={(standalone_only) => setConfig({ standalone_only })}
            />
          </SettingGroup>
          <SettingGroup title="Hand-pick instead" note="When any videos are picked, sort and filters are ignored.">
            <OrderedIdList
              label="Picked videos"
              ids={config.video_ids ?? []}
              labels={labels}
              limit={24}
              onChange={(video_ids) => setConfig({ video_ids })}
              onAdd={() => setPicker("video")}
            />
          </SettingGroup>
        </>
      )}

      {contentType === "blogs" && (
        <>
          <SettingGroup title="Sort order">
            <SortPicker
              options={meta.sorts.blogs}
              value={config.blog_sort ?? "newest"}
              onChange={(blog_sort) => setConfig({ blog_sort: blog_sort as HomeSectionConfig["blog_sort"] })}
            />
          </SettingGroup>
          <SettingGroup title="Filters">
            <div className="grid gap-4 sm:grid-cols-2">
              <ChipMultiSelect
                label="Topics"
                options={(blogTopics.data ?? []).map((topic) => ({ value: topic.id, label: topic.name }))}
                selected={config.topics ?? []}
                onChange={(topics) => setConfig({ topics })}
              />
              <LabeledField label="Published within">
                <Select
                  value={String(config.published_within_days ?? "any")}
                  onValueChange={(value) =>
                    setConfig({ published_within_days: value === "any" ? null : Number(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["any", "7", "30", "90", "365"].map((value) => (
                      <SelectItem key={value} value={value}>
                        {value === "any" ? "Any time" : `Last ${value} days`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </LabeledField>
              <ChipMultiSelect
                label="Linked story genres"
                options={genres}
                selected={config.story_genres ?? []}
                onChange={(story_genres) => setConfig({ story_genres })}
              />
            </div>
            <CheckField
              label="Only posts that link to a published story"
              checked={!!config.only_with_story}
              onChange={(only_with_story) => setConfig({ only_with_story })}
            />
          </SettingGroup>
          <SettingGroup title="Pin and hand-pick" note="A hand-picked list overrides sorting, filters, and pins.">
            <OrderedIdList
              label="Pin posts"
              ids={config.pin_blog_ids ?? []}
              labels={labels}
              limit={6}
              onChange={(pin_blog_ids) => setConfig({ pin_blog_ids })}
              onAdd={() => setPicker("pin_blog")}
            />
            <OrderedIdList
              label="Hand-picked posts"
              ids={config.blog_ids ?? []}
              labels={labels}
              limit={24}
              onChange={(blog_ids) => setConfig({ blog_ids })}
              onAdd={() => setPicker("blog")}
            />
          </SettingGroup>
        </>
      )}

      <FeaturedStoryPickerModal
        open={storyTarget !== null}
        onClose={() => setStoryTarget(null)}
        excludeIds={selectedStoryIds}
        onSelect={(story) => {
          setLabels((current) => ({ ...current, [story.id]: story.title }));
          if (storyTarget === "exclude")
            setConfig({ exclude_story_ids: [...(config.exclude_story_ids ?? []), story.id] });
          if (storyTarget === "pin") setConfig({ pin_story_ids: [...(config.pin_story_ids ?? []), story.id] });
          setStoryTarget(null);
        }}
      />
      <ContentPickerDialog
        open={picker !== null}
        kind={picker === "video" ? "video" : "blog"}
        excludeIds={
          picker === "video"
            ? (config.video_ids ?? [])
            : picker === "pin_blog"
              ? (config.pin_blog_ids ?? [])
              : (config.blog_ids ?? [])
        }
        onClose={() => setPicker(null)}
        onSelect={(item) => {
          setLabels((current) => ({ ...current, [item.id]: item.title }));
          if (picker === "video") setConfig({ video_ids: [...(config.video_ids ?? []), item.id] });
          if (picker === "pin_blog") setConfig({ pin_blog_ids: [...(config.pin_blog_ids ?? []), item.id] });
          if (picker === "blog") setConfig({ blog_ids: [...(config.blog_ids ?? []), item.id] });
          setPicker(null);
        }}
      />
    </div>
  );
}
