import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { storyApi } from "@/api/story";
import type { AdminPageTheme, PageThemeValues, PublicPageBlock, Story } from "@/api/types";
import { PageBody } from "@/components/pages/PageBlocks";
import ThemedPage from "@/components/pages/ThemedPage";
import { THEME_PRESETS } from "@/components/pages/pageTheme";
import { COLOR_FIELDS, ColorInput, Field, FontSelect, Section, ThemeSwatches } from "@/components/admin/themeFields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";

type ThemeDraft = PageThemeValues & { name: string };

const toDraft = ({ id: _id, page_count: _p, updated_at: _u, ...draft }: AdminPageTheme): ThemeDraft => draft;

const sampleStory = (id: number, title: string) =>
  ({ id, slug: `sample-${id}`, title, cover_image: "", rating: 4.6, views: 1200 * id, story_type: "Novel" }) as unknown as Story;

// Enough of every kind of content to judge a theme by.
const SAMPLE_BLOCKS: PublicPageBlock[] = [
  {
    id: 1,
    type: "rich_text",
    config: {
      html: "<p>This is how body text looks, with <a href='#'>a link</a> and <strong>bold words</strong>.</p><h2>A section heading</h2><ul><li>A list item</li><li>Another one</li></ul><blockquote>A quote stands out like this.</blockquote>",
    },
  },
  {
    id: 2,
    type: "story_list",
    config: { heading: "Stories on this page", story_ids: [1, 2, 3, 4], layout: "grid" },
    stories: [sampleStory(1, "The Lantern Keeper"), sampleStory(2, "Salt and Shadow"), sampleStory(3, "Nine Nights"), sampleStory(4, "The Quiet House")],
  },
  { id: 3, type: "faq", config: { heading: "Questions", items: [{ question: "Is reading free?", answer: "Yes — every story here is free to read." }] } },
  { id: 4, type: "cta", config: { text: "Ready for more?", label: "Browse the library", url: "#", bg_color: "#ed405a", text_color: "#ffffff" } },
];

const CSS_HINT = (
  <>
    Applies to this theme's pages only. Rules are nested inside the page, so write them as usual (
    <code>h2 {"{ … }"}</code>) and use <code>&amp;</code> for the page itself. Hooks: <code>.ws-page-title</code>,{" "}
    <code>.ws-heading</code>, <code>.ws-block</code>, <code>.ws-block-rich-text</code>, <code>.ws-block-story-list</code>,{" "}
    <code>.ws-block-story-query</code>, <code>.ws-block-banner</code>, <code>.ws-block-image</code>,{" "}
    <code>.ws-block-faq</code>, <code>.ws-block-cta</code>.
  </>
);

const ThemeEditor = ({ theme, onClose }: { theme: AdminPageTheme; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ThemeDraft>(() => toDraft(theme));

  useEffect(() => {
    setDraft(toDraft(theme));
  }, [theme]);

  const set = <K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const save = useMutation({
    mutationFn: () => storyApi.updateAdminPageTheme(theme.id, draft),
    onSuccess: () => {
      toast.success("Theme saved");
      queryClient.invalidateQueries({ queryKey: ["admin-page-themes"] });
      queryClient.invalidateQueries({ queryKey: ["page-preview"] });
    },
    onError: (error: Error) => toast.error(error.message || "Could not save the theme."),
  });

  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Theme name">
          <Input value={draft.name} onChange={(e) => set("name", e.target.value)} maxLength={80} required />
        </Field>

        <Section title="Colours">
          <div className="grid gap-3 sm:grid-cols-2">
            {COLOR_FIELDS.map(({ key, label }) => (
              <ColorInput key={key} label={label} value={draft[key] as string} onChange={(v) => set(key, v as never)} />
            ))}
          </div>
        </Section>

        <Section title="Typography">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Heading font">
              <FontSelect value={draft.heading_font} onChange={(v) => set("heading_font", v)} />
            </Field>
            <Field label="Body font">
              <FontSelect value={draft.body_font} onChange={(v) => set("body_font", v)} />
            </Field>
            <Field label="Body text size (px)" hint="14–24">
              <Input type="number" min={14} max={24} value={draft.body_font_size} onChange={(e) => set("body_font_size", Number(e.target.value))} />
            </Field>
            <Field label="Heading weight" hint="300 (light) – 900 (black)">
              <Input type="number" min={300} max={900} step={100} value={draft.heading_weight} onChange={(e) => set("heading_weight", Number(e.target.value))} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={draft.heading_uppercase} onCheckedChange={(c) => set("heading_uppercase", c === true)} />
            Uppercase headings
          </label>
        </Section>

        <Section title="Layout & shape">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Content width">
              <Select value={draft.content_width} onValueChange={(v) => set("content_width", v as ThemeDraft["content_width"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="narrow">Narrow</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="wide">Wide</SelectItem>
                  <SelectItem value="full">Full width</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Spacing">
              <Select value={draft.section_spacing} onValueChange={(v) => set("section_spacing", v as ThemeDraft["section_spacing"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="relaxed">Relaxed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Corner roundness (px)" hint="0–40">
              <Input type="number" min={0} max={40} value={draft.radius} onChange={(e) => set("radius", Number(e.target.value))} />
            </Field>
          </div>
        </Section>

        <Section title="Background">
          <Field label="Background image URL" hint="Optional; covers the whole page behind the content.">
            <Input value={draft.background_image} onChange={(e) => set("background_image", e.target.value)} placeholder="https://…" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <ColorInput label="Image overlay colour" value={draft.background_overlay_color} onChange={(v) => set("background_overlay_color", v)} />
            <Field label={`Overlay strength (${draft.background_overlay_opacity}%)`} hint="Darkens or tints the image so text stays readable.">
              <input
                type="range"
                min={0}
                max={95}
                value={draft.background_overlay_opacity}
                onChange={(e) => set("background_overlay_opacity", Number(e.target.value))}
                className="w-full"
              />
            </Field>
          </div>
        </Section>

        <Section title="Custom CSS">
          <Textarea
            value={draft.custom_css}
            onChange={(e) => set("custom_css", e.target.value)}
            rows={10}
            spellCheck={false}
            className="font-mono text-xs"
            placeholder={"& { letter-spacing: .01em; }\n.ws-page-title { text-align: center; }\n.ws-block-banner { box-shadow: 0 20px 60px rgb(0 0 0 / .4); }"}
          />
          <p className="text-[11px] text-muted-foreground">{CSS_HINT}</p>
        </Section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Save theme
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
          {theme.page_count > 0 && (
            <p className="text-xs text-muted-foreground">
              Used by {theme.page_count} page{theme.page_count === 1 ? "" : "s"} — saving changes them all.
            </p>
          )}
        </div>
      </form>

      <div className="xl:sticky xl:top-0 xl:self-start">
        <div className="overflow-hidden rounded-lg border">
          <p className="border-b bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
            Live preview — unsaved changes included
          </p>
          <div className="max-h-[75vh] overflow-y-auto">
            <ThemedPage theme={draft} scope={`ws-page-theme-preview-${theme.id}`} loadFonts>
              <PageBody title="Your page title" blocks={SAMPLE_BLOCKS} />
            </ThemedPage>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Create, edit and remove the themes pages can use. */
export function PageThemesManager() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [preset, setPreset] = useState(THEME_PRESETS[0].key);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: themes, isLoading } = useQuery({
    queryKey: ["admin-page-themes"],
    queryFn: storyApi.getAdminPageThemes,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-page-themes"] });
    queryClient.invalidateQueries({ queryKey: ["admin-page"] });
  };
  const onError = (fallback: string) => (error: Error) => toast.error(error.message || fallback);

  const create = useMutation({
    mutationFn: () =>
      storyApi.createAdminPageTheme({
        ...(THEME_PRESETS.find((option) => option.key === preset) ?? THEME_PRESETS[0]).values,
        name: name.trim(),
      }),
    onSuccess: (theme) => {
      toast.success("Theme created");
      setName("");
      setEditingId(theme.id);
      refresh();
    },
    onError: onError("Could not create the theme."),
  });

  const duplicate = useMutation({
    mutationFn: (id: number) => storyApi.duplicateAdminPageTheme(id),
    onSuccess: (theme) => {
      toast.success("Theme duplicated");
      setEditingId(theme.id);
      refresh();
    },
    onError: onError("Could not duplicate the theme."),
  });

  const remove = useMutation({
    mutationFn: (id: number) => storyApi.deleteAdminPageTheme(id),
    onSuccess: (_result, id) => {
      toast.success("Theme deleted");
      if (editingId === id) setEditingId(null);
      refresh();
    },
    onError: onError("Could not delete the theme."),
  });

  const editing = themes?.find((theme) => theme.id === editingId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New theme</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim()) create.mutate();
            }}
          >
            <div className="min-w-[220px] flex-1">
              <Label htmlFor="theme-name" className="text-xs">
                Name
              </Label>
              <Input id="theme-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Halloween 2026" className="mt-1" />
            </div>
            <div className="w-48">
              <Label className="text-xs">Start from</Label>
              <Select value={preset} onValueChange={setPreset}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEME_PRESETS.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={create.isPending || !name.trim()}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            A starting point only — every colour, font, size and the custom CSS stay editable. Then pick the theme in a
            page's Settings tab.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Themes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && (themes || []).length === 0 && (
            <p className="text-sm text-muted-foreground">No themes yet — pages use the site's look.</p>
          )}
          <ul className="space-y-3">
            {(themes || []).map((theme) => (
              <li key={theme.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <ThemeSwatches theme={theme} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{theme.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {theme.page_count} page{theme.page_count === 1 ? "" : "s"}
                        {theme.heading_font && ` · ${theme.heading_font}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditingId((c) => (c === theme.id ? null : theme.id))}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      {editingId === theme.id ? "Close" : "Edit"}
                    </Button>
                    <Button size="sm" variant="outline" aria-label={`Duplicate ${theme.name}`} disabled={duplicate.isPending} onClick={() => duplicate.mutate(theme.id)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Delete ${theme.name}`}
                      disabled={remove.isPending}
                      onClick={() => {
                        const warning =
                          theme.page_count > 0
                            ? `“${theme.name}” is used by ${theme.page_count} page(s). Delete it? They'll go back to the site's look.`
                            : `Delete “${theme.name}”?`;
                        if (window.confirm(warning)) remove.mutate(theme.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {editing && editing.id === theme.id && <ThemeEditor theme={editing} onClose={() => setEditingId(null)} />}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
