import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Copy, ExternalLink, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { storyApi } from "@/api/story";
import type {
  AdminPage,
  AdminPageBlock,
  AdminPageInput,
  BannerBlockConfig,
  CtaBlockConfig,
  FaqBlockConfig,
  ImageBlockConfig,
  PageBlockData,
  PageBlockType,
  PageStatusLabel,
  PageStoryLayout,
  PageTemplate,
  StoryListBlockConfig,
  StoryQueryBlockConfig,
} from "@/api/types";
import { FeaturedStoryPickerModal } from "@/components/admin/FeaturedStoryPickerModal";
import { PageThemesManager } from "@/components/admin/PageThemesManager";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import { isoToLocalInput, localInputToIso } from "@/lib/datetimeLocal";

const TEMPLATES: { value: PageTemplate; label: string; hint: string }[] = [
  { value: "static", label: "Static page", hint: "A text page — about, guides, announcements." },
  { value: "book_list", label: "Book list", hint: "An intro plus stories you pick, in your order." },
  { value: "blank", label: "Blank", hint: "No blocks — build it from scratch." },
];

const BLOCK_LABELS: Record<PageBlockType, string> = {
  rich_text: "Rich text",
  story_list: "Hand-picked stories",
  story_query: "Automatic story list",
  banner: "Banner",
  image: "Image",
  faq: "FAQ",
  cta: "Call to action",
};

const newBlock = (type: PageBlockType): PageBlockData => {
  switch (type) {
    case "rich_text":
      return { type, config: { html: "" } };
    case "story_list":
      return { type, config: { heading: "", story_ids: [], layout: "grid" } };
    case "story_query":
      return {
        type,
        config: { heading: "", genre: "", category: "", tag: "", theme: "", country: "", sort: "newest", limit: 12, layout: "grid" },
      };
    case "banner":
      return { type, config: { heading: "", text: "", image: "", cta_label: "", cta_url: "", background_color: "#1a212d" } };
    case "image":
      return { type, config: { url: "", alt: "", caption: "" } };
    case "faq":
      return { type, config: { heading: "Frequently asked questions", items: [{ question: "", answer: "" }] } };
    case "cta":
      return { type, config: { text: "", label: "", url: "", bg_color: "#ed405a", text_color: "#ffffff" } };
  }
};

const STATUS_BADGE: Record<PageStatusLabel, { label: string; className: string }> = {
  live: { label: "Live", className: "bg-emerald-100 text-emerald-700" },
  scheduled: { label: "Scheduled", className: "bg-sky-100 text-sky-700" },
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
};

/** Editor-side block: a stable key so reordering doesn't remount editors. */
type DraftBlock = AdminPageBlock & { key: string };
let keyCounter = 0;
const withKey = (block: AdminPageBlock | PageBlockData): DraftBlock => ({ ...block, key: `b${++keyCounter}` });

type Draft = Omit<AdminPageInput, "blocks"> & { blocks: DraftBlock[] };

const toDraft = (page: AdminPage): Draft => ({
  title: page.title,
  slug: page.slug,
  template: page.template,
  status: page.status,
  publish_at: page.publish_at,
  meta_title: page.meta_title,
  meta_description: page.meta_description,
  og_image: page.og_image,
  noindex: page.noindex,
  theme: page.theme,
  blocks: page.blocks.map(withKey),
});

const pageUrl = (slug: string, live: boolean) => `/pages/${slug}${live ? "" : "?preview=1"}`;

// ---------------------------------------------------------------------------
// Small form pieces
// ---------------------------------------------------------------------------

const Field = ({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <Field label={label}>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
        aria-label={`${label} picker`}
      />
      <Input value={value} onChange={(event) => onChange(event.target.value)} maxLength={7} />
    </div>
  </Field>
);

const LayoutSelect = ({ value, onChange }: { value: PageStoryLayout; onChange: (v: PageStoryLayout) => void }) => (
  <Field label="Layout">
    <Select value={value} onValueChange={(v) => onChange(v as PageStoryLayout)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="grid">Grid</SelectItem>
        <SelectItem value="rail">Scrolling row</SelectItem>
      </SelectContent>
    </Select>
  </Field>
);

const LINK_HINT = "A site path like /library, or a full https:// URL (opens in a new tab).";

// ---------------------------------------------------------------------------
// Block editors
// ---------------------------------------------------------------------------

const StoryListEditor = ({
  config,
  stories,
  onChange,
}: {
  config: StoryListBlockConfig;
  stories: { id: number; title: string; is_published: boolean }[];
  onChange: (config: StoryListBlockConfig, stories: { id: number; title: string; is_published: boolean }[]) => void;
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const byId = new Map(stories.map((story) => [story.id, story]));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= config.story_ids.length) return;
    const ids = [...config.story_ids];
    [ids[index], ids[target]] = [ids[target], ids[index]];
    onChange({ ...config, story_ids: ids }, stories);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Heading" hint="Optional.">
          <Input value={config.heading} onChange={(e) => onChange({ ...config, heading: e.target.value }, stories)} maxLength={120} />
        </Field>
        <LayoutSelect value={config.layout} onChange={(layout) => onChange({ ...config, layout }, stories)} />
      </div>

      {config.story_ids.length === 0 ? (
        <p className="text-sm text-muted-foreground">No stories picked yet.</p>
      ) : (
        <ol className="space-y-1.5">
          {config.story_ids.map((id, index) => {
            const story = byId.get(id);
            return (
              <li key={id} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                <span className="w-6 text-center text-xs text-muted-foreground">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {story?.title ?? `Story #${id}`}
                  {story && !story.is_published && (
                    <span className="ml-2 text-xs text-amber-600">unpublished — hidden on the page</span>
                  )}
                </span>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  aria-label="Move down"
                  disabled={index === config.story_ids.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  aria-label="Remove"
                  onClick={() => onChange({ ...config, story_ids: config.story_ids.filter((sid) => sid !== id) }, stories)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ol>
      )}

      <Button type="button" size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add story
      </Button>
      <FeaturedStoryPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        excludeIds={config.story_ids}
        onSelect={(story) => {
          onChange({ ...config, story_ids: [...config.story_ids, story.id] }, [
            ...stories,
            { id: story.id, title: story.title, is_published: Boolean(story.is_published) },
          ]);
          setPickerOpen(false);
        }}
      />
    </div>
  );
};

const StoryQueryEditor = ({
  config,
  onChange,
}: {
  config: StoryQueryBlockConfig;
  onChange: (config: StoryQueryBlockConfig) => void;
}) => {
  const options = {
    genre: useQuery({ queryKey: ["admin-genres"], queryFn: storyApi.getAdminGenres }).data,
    category: useQuery({ queryKey: ["admin-categories"], queryFn: storyApi.getAdminCategories }).data,
    tag: useQuery({ queryKey: ["admin-tags"], queryFn: storyApi.getAdminTags }).data,
    theme: useQuery({ queryKey: ["admin-themes"], queryFn: storyApi.getAdminThemes }).data,
  };
  const set = <K extends keyof StoryQueryBlockConfig>(key: K, value: StoryQueryBlockConfig[K]) =>
    onChange({ ...config, [key]: value });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Shows published stories matching every filter you fill in, and stays up to date by itself.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Heading" hint="Optional.">
          <Input value={config.heading} onChange={(e) => set("heading", e.target.value)} maxLength={120} />
        </Field>
        <LayoutSelect value={config.layout} onChange={(layout) => set("layout", layout)} />
        {(["genre", "category", "tag", "theme"] as const).map((key) => (
          <Field key={key} label={key[0].toUpperCase() + key.slice(1)} hint="Type to search; leave empty for any.">
            <Input
              list={`page-query-${key}`}
              value={config[key]}
              onChange={(e) => set(key, e.target.value)}
              placeholder="any"
            />
            <datalist id={`page-query-${key}`}>
              {(options[key] || []).map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </datalist>
          </Field>
        ))}
        <Field label="Country" hint="Leave empty for any.">
          <Input list="page-query-country" value={config.country} onChange={(e) => set("country", e.target.value.toUpperCase())} maxLength={2} placeholder="any" />
          <datalist id="page-query-country">
            {COUNTRY_OPTIONS.map((country) => (
              <option key={country.code} value={country.code}>
                {country.label}
              </option>
            ))}
          </datalist>
        </Field>
        <Field label="Sort by">
          <Select value={config.sort} onValueChange={(v) => set("sort", v as StoryQueryBlockConfig["sort"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="popular">Most read</SelectItem>
              <SelectItem value="top_rated">Top rated</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="How many" hint="1–24">
          <Input type="number" min={1} max={24} value={config.limit} onChange={(e) => set("limit", Number(e.target.value))} />
        </Field>
      </div>
    </div>
  );
};

const BannerEditor = ({ config, onChange }: { config: BannerBlockConfig; onChange: (c: BannerBlockConfig) => void }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <Field label="Heading" hint="Placed first on the page, this becomes the page's main heading.">
      <Input value={config.heading} onChange={(e) => onChange({ ...config, heading: e.target.value })} maxLength={120} />
    </Field>
    <ColorInput label="Background colour" value={config.background_color} onChange={(v) => onChange({ ...config, background_color: v })} />
    <div className="sm:col-span-2">
      <Field label="Text">
        <Textarea value={config.text} onChange={(e) => onChange({ ...config, text: e.target.value })} maxLength={400} rows={2} />
      </Field>
    </div>
    <div className="sm:col-span-2">
      <Field label="Background image URL" hint="Optional; darkened so the text stays readable.">
        <Input value={config.image} onChange={(e) => onChange({ ...config, image: e.target.value })} placeholder="https://…" />
      </Field>
    </div>
    <Field label="Button label" hint="Optional.">
      <Input value={config.cta_label} onChange={(e) => onChange({ ...config, cta_label: e.target.value })} maxLength={40} />
    </Field>
    <Field label="Button link" hint={LINK_HINT}>
      <Input value={config.cta_url} onChange={(e) => onChange({ ...config, cta_url: e.target.value })} />
    </Field>
  </div>
);

const ImageEditor = ({ config, onChange }: { config: ImageBlockConfig; onChange: (c: ImageBlockConfig) => void }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <div className="sm:col-span-2">
      <Field label="Image URL">
        <Input value={config.url} onChange={(e) => onChange({ ...config, url: e.target.value })} placeholder="https://…" />
      </Field>
    </div>
    <Field label="Alt text" hint="Describe the image — used by search engines and screen readers.">
      <Input value={config.alt} onChange={(e) => onChange({ ...config, alt: e.target.value })} maxLength={200} />
    </Field>
    <Field label="Caption" hint="Optional.">
      <Input value={config.caption} onChange={(e) => onChange({ ...config, caption: e.target.value })} maxLength={200} />
    </Field>
  </div>
);

const FaqEditor = ({ config, onChange }: { config: FaqBlockConfig; onChange: (c: FaqBlockConfig) => void }) => {
  const setItem = (index: number, key: "question" | "answer", value: string) =>
    onChange({ ...config, items: config.items.map((item, i) => (i === index ? { ...item, [key]: value } : item)) });
  return (
    <div className="space-y-3">
      <Field label="Heading" hint="Optional.">
        <Input value={config.heading} onChange={(e) => onChange({ ...config, heading: e.target.value })} maxLength={120} />
      </Field>
      {config.items.map((item, index) => (
        <div key={index} className="space-y-2 rounded-md border p-3">
          <div className="flex items-center gap-2">
            <Input value={item.question} onChange={(e) => setItem(index, "question", e.target.value)} placeholder="Question" maxLength={200} />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Remove question"
              disabled={config.items.length === 1}
              onClick={() => onChange({ ...config, items: config.items.filter((_, i) => i !== index) })}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Textarea value={item.answer} onChange={(e) => setItem(index, "answer", e.target.value)} placeholder="Answer" maxLength={2000} rows={2} />
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onChange({ ...config, items: [...config.items, { question: "", answer: "" }] })}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add question
      </Button>
    </div>
  );
};

const CtaEditor = ({ config, onChange }: { config: CtaBlockConfig; onChange: (c: CtaBlockConfig) => void }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <div className="sm:col-span-2">
      <Field label="Text above the button" hint="Optional.">
        <Input value={config.text} onChange={(e) => onChange({ ...config, text: e.target.value })} maxLength={200} />
      </Field>
    </div>
    <Field label="Button label">
      <Input value={config.label} onChange={(e) => onChange({ ...config, label: e.target.value })} maxLength={40} />
    </Field>
    <Field label="Button link" hint={LINK_HINT}>
      <Input value={config.url} onChange={(e) => onChange({ ...config, url: e.target.value })} />
    </Field>
    <ColorInput label="Button colour" value={config.bg_color} onChange={(v) => onChange({ ...config, bg_color: v })} />
    <ColorInput label="Text colour" value={config.text_color} onChange={(v) => onChange({ ...config, text_color: v })} />
  </div>
);

const BlockEditor = ({ block, onChange }: { block: DraftBlock; onChange: (block: DraftBlock) => void }) => {
  switch (block.type) {
    case "rich_text":
      return <RichTextEditor value={block.config.html} onChange={(html) => onChange({ ...block, config: { html } })} />;
    case "story_list":
      return (
        <StoryListEditor
          config={block.config}
          stories={block.stories ?? []}
          onChange={(config, stories) => onChange({ ...block, config, stories })}
        />
      );
    case "story_query":
      return <StoryQueryEditor config={block.config} onChange={(config) => onChange({ ...block, config })} />;
    case "banner":
      return <BannerEditor config={block.config} onChange={(config) => onChange({ ...block, config })} />;
    case "image":
      return <ImageEditor config={block.config} onChange={(config) => onChange({ ...block, config })} />;
    case "faq":
      return <FaqEditor config={block.config} onChange={(config) => onChange({ ...block, config })} />;
    case "cta":
      return <CtaEditor config={block.config} onChange={(config) => onChange({ ...block, config })} />;
  }
};

// ---------------------------------------------------------------------------
// Page editor
// ---------------------------------------------------------------------------

const PageEditor = ({ pageId, onClose }: { pageId: number; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [addType, setAddType] = useState<PageBlockType>("rich_text");

  const { data: page, isLoading } = useQuery({
    queryKey: ["admin-page", pageId],
    queryFn: () => storyApi.getAdminPage(pageId),
  });
  const { data: themes } = useQuery({
    queryKey: ["admin-page-themes"],
    queryFn: storyApi.getAdminPageThemes,
  });

  useEffect(() => {
    if (page) setDraft(toDraft(page));
  }, [page]);

  const save = useMutation({
    mutationFn: (payload: Draft) =>
      storyApi.updateAdminPage(pageId, {
        ...payload,
        blocks: payload.blocks.map(({ type, config }) => ({ type, config }) as PageBlockData),
      }),
    onSuccess: (saved) => {
      toast.success("Page saved");
      queryClient.setQueryData(["admin-page", pageId], saved);
      queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
      queryClient.invalidateQueries({ queryKey: ["page-preview", saved.slug] });
    },
    onError: (error: Error) => toast.error(error.message || "Could not save the page."),
  });

  const isLive = page?.status_label === "live";
  const slugChangedOnLivePage = Boolean(page && draft && isLive && draft.slug !== page.slug);
  const metaTitlePreview = useMemo(
    () => (draft ? draft.meta_title || `${draft.title} | WorldStories` : ""),
    [draft]
  );

  if (isLoading || !draft || !page) {
    return <p className="mt-4 text-sm text-muted-foreground">Loading page…</p>;
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  const updateBlock = (index: number, block: DraftBlock) =>
    set("blocks", draft.blocks.map((b, i) => (i === index ? block : b)));

  const moveBlock = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= draft.blocks.length) return;
    const blocks = [...draft.blocks];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    set("blocks", blocks);
  };

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(draft);
      }}
    >
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Field label="Page title" hint="The page's main heading (unless it starts with a banner).">
            <Input value={draft.title} onChange={(e) => set("title", e.target.value)} maxLength={160} required />
          </Field>

          {draft.blocks.length === 0 && (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              No blocks yet — add one below.
            </p>
          )}

          {draft.blocks.map((block, index) => (
            <div key={block.key} className="rounded-md border">
              <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-1.5">
                <span className="text-sm font-medium">
                  {index + 1}. {BLOCK_LABELS[block.type]}
                </span>
                <div className="flex items-center gap-1">
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Move block up" disabled={index === 0} onClick={() => moveBlock(index, -1)}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="Move block down"
                    disabled={index === draft.blocks.length - 1}
                    onClick={() => moveBlock(index, 1)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="Remove block"
                    onClick={() => {
                      if (window.confirm(`Remove this ${BLOCK_LABELS[block.type]} block?`)) {
                        set("blocks", draft.blocks.filter((_, i) => i !== index));
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="p-3">
                <BlockEditor block={block} onChange={(updated) => updateBlock(index, updated)} />
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-2">
            <Select value={addType} onValueChange={(v) => setAddType(v as PageBlockType)}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(BLOCK_LABELS) as PageBlockType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {BLOCK_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={() => set("blocks", [...draft.blocks, withKey(newBlock(addType))])}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add block
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <div className="rounded-md border p-3">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Search result preview</p>
            <p className="truncate text-xs text-emerald-700">worldstories.net/pages/{draft.slug}</p>
            <p className="truncate text-lg text-blue-700">{metaTitlePreview}</p>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {draft.meta_description || "Taken from the start of the page's first text block when left empty."}
            </p>
          </div>
          <Field label={`Meta title (${draft.meta_title.length}/70)`} hint="Leave empty to use “<page title> | WorldStories”.">
            <Input value={draft.meta_title} onChange={(e) => set("meta_title", e.target.value)} maxLength={70} />
          </Field>
          <Field label={`Meta description (${draft.meta_description.length}/170)`} hint="One or two sentences that make someone want to click.">
            <Textarea value={draft.meta_description} onChange={(e) => set("meta_description", e.target.value)} maxLength={170} rows={3} />
          </Field>
          <Field label="Social share image URL" hint="Optional; falls back to the first banner image, then the site image.">
            <Input value={draft.og_image} onChange={(e) => set("og_image", e.target.value)} placeholder="https://…" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={draft.noindex} onCheckedChange={(checked) => set("noindex", checked === true)} />
            Hide from search engines (noindex, and left out of the sitemap)
          </label>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Field label="Theme" hint="Colours, fonts, layout and custom CSS. Create and edit themes in the Themes tab.">
            <Select
              value={draft.theme ? String(draft.theme) : "site"}
              onValueChange={(v) => set("theme", v === "site" ? null : Number(v))}
            >
              <SelectTrigger className="sm:w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="site">Site default</SelectItem>
                {(themes || []).map((theme) => (
                  <SelectItem key={theme.id} value={String(theme.id)}>
                    {theme.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Address"
            hint={
              slugChangedOnLivePage
                ? `This page is live — the old address /pages/${page.slug} will redirect here.`
                : "Lowercase letters, numbers and hyphens."
            }
          >
            <div className="flex items-center">
              <span className="rounded-l-md border border-r-0 bg-muted px-3 py-2 text-sm text-muted-foreground">/pages/</span>
              <Input
                value={draft.slug}
                onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                className="rounded-l-none"
                maxLength={160}
              />
            </div>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Status">
              <Select value={draft.status} onValueChange={(v) => set("status", v as Draft["status"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft — only you can preview it</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Publish at" hint="Optional, your local time. A published page stays hidden until then.">
              <Input
                type="datetime-local"
                value={isoToLocalInput(draft.publish_at)}
                onChange={(e) => set("publish_at", localInputToIso(e.target.value))}
              />
            </Field>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          Save page
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href={pageUrl(page.slug, isLive)} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1.5 h-4 w-4" />
            {isLive ? "View" : "Preview"}
          </a>
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Close
        </Button>
        <p className="text-xs text-muted-foreground">Preview and view show the last saved version.</p>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// Page list
// ---------------------------------------------------------------------------

/** Admin-built pages served at /pages/<slug> on the main site, and their themes. */
const AdminPages = () => (
  // The admin shell's content section is overflow-hidden, so every page owns
  // its own scroll area.
  <div className="h-full overflow-y-auto pr-1">
    <Tabs defaultValue="pages" className="space-y-6">
      <TabsList>
        <TabsTrigger value="pages">Pages</TabsTrigger>
        <TabsTrigger value="themes">Themes</TabsTrigger>
      </TabsList>
      <TabsContent value="pages">
        <PagesManager />
      </TabsContent>
      <TabsContent value="themes">
        <PageThemesManager />
      </TabsContent>
    </Tabs>
  </div>
);

const PagesManager = () => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState<PageTemplate>("static");
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: pages, isLoading } = useQuery({
    queryKey: ["admin-pages"],
    queryFn: storyApi.getAdminPages,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
  const onError = (fallback: string) => (error: Error) => toast.error(error.message || fallback);

  const create = useMutation({
    mutationFn: () => storyApi.createAdminPage({ title: title.trim(), template }),
    onSuccess: (page) => {
      toast.success("Page created as a draft");
      setTitle("");
      setEditingId(page.id);
      refresh();
    },
    onError: onError("Could not create the page."),
  });

  const duplicate = useMutation({
    mutationFn: (id: number) => storyApi.duplicateAdminPage(id),
    onSuccess: (page) => {
      toast.success("Page duplicated as a draft");
      setEditingId(page.id);
      refresh();
    },
    onError: onError("Could not duplicate the page."),
  });

  const remove = useMutation({
    mutationFn: (id: number) => storyApi.deleteAdminPage(id),
    onSuccess: (_result, id) => {
      toast.success("Page deleted");
      if (editingId === id) setEditingId(null);
      refresh();
    },
    onError: onError("Could not delete the page."),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New page</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (title.trim()) create.mutate();
            }}
          >
            <div className="min-w-[240px] flex-1">
              <Label htmlFor="page-title" className="text-xs">
                Title
              </Label>
              <Input
                id="page-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Best Ghost Stories From Around the World"
                className="mt-1"
              />
            </div>
            <div className="w-48">
              <Label className="text-xs">Start from</Label>
              <Select value={template} onValueChange={(v) => setTemplate(v as PageTemplate)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={create.isPending || !title.trim()}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            {TEMPLATES.find((option) => option.value === template)?.hint} New pages start as drafts at /pages/&lt;title&gt;.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pages</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && (pages || []).length === 0 && <p className="text-sm text-muted-foreground">No pages yet.</p>}

          <ul className="space-y-3">
            {(pages || []).map((page) => {
              const badge = STATUS_BADGE[page.status_label];
              const live = page.status_label === "live";
              return (
                <li key={page.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {page.title}
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${badge.className}`}>{badge.label}</span>
                      </p>
                      <a
                        href={pageUrl(page.slug, live)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                      >
                        {page.path}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      {page.status_label === "scheduled" && page.publish_at && (
                        <p className="text-xs text-muted-foreground">
                          Goes live {new Date(page.publish_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId((current) => (current === page.id ? null : page.id))}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        {editingId === page.id ? "Close" : "Edit"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={duplicate.isPending}
                        aria-label={`Duplicate ${page.title}`}
                        onClick={() => duplicate.mutate(page.id)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={remove.isPending}
                        aria-label={`Delete ${page.title}`}
                        onClick={() => {
                          const warning = live
                            ? `“${page.title}” is live. Delete it? Its address will stop working.`
                            : `Delete “${page.title}”?`;
                          if (window.confirm(warning)) remove.mutate(page.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {editingId === page.id && <PageEditor pageId={page.id} onClose={() => setEditingId(null)} />}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPages;
