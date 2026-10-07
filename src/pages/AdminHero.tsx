import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Copy, Loader2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { storyApi } from "@/api/story";
import type { AdminHeroTemplate, AdminHeroTemplateInput, HeroStatSource, HomeStats } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import HomeHero from "@/components/home/HomeHero";
import { HERO_TEMPLATE_PRESETS } from "@/components/home/heroTemplatePresets";
import { isoToLocalInput, localInputToIso } from "@/lib/datetimeLocal";
import {
  HERO_ICON_NAMES,
  HERO_PRESETS,
  heroConfigFromTemplate,
  heroIcon,
} from "@/components/home/heroPresets";

type Draft = AdminHeroTemplateInput;

const STAT_SOURCES: { value: HeroStatSource; label: string }[] = [
  { value: "stories", label: "Live: published stories" },
  { value: "creators", label: "Live: creators" },
  { value: "readers", label: "Live: readers" },
  { value: "custom", label: "Custom value" },
];

// Used for the preview only when the live counts haven't loaded.
const SAMPLE_STATS: HomeStats = { stories: 1200, creators: 340, readers: 56000 };

const MAX_BACKGROUND_ICONS = 10;

const toDraft = ({ id: _id, is_default: _d, status: _s, updated_at: _u, ...draft }: AdminHeroTemplate): Draft =>
  draft;

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const STATUS_BADGE: Record<AdminHeroTemplate["status"], { label: string; className: string } | null> = {
  live: { label: "Showing now", className: "bg-emerald-100 text-emerald-700" },
  scheduled: { label: "Scheduled", className: "bg-sky-100 text-sky-700" },
  ended: { label: "Schedule ended", className: "bg-muted text-muted-foreground" },
  idle: null,
};

const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

const ColorField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
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

const IconSelect = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="w-full">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {HERO_ICON_NAMES.map((name) => {
        const Icon = heroIcon(name);
        return (
          <SelectItem key={name} value={name}>
            <span className="inline-flex items-center gap-2">
              <Icon className="h-4 w-4" /> {name}
            </span>
          </SelectItem>
        );
      })}
    </SelectContent>
  </Select>
);

const Section = ({
  title,
  children,
  shown,
  onShownChange,
}: {
  title: string;
  children: ReactNode;
  /** When given, the section gets a show/hide switch for its whole row on the homepage. */
  shown?: boolean;
  onShownChange?: (shown: boolean) => void;
}) => (
  <fieldset className="space-y-3 rounded-md border p-4">
    <legend className="flex items-center gap-3 px-1 text-sm font-semibold">
      {title}
      {onShownChange && (
        <label className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
          <Checkbox checked={shown} onCheckedChange={(checked) => onShownChange(checked === true)} />
          Show on homepage
        </label>
      )}
    </legend>
    {/* Hidden rows stay editable — their content is kept for when they're shown again. */}
    <div className={`space-y-3 ${shown === false ? "opacity-50" : ""}`}>{children}</div>
  </fieldset>
);

const HeroTemplateEditor = ({
  template,
  liveStats,
  onClose,
}: {
  template: AdminHeroTemplate;
  liveStats: HomeStats;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => toDraft(template));

  useEffect(() => {
    setDraft(toDraft(template));
  }, [template]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const preview = useMemo(() => heroConfigFromTemplate(draft, liveStats), [draft, liveStats]);
  const [presetKey, setPresetKey] = useState(HERO_TEMPLATE_PRESETS[0].key);

  // Fills the form only — the name and schedule are kept, and nothing is saved
  // until "Save template", so the preview shows the result first.
  const applyPreset = () => {
    const preset = HERO_TEMPLATE_PRESETS.find((option) => option.key === presetKey);
    if (!preset) return;
    if (!window.confirm(`Replace this template's content, colours and animation with the “${preset.label}” preset?`)) return;
    setDraft((current) => ({ ...current, ...preset.values }));
  };

  const save = useMutation({
    mutationFn: () => storyApi.updateAdminHeroTemplate(template.id, draft),
    onSuccess: () => {
      toast.success("Template saved");
      queryClient.invalidateQueries({ queryKey: ["admin-hero-templates"] });
      queryClient.invalidateQueries({ queryKey: ["home-data"] });
    },
    onError: (error: Error) => toast.error(error.message || "Could not save the template."),
  });

  const toggleBackgroundIcon = (name: string) => {
    const icons = draft.animation_icons;
    if (icons.includes(name)) {
      set("animation_icons", icons.filter((icon) => icon !== name));
    } else if (icons.length < MAX_BACKGROUND_ICONS) {
      set("animation_icons", [...icons, name]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border">
        <p className="border-b bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
          Live preview — unsaved changes included
        </p>
        <HomeHero hero={preview} />
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <Section title="Template">
          <Field label="Name" hint="Only shown here, e.g. “Halloween 2026”.">
            <Input value={draft.name} onChange={(event) => set("name", event.target.value)} maxLength={80} required />
          </Field>
          <Field label="Load a preset" hint="Replaces everything below except the schedule. Unsaved until you save.">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={presetKey} onValueChange={setPresetKey}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HERO_TEMPLATE_PRESETS.map((option) => (
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

        <Section title="Schedule">
          <p className="text-xs text-muted-foreground">
            Inside this window the template replaces the default one, then the default returns on its own. Leave both
            empty for no schedule. Times are in your local timezone; windows can't overlap.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Starts">
              <Input
                type="datetime-local"
                value={isoToLocalInput(draft.starts_at)}
                onChange={(event) => set("starts_at", localInputToIso(event.target.value))}
              />
            </Field>
            <Field label="Ends">
              <Input
                type="datetime-local"
                value={isoToLocalInput(draft.ends_at)}
                onChange={(event) => set("ends_at", localInputToIso(event.target.value))}
              />
            </Field>
          </div>
          {(draft.starts_at || draft.ends_at) && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDraft((current) => ({ ...current, starts_at: null, ends_at: null }))}
            >
              Clear schedule
            </Button>
          )}
        </Section>

        <Section title="Title">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="White part" hint="End it with a space for two words (“Spooky Stories”); leave none for a wordmark (“WorldStories”).">
              <Input value={draft.title_prefix} onChange={(event) => set("title_prefix", event.target.value)} maxLength={60} />
            </Field>
            <Field label="Gradient part">
              <Input
                value={draft.title_highlight}
                onChange={(event) => set("title_highlight", event.target.value)}
                maxLength={60}
              />
            </Field>
            <ColorField label="Gradient from" value={draft.title_highlight_from} onChange={(v) => set("title_highlight_from", v)} />
            <ColorField label="Gradient to" value={draft.title_highlight_to} onChange={(v) => set("title_highlight_to", v)} />
          </div>
        </Section>

        <Section title="Description">
          <Textarea
            value={draft.description}
            onChange={(event) => set("description", event.target.value)}
            maxLength={400}
            rows={3}
          />
        </Section>

        <Section title="Info lines" shown={draft.show_info_lines} onShownChange={(v) => set("show_info_lines", v)}>
          <p className="text-xs text-muted-foreground">Leave a line's text empty to hide just that line.</p>
          {([1, 2] as const).map((n) => (
            <div key={n} className="grid gap-3 sm:grid-cols-[200px_1fr]">
              <Field label={`Line ${n} icon`}>
                <IconSelect value={draft[`info_line_${n}_icon`]} onChange={(v) => set(`info_line_${n}_icon`, v)} />
              </Field>
              <Field label={`Line ${n} text`}>
                <Input
                  value={draft[`info_line_${n}_text`]}
                  onChange={(event) => set(`info_line_${n}_text`, event.target.value)}
                  maxLength={120}
                />
              </Field>
            </div>
          ))}
        </Section>

        <Section title="Stats" shown={draft.show_stats} onShownChange={(v) => set("show_stats", v)}>
          <p className="text-xs text-muted-foreground">
            Live stats show the real counts. Leave a stat's label empty to hide just that stat.
          </p>
          {([1, 2, 3] as const).map((n) => (
            <div key={n} className="grid gap-3 sm:grid-cols-3">
              <Field label={`Stat ${n} source`}>
                <Select
                  value={draft[`stat_${n}_source`]}
                  onValueChange={(v) => set(`stat_${n}_source`, v as HeroStatSource)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAT_SOURCES.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={`Stat ${n} value`}>
                <Input
                  value={draft[`stat_${n}_source`] === "custom" ? draft[`stat_${n}_value`] : "(live count)"}
                  disabled={draft[`stat_${n}_source`] !== "custom"}
                  onChange={(event) => set(`stat_${n}_value`, event.target.value)}
                  maxLength={20}
                />
              </Field>
              <Field label={`Stat ${n} label`}>
                <Input
                  value={draft[`stat_${n}_label`]}
                  onChange={(event) => set(`stat_${n}_label`, event.target.value)}
                  maxLength={40}
                />
              </Field>
            </div>
          ))}
        </Section>

        <Section title="Call to action">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Label">
              <Input value={draft.cta_label} onChange={(event) => set("cta_label", event.target.value)} maxLength={40} />
            </Field>
            <Field label="Link" hint="A site path like /library, or a full https:// URL (opens in a new tab).">
              <Input value={draft.cta_url} onChange={(event) => set("cta_url", event.target.value)} maxLength={300} />
            </Field>
            <ColorField label="Background from" value={draft.cta_bg_from} onChange={(v) => set("cta_bg_from", v)} />
            <ColorField label="Background to" value={draft.cta_bg_to} onChange={(v) => set("cta_bg_to", v)} />
            <ColorField label="Text colour" value={draft.cta_text_color} onChange={(v) => set("cta_text_color", v)} />
          </div>
        </Section>

        <Section title="Background">
          <div className="grid gap-3 sm:grid-cols-2">
            <ColorField label="Background colour" value={draft.background_color} onChange={(v) => set("background_color", v)} />
            <ColorField label="Glow colour" value={draft.accent_color} onChange={(v) => set("accent_color", v)} />
            <Field label="Background image URL" hint="Optional. Darkened automatically so the text stays readable.">
              <Input
                value={draft.background_image}
                onChange={(event) => set("background_image", event.target.value)}
                placeholder="https://…"
              />
            </Field>
            <Field label="Animation">
              <Select
                value={draft.animation_preset}
                onValueChange={(v) => set("animation_preset", v as Draft["animation_preset"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(HERO_PRESETS).map(([key, preset]) => (
                    <SelectItem key={key} value={key}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {draft.animation_preset !== "none" && (
            <div className="space-y-2">
              <Label className="text-xs">
                Floating icons{" "}
                <span className="font-normal text-muted-foreground">
                  — none selected uses the animation's own icons ({draft.animation_icons.length}/{MAX_BACKGROUND_ICONS})
                </span>
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {HERO_ICON_NAMES.map((name) => {
                  const Icon = heroIcon(name);
                  const selected = draft.animation_icons.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      aria-label={name}
                      aria-pressed={selected}
                      onClick={() => toggleBackgroundIcon(name)}
                      className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
                        selected ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Save template
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <p className="text-xs text-muted-foreground">The homepage picks up changes within a minute.</p>
        </div>
      </form>
    </div>
  );
};

/**
 * Homepage hero templates. One template is the default; any template can
 * also be scheduled, and replaces the default for that window.
 */
const AdminHero = () => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [preset, setPreset] = useState(HERO_TEMPLATE_PRESETS[0].key);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["admin-hero-templates"],
    queryFn: storyApi.getAdminHeroTemplates,
  });

  // Real counts for the preview's live stats.
  const { data: liveStats } = useQuery({
    queryKey: ["home-data"],
    queryFn: storyApi.getHomeData,
    select: (data) => data.sidebar.stats,
    staleTime: 5 * 60 * 1000,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-hero-templates"] });
    queryClient.invalidateQueries({ queryKey: ["home-data"] });
  };
  const onError = (fallback: string) => (error: Error) => toast.error(error.message || fallback);

  const create = useMutation({
    mutationFn: () =>
      storyApi.createAdminHeroTemplate({
        ...(HERO_TEMPLATE_PRESETS.find((option) => option.key === preset) ?? HERO_TEMPLATE_PRESETS[0]).values,
        name: name.trim(),
      }),
    onSuccess: (template) => {
      toast.success("Template created");
      setName("");
      setEditingId(template.id);
      refresh();
    },
    onError: onError("Could not create the template."),
  });

  const setDefault = useMutation({
    mutationFn: (id: number) => storyApi.setDefaultAdminHeroTemplate(id),
    onSuccess: (template) => {
      toast.success(`“${template.name}” is now the default`);
      refresh();
    },
    onError: onError("Could not change the default."),
  });

  const duplicate = useMutation({
    mutationFn: (id: number) => storyApi.duplicateAdminHeroTemplate(id),
    onSuccess: (template) => {
      toast.success("Template duplicated");
      setEditingId(template.id);
      refresh();
    },
    onError: onError("Could not duplicate the template."),
  });

  const remove = useMutation({
    mutationFn: (id: number) => storyApi.deleteAdminHeroTemplate(id),
    onSuccess: (_result, id) => {
      toast.success("Template deleted");
      if (editingId === id) setEditingId(null);
      refresh();
    },
    onError: onError("Could not delete the template."),
  });

  const editing = templates?.find((template) => template.id === editingId);
  const hasDefault = (templates || []).some((template) => template.is_default);

  return (
    // The admin shell's content section is overflow-hidden, so every page owns
    // its own scroll area.
    <div className="h-full space-y-6 overflow-y-auto pr-1">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New hero template</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim()) create.mutate();
            }}
          >
            <div className="min-w-[240px] flex-1">
              <Label htmlFor="hero-template-name" className="text-xs">
                Name
              </Label>
              <Input
                id="hero-template-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Halloween 2026"
                className="mt-1"
              />
            </div>
            <div className="w-52">
              <Label className="text-xs">Start from</Label>
              <Select value={preset} onValueChange={setPreset}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HERO_TEMPLATE_PRESETS.map((option) => (
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
            Presets fill in the content, colours and animation as a starting point — everything stays editable. New
            templates aren't shown until you make one the default or give it a schedule.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

          {!isLoading && !hasDefault && (
            <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No default template — outside scheduled windows the homepage shows the built-in hero.
            </p>
          )}

          {!isLoading && (templates || []).length === 0 && (
            <p className="text-sm text-muted-foreground">No templates yet.</p>
          )}

          <ul className="space-y-3">
            {(templates || []).map((template) => {
              const badge = STATUS_BADGE[template.status];
              return (
                <li key={template.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {template.name}
                        {template.is_default && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">Default</span>
                        )}
                        {badge && (
                          <span className={`rounded-full px-2 py-0.5 text-[11px] ${badge.className}`}>{badge.label}</span>
                        )}
                      </p>
                      {template.starts_at && template.ends_at && (
                        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {formatWhen(template.starts_at)} → {formatWhen(template.ends_at)}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId((current) => (current === template.id ? null : template.id))}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        {editingId === template.id ? "Close" : "Edit"}
                      </Button>
                      {!template.is_default && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={setDefault.isPending}
                          onClick={() => setDefault.mutate(template.id)}
                        >
                          <Star className="mr-1.5 h-3.5 w-3.5" />
                          Make default
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={duplicate.isPending}
                        onClick={() => duplicate.mutate(template.id)}
                        aria-label={`Duplicate ${template.name}`}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={remove.isPending}
                        aria-label={`Delete ${template.name}`}
                        onClick={() => {
                          const warning = template.is_default
                            ? `“${template.name}” is the default. Delete it anyway? The homepage will fall back to the built-in hero.`
                            : `Delete “${template.name}”?`;
                          if (window.confirm(warning)) remove.mutate(template.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {editing && editing.id === template.id && (
                    <div className="mt-4">
                      <HeroTemplateEditor
                        template={editing}
                        liveStats={liveStats ?? SAMPLE_STATS}
                        onClose={() => setEditingId(null)}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminHero;
