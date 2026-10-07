import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Copy, Globe, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { storyApi } from "@/api/story";
import type { AdminSiteTheme, SiteThemeInput, Story } from "@/api/types";
import { COLOR_FIELDS, ColorInput, Field, FontSelect, Section, ThemeSwatches } from "@/components/admin/themeFields";
import { fontStack, lookVariables, pickLook, THEME_PRESETS, themeFontsUrl } from "@/components/pages/pageTheme";
import StoryCard from "@/components/StoryCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { isoToLocalInput, localInputToIso } from "@/lib/datetimeLocal";

type Draft = SiteThemeInput;

const toDraft = ({ id: _id, status: _s, updated_at: _u, ...draft }: AdminSiteTheme): Draft => draft;

/** The site's main sections, offered as checkboxes. "*" covers every page under a path. */
const SITE_SECTIONS: { path: string; label: string }[] = [
  { path: "/", label: "Homepage" },
  { path: "/library", label: "Library" },
  { path: "/discover", label: "Discover" },
  { path: "/story/*", label: "Story pages" },
  { path: "/read/*", label: "Reading chapters" },
  { path: "/audiobooks", label: "Audiobooks" },
  { path: "/listen/*", label: "Audiobook player" },
  { path: "/watch*", label: "Watch" },
  { path: "/quick-reads", label: "Quick reads" },
  { path: "/journeys*", label: "Journeys" },
  { path: "/story-map", label: "Story map" },
  { path: "/authors*", label: "Authors" },
  { path: "/blog*", label: "Blog" },
  { path: "/genre/*", label: "Genre pages" },
  { path: "/category/*", label: "Category pages" },
  { path: "/tag/*", label: "Tag pages" },
  { path: "/theme/*", label: "Theme pages" },
  { path: "/pages/*", label: "All custom pages" },
  { path: "/about", label: "About" },
];

const STATUS_BADGE: Record<AdminSiteTheme["status"], { label: string; className: string }> = {
  always: { label: "Always on", className: "bg-emerald-100 text-emerald-700" },
  live: { label: "Live now", className: "bg-emerald-100 text-emerald-700" },
  scheduled: { label: "Scheduled", className: "bg-sky-100 text-sky-700" },
  ended: { label: "Schedule ended", className: "bg-muted text-muted-foreground" },
  off: { label: "Off", className: "bg-muted text-muted-foreground" },
};

const formatWhen = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const scopeSummary = (theme: AdminSiteTheme) => {
  if (theme.apply_to === "site") return "Whole site";
  const shown = theme.page_paths.slice(0, 3).join(", ");
  const more = theme.page_paths.length - 3;
  return `${theme.page_paths.length} page${theme.page_paths.length === 1 ? "" : "s"}: ${shown}${more > 0 ? ` +${more}` : ""}`;
};

const sampleStory = (id: number, title: string) =>
  ({ id, slug: `sample-${id}`, title, cover_image: "", rating: 4.6, views: 1200 * id, story_type: "Novel" }) as unknown as Story;
const SAMPLE_STORIES = [sampleStory(1, "The Lantern Keeper"), sampleStory(2, "Salt and Shadow"), sampleStory(3, "Nine Nights")];

/**
 * A miniature of the site in the draft theme. The theme's custom CSS isn't
 * applied here — it's global, so it would restyle the admin panel itself.
 */
const SiteThemePreview = ({ draft }: { draft: Draft }) => {
  const fontsUrl = themeFontsUrl(draft);
  const heading: CSSProperties = {
    color: draft.heading_color,
    fontFamily: draft.heading_font ? fontStack(draft.heading_font) : undefined,
  };
  return (
    <div
      className="relative isolate overflow-hidden bg-background text-foreground"
      style={{
        ...(lookVariables(draft) as CSSProperties),
        fontFamily: draft.body_font ? fontStack(draft.body_font) : undefined,
        ...(draft.background_image
          ? { backgroundImage: `url("${draft.background_image.replace(/"/g, "%22")}")`, backgroundSize: "cover", backgroundPosition: "center" }
          : {}),
      }}
    >
      {fontsUrl && <link rel="stylesheet" href={fontsUrl} />}
      {draft.background_image && draft.background_overlay_opacity > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ backgroundColor: draft.background_overlay_color, opacity: draft.background_overlay_opacity / 100 }}
        />
      )}
      <div className="flex items-center justify-between border-b bg-card/90 px-4 py-2.5">
        <span className="font-bold" style={heading}>
          WorldStories
        </span>
        <span className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Library</span>
          <span>Discover</span>
          <span className="flex items-center gap-1 rounded-md border px-2 py-1">
            <Search className="h-3 w-3" /> Search
          </span>
        </span>
      </div>
      <div className="space-y-5 p-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold" style={heading}>
            Stories from around the world
          </h2>
          <p className="text-sm">
            Body text looks like this, with <a className="text-primary underline">a link</a> and{" "}
            <span className="text-muted-foreground">quieter secondary text</span>.
          </p>
          <div className="flex gap-2">
            <Button size="sm">Start reading</Button>
            <Button size="sm" variant="outline">
              Browse
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {SAMPLE_STORIES.map((story) => (
            <StoryCard key={story.id} {...story} />
          ))}
        </div>
        <div className="rounded-lg border bg-card p-3 text-sm">A card or panel on the site.</div>
      </div>
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">Footer · About · Privacy</div>
    </div>
  );
};

/** An on/off switch. */
const ActiveSwitch = ({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60 ${
      checked ? "bg-emerald-500" : "bg-muted-foreground/30"
    }`}
  >
    <span
      className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}
    />
  </button>
);

const SiteThemeEditor = ({ theme, onClose }: { theme: AdminSiteTheme; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => toDraft(theme));
  const [presetKey, setPresetKey] = useState(THEME_PRESETS[0].key);
  const [customPaths, setCustomPaths] = useState("");

  const { data: pages } = useQuery({ queryKey: ["admin-pages"], queryFn: storyApi.getAdminPages });

  const sectionPaths = useMemo(() => new Set(SITE_SECTIONS.map((section) => section.path)), []);
  const pagePaths = useMemo(() => new Set((pages || []).map((page) => page.path)), [pages]);

  useEffect(() => {
    setDraft(toDraft(theme));
    // Whatever isn't a listed section or one of the custom pages is edited as free text.
    setCustomPaths(theme.page_paths.filter((path) => !sectionPaths.has(path) && !pagePaths.has(path)).join("\n"));
    // Re-derive only when the saved theme changes; pagePaths arriving later shouldn't wipe typed text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const checkedPaths = new Set(draft.page_paths);
  const togglePath = (path: string, checked: boolean) =>
    set("page_paths", checked ? [...draft.page_paths, path] : draft.page_paths.filter((p) => p !== path));

  // The custom-paths box is the source of truth for anything not in the checklists.
  const pathsForSave = () => {
    const listed = draft.page_paths.filter((path) => sectionPaths.has(path) || pagePaths.has(path));
    const typed = customPaths
      .split(/\n|,/)
      .map((line) => line.trim())
      .filter(Boolean);
    return [...new Set([...listed, ...typed])];
  };

  const save = useMutation({
    mutationFn: () => storyApi.updateAdminSiteTheme(theme.id, { ...draft, page_paths: pathsForSave() }),
    onSuccess: (saved) => {
      toast.success(saved.mode === "off" ? "Site theme saved" : "Site theme saved — any other theme was switched off");
      // Saving one as on may have switched others off, so refetch them all.
      queryClient.invalidateQueries({ queryKey: ["admin-site-themes"] });
    },
    onError: (error: Error) => toast.error(error.message || "Could not save the theme."),
  });

  const applyPreset = () => {
    const preset = THEME_PRESETS.find((option) => option.key === presetKey);
    if (!preset) return;
    if (!window.confirm(`Replace this theme's colours, fonts and background with the “${preset.label}” preset?`)) return;
    setDraft((current) => ({ ...current, ...pickLook(preset.values), custom_css: current.custom_css }));
  };

  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <Section title="Theme">
          <Field label="Name" hint="Only shown here.">
            <Input value={draft.name} onChange={(e) => set("name", e.target.value)} maxLength={80} required />
          </Field>
          <Field label="Load a preset" hint="Replaces the colours, fonts and background below. Unsaved until you save.">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={presetKey} onValueChange={setPresetKey}>
                <SelectTrigger className="w-56">
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
              <Button type="button" variant="outline" onClick={applyPreset}>
                Apply preset
              </Button>
            </div>
          </Field>
        </Section>

        <Section title="When">
          <Field label="Status" hint="Only one theme can be on. Saving this one as on switches the others off.">
            <Select value={draft.mode} onValueChange={(v) => set("mode", v as Draft["mode"])}>
              <SelectTrigger className="sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="always">On</SelectItem>
                <SelectItem value="scheduled">On, only between two dates</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {draft.mode === "scheduled" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Starts" hint="Your local time.">
                <Input type="datetime-local" value={isoToLocalInput(draft.starts_at)} onChange={(e) => set("starts_at", localInputToIso(e.target.value))} />
              </Field>
              <Field label="Ends">
                <Input type="datetime-local" value={isoToLocalInput(draft.ends_at)} onChange={(e) => set("ends_at", localInputToIso(e.target.value))} />
              </Field>
            </div>
          )}
        </Section>

        <Section title="Where">
          <div className="flex flex-wrap gap-4 text-sm">
            {(["site", "pages"] as const).map((value) => (
              <label key={value} className="flex items-center gap-2">
                <input type="radio" name={`apply-to-${theme.id}`} checked={draft.apply_to === value} onChange={() => set("apply_to", value)} />
                {value === "site" ? "Whole site" : "Selected pages"}
              </label>
            ))}
          </div>

          {draft.apply_to === "pages" && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Site sections</Label>
                <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                  {SITE_SECTIONS.map((section) => (
                    <label key={section.path} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={checkedPaths.has(section.path)} onCheckedChange={(c) => togglePath(section.path, c === true)} />
                      {section.label}
                      <span className="text-xs text-muted-foreground">{section.path}</span>
                    </label>
                  ))}
                </div>
              </div>

              {(pages || []).length > 0 && (
                <div>
                  <Label className="text-xs">Your custom pages</Label>
                  <div className="mt-1.5 grid max-h-48 gap-1.5 overflow-y-auto sm:grid-cols-2">
                    {(pages || []).map((page) => (
                      <label key={page.id} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={checkedPaths.has(page.path)} onCheckedChange={(c) => togglePath(page.path, c === true)} />
                        <span className="truncate">{page.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <Field label="Other paths" hint="One per line. /library matches that page only; end with * for everything under it, e.g. /story/the-raven*.">
                <Textarea value={customPaths} onChange={(e) => setCustomPaths(e.target.value)} rows={3} className="font-mono text-xs" />
              </Field>
            </div>
          )}
        </Section>

        <Section title="Colours">
          <div className="grid gap-3 sm:grid-cols-2">
            {COLOR_FIELDS.map(({ key, label }) => (
              <ColorInput key={key} label={label} value={draft[key] as string} onChange={(v) => set(key, v as never)} />
            ))}
          </div>
        </Section>

        <Section title="Fonts & shape">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Heading font">
              <FontSelect value={draft.heading_font} onChange={(v) => set("heading_font", v)} />
            </Field>
            <Field label="Body font">
              <FontSelect value={draft.body_font} onChange={(v) => set("body_font", v)} />
            </Field>
            <Field label="Corner roundness (px)" hint="0–40">
              <Input type="number" min={0} max={40} value={draft.radius} onChange={(e) => set("radius", Number(e.target.value))} />
            </Field>
          </div>
        </Section>

        <Section title="Background">
          <Field label="Background image URL" hint="Optional; fixed behind the whole page. Shows wherever sections are see-through.">
            <Input value={draft.background_image} onChange={(e) => set("background_image", e.target.value)} placeholder="https://…" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <ColorInput label="Image overlay colour" value={draft.background_overlay_color} onChange={(v) => set("background_overlay_color", v)} />
            <Field label={`Overlay strength (${draft.background_overlay_opacity}%)`}>
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
            rows={8}
            spellCheck={false}
            className="font-mono text-xs"
            placeholder={"header { box-shadow: 0 2px 20px rgb(0 0 0 / .3); }\nfooter { border-top-width: 3px; }"}
          />
          <p className="text-[11px] text-muted-foreground">
            Applies to every page this theme covers (never the admin panel). It isn't shown in the preview, since it
            would restyle this admin page too — check it on the site after saving.
          </p>
        </Section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Save theme
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
          <p className="text-xs text-muted-foreground">Visitors see changes on their next page load, within a minute.</p>
        </div>
      </form>

      <div className="xl:sticky xl:top-0 xl:self-start">
        <div className="overflow-hidden rounded-lg border">
          <p className="border-b bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
            Live preview — unsaved changes included
          </p>
          <SiteThemePreview draft={draft} />
        </div>
      </div>
    </div>
  );
};

/**
 * Themes for the public site: on everywhere or on chosen pages, always or for
 * a scheduled window. Applied by SiteThemeStyles in root.tsx.
 */
const AdminSiteThemes = () => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [preset, setPreset] = useState(THEME_PRESETS[0].key);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: themes, isLoading } = useQuery({
    queryKey: ["admin-site-themes"],
    queryFn: storyApi.getAdminSiteThemes,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-site-themes"] });
  const onError = (fallback: string) => (error: Error) => toast.error(error.message || fallback);

  const create = useMutation({
    mutationFn: () =>
      storyApi.createAdminSiteTheme({
        ...pickLook((THEME_PRESETS.find((option) => option.key === preset) ?? THEME_PRESETS[0]).values),
        name: name.trim(),
      }),
    onSuccess: (theme) => {
      toast.success("Site theme created — it's off until you choose when to show it");
      setName("");
      setEditingId(theme.id);
      refresh();
    },
    onError: onError("Could not create the theme."),
  });

  const toggle = useMutation({
    mutationFn: ({ id, on }: { id: number; on: boolean }) =>
      on ? storyApi.activateAdminSiteTheme(id) : storyApi.deactivateAdminSiteTheme(id),
    onSuccess: (theme, { on }) => {
      toast.success(on ? `“${theme.name}” is on — other themes were switched off` : `“${theme.name}” is off`);
      refresh();
    },
    onError: onError("Could not change the theme."),
  });

  const duplicate = useMutation({
    mutationFn: (id: number) => storyApi.duplicateAdminSiteTheme(id),
    onSuccess: (theme) => {
      toast.success("Theme duplicated (switched off)");
      setEditingId(theme.id);
      refresh();
    },
    onError: onError("Could not duplicate the theme."),
  });

  const remove = useMutation({
    mutationFn: (id: number) => storyApi.deleteAdminSiteTheme(id),
    onSuccess: (_result, id) => {
      toast.success("Theme deleted");
      if (editingId === id) setEditingId(null);
      refresh();
    },
    onError: onError("Could not delete the theme."),
  });

  const editing = themes?.find((theme) => theme.id === editingId);

  return (
    // The admin shell's content section is overflow-hidden, so every page owns
    // its own scroll area.
    <div className="h-full space-y-6 overflow-y-auto pr-1">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New site theme</CardTitle>
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
              <Label htmlFor="site-theme-name" className="text-xs">
                Name
              </Label>
              <Input id="site-theme-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Christmas 2026" className="mt-1" />
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
            New themes start switched off. Only one theme is on at a time — turning one on with its switch turns the
            others off. A theme with dates only shows between them.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Site themes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && (themes || []).length === 0 && (
            <p className="text-sm text-muted-foreground">No site themes yet — the site uses its normal look.</p>
          )}
          <ul className="space-y-3">
            {(themes || []).map((theme) => {
              const badge = STATUS_BADGE[theme.status];
              return (
                <li key={theme.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <ActiveSwitch
                        checked={theme.mode !== "off"}
                        disabled={toggle.isPending}
                        label={theme.mode !== "off" ? `Turn ${theme.name} off` : `Turn ${theme.name} on`}
                        onChange={(on) => toggle.mutate({ id: theme.id, on })}
                      />
                      <ThemeSwatches theme={theme} />
                      <div className="min-w-0 space-y-0.5">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          {theme.name}
                          <span className={`rounded-full px-2 py-0.5 text-[11px] ${badge.className}`}>{badge.label}</span>
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Globe className="h-3.5 w-3.5" /> {scopeSummary(theme)}
                        </p>
                        {theme.mode === "scheduled" && theme.starts_at && theme.ends_at && (
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {formatWhen(theme.starts_at)} → {formatWhen(theme.ends_at)}
                          </p>
                        )}
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
                          const showing = theme.status === "always" || theme.status === "live";
                          const warning = showing ? `“${theme.name}” is showing on the site now. Delete it?` : `Delete “${theme.name}”?`;
                          if (window.confirm(warning)) remove.mutate(theme.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {editing && editing.id === theme.id && <SiteThemeEditor theme={editing} onClose={() => setEditingId(null)} />}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSiteThemes;
