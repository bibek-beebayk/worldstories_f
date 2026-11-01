import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { storyApi } from "@/api/story";
import type {
  AdminHomeSection,
  AdminHomeSectionInput,
  HomeSectionConfig,
  HomeSectionTypesMeta,
} from "@/api/types";
import { FeaturedStoryPickerModal } from "@/components/admin/FeaturedStoryPickerModal";
import { sectionIcon } from "@/components/home/sectionIcons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";

type Draft = AdminHomeSectionInput & { stories_detail: { id: number; title: string }[] };

const NONE = "none";

const LABELS: Record<string, string> = {
  newest: "Newest published",
  recently_added: "Recently added",
  popular: "Most viewed",
  top_rated: "Top rated",
};

const blankDraft = (type: AdminHomeSection["section_type"] = "stories_query"): Draft => ({
  title: "",
  subtitle: "",
  section_type: type,
  variant: "standard",
  is_enabled: true,
  icon: "",
  layout: "grid",
  columns_mobile: 2,
  columns_desktop: 4,
  card_style: "default",
  item_limit: 6,
  allow_repeats: false,
  show_see_all: true,
  see_all_label: "",
  see_all_url: "",
  config: type === "stories_query" ? { sort: "newest" } : {},
  stories_detail: [],
});

const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

const Check = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex cursor-pointer items-center gap-2 text-sm">
    <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />
    {label}
  </label>
);

function Pick<T extends string>({
  value,
  onChange,
  options,
  allowNone,
}: {
  value: T | "";
  onChange: (v: T | "") => void;
  options: { value: T; label: string }[];
  allowNone?: string;
}) {
  return (
    <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : (v as T))}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value={NONE}>{allowNone}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Toggle chips for choosing any number of taxonomy values. */
function Chips<T extends string | number>({
  options,
  selected,
  onChange,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (v: T[]) => void;
}) {
  if (options.length === 0) return <p className="text-xs text-muted-foreground">None created yet.</p>;
  return (
    <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? selected.filter((x) => x !== o.value) : [...selected, o.value])}
            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
              on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const SectionEditor = ({
  meta,
  initial,
  editingId,
  onClose,
}: {
  meta: HomeSectionTypesMeta;
  initial: Draft;
  editingId: number | null;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(initial);
  const [pickerOpen, setPickerOpen] = useState(false);
  const typeMeta = meta.types.find((t) => t.value === draft.section_type);
  const has = (field: string) => typeMeta?.fields.includes(field) ?? false;
  const config = draft.config;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setConfig = (patch: Partial<HomeSectionConfig>) => setDraft((d) => ({ ...d, config: { ...d.config, ...patch } }));

  const needsTaxonomy = draft.section_type === "stories_query";
  const needsVideoTypes = draft.section_type === "videos";
  const taxonomy = useQuery({
    queryKey: ["admin-home-section-taxonomy"],
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
  const videoTypes = useQuery({
    queryKey: ["admin-video-types"],
    queryFn: storyApi.getAdminVideoTypes,
    enabled: needsVideoTypes,
  });

  const save = useMutation({
    mutationFn: () => {
      const { stories_detail: _ignored, ...payload } = draft;
      return editingId
        ? storyApi.updateAdminHomeSection(editingId, payload)
        : storyApi.createAdminHomeSection(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-home-sections"] });
      toast.success(editingId ? "Section updated" : "Section created");
      onClose();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Could not save the section.";
      toast.error(message);
    },
  });

  const ids = config.story_ids ?? [];
  const move = (index: number, delta: number) => {
    const next = [...ids];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setConfig({ story_ids: next });
  };
  const titleOf = (id: number) => draft.stories_detail.find((s) => s.id === id)?.title ?? `Story #${id}`;

  const options = (rows: { id: number; name: string }[] | undefined) =>
    (rows ?? []).map((r) => ({ value: r.id, label: r.name }));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingId ? "Edit section" : "New section"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Section type">
            <Pick
              value={draft.section_type}
              onChange={(v) =>
                v && setDraft({ ...blankDraft(v), title: draft.title, subtitle: draft.subtitle, is_enabled: draft.is_enabled })
              }
              options={meta.types.map((t) => ({ value: t.value, label: t.label }))}
            />
          </Field>
          <Field label="Title">
            <Input value={draft.title} onChange={(e) => set("title", e.target.value)} maxLength={120} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Subtitle (optional)">
              <Input value={draft.subtitle} onChange={(e) => set("subtitle", e.target.value)} maxLength={300} />
            </Field>
          </div>

          {has("icon") && (
            <Field label="Icon">
              <Pick
                value={draft.icon}
                onChange={(v) => set("icon", v)}
                allowNone="No icon"
                options={meta.icons.map((i) => ({ value: i, label: i }))}
              />
            </Field>
          )}
          {has("variant") && (
            <Field label="Look">
              <Pick
                value={draft.variant}
                onChange={(v) => v && set("variant", v)}
                options={meta.variants}
              />
            </Field>
          )}
        </div>

        {(has("layout") || has("item_limit")) && (
          <div className="grid gap-4 sm:grid-cols-3">
            {has("layout") && (
              <Field label="Layout">
                <Pick value={draft.layout} onChange={(v) => v && set("layout", v)} options={meta.layouts} />
              </Field>
            )}
            {has("item_limit") && (
              <Field label="Items to show" hint="1–24">
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={draft.item_limit}
                  onChange={(e) => set("item_limit", Math.max(1, Math.min(24, Number(e.target.value) || 1)))}
                />
              </Field>
            )}
            {has("card_style") && (
              <Field label="Card size">
                <Pick value={draft.card_style} onChange={(v) => v && set("card_style", v)} options={meta.card_styles} />
              </Field>
            )}
            {has("layout") && (
              <>
                <Field label="Columns on phones">
                  <Pick
                    value={String(draft.columns_mobile)}
                    onChange={(v) => v && set("columns_mobile", Number(v))}
                    options={["1", "2", "3"].map((n) => ({ value: n, label: n }))}
                  />
                </Field>
                <Field label="Columns on desktop">
                  <Pick
                    value={String(draft.columns_desktop)}
                    onChange={(v) => v && set("columns_desktop", Number(v))}
                    options={["2", "3", "4", "5", "6"].map((n) => ({ value: n, label: n }))}
                  />
                </Field>
              </>
            )}
          </div>
        )}

        {has("filters") && (
          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-medium">Which stories</p>
            <Field label="Sort by">
              <Pick
                value={config.sort ?? "newest"}
                onChange={(v) => v && setConfig({ sort: v })}
                options={meta.sorts.map((s) => ({ value: s, label: LABELS[s] ?? s }))}
              />
            </Field>
            {taxonomy.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {taxonomy.data && (
              <>
                <Field label="Genres (any of)">
                  <Chips options={options(taxonomy.data.genres)} selected={config.genres ?? []} onChange={(v) => setConfig({ genres: v })} />
                </Field>
                <Field label="Categories (any of)">
                  <Chips options={options(taxonomy.data.categories)} selected={config.categories ?? []} onChange={(v) => setConfig({ categories: v })} />
                </Field>
                <Field label="Tags (any of)">
                  <Chips options={options(taxonomy.data.tags)} selected={config.tags ?? []} onChange={(v) => setConfig({ tags: v })} />
                </Field>
                <Field label="Themes (any of)">
                  <Chips options={options(taxonomy.data.themes)} selected={config.themes ?? []} onChange={(v) => setConfig({ themes: v })} />
                </Field>
                <Field label="Moods (any of)">
                  <Chips
                    options={taxonomy.data.moods.map((m) => ({ value: m.slug, label: m.name }))}
                    selected={config.moods ?? []}
                    onChange={(v) => setConfig({ moods: v })}
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Story type">
                    <Select
                      value={config.story_type ? String(config.story_type) : NONE}
                      onValueChange={(v) => setConfig({ story_type: v === NONE ? null : Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Any</SelectItem>
                        {taxonomy.data.storyTypes.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Language code" hint="e.g. en or ne — blank for all">
                    <Input value={config.language ?? ""} maxLength={10} onChange={(e) => setConfig({ language: e.target.value.trim() })} />
                  </Field>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Check label="WorldStories Originals only" checked={!!config.original_only} onChange={(v) => setConfig({ original_only: v })} />
              <Check label="Has a summary (quick read)" checked={!!config.has_summary} onChange={(v) => setConfig({ has_summary: v })} />
              <Check label="Has audio" checked={!!config.has_audio} onChange={(v) => setConfig({ has_audio: v })} />
              <Check label="Has video" checked={!!config.has_video} onChange={(v) => setConfig({ has_video: v })} />
              <Check label="Has read-along" checked={!!config.has_read_along} onChange={(v) => setConfig({ has_read_along: v })} />
            </div>
          </div>
        )}

        {has("story_ids") && (
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Picked stories ({ids.length}/48)</p>
              <Button type="button" size="sm" variant="outline" onClick={() => setPickerOpen(true)} disabled={ids.length >= 48}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add story
              </Button>
            </div>
            {ids.length === 0 && <p className="text-xs text-muted-foreground">No stories picked yet.</p>}
            {ids.map((id, index) => (
              <div key={id} className="flex items-center gap-2 rounded border px-2 py-1 text-sm">
                <span className="w-5 text-xs text-muted-foreground">{index + 1}</span>
                <span className="flex-1 truncate">{titleOf(id)}</span>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(index, -1)} disabled={index === 0}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(index, 1)} disabled={index === ids.length - 1}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setConfig({ story_ids: ids.filter((x) => x !== id) })}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <FeaturedStoryPickerModal
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
              excludeIds={ids}
              onSelect={(story) => {
                setDraft((d) => ({
                  ...d,
                  config: { ...d.config, story_ids: [...(d.config.story_ids ?? []), story.id] },
                  stories_detail: [...d.stories_detail, { id: story.id, title: story.title }],
                }));
                setPickerOpen(false);
              }}
            />
          </div>
        )}

        {has("video_filters") && (
          <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
            <Field label="Video type">
              <Select
                value={config.video_type ? String(config.video_type) : NONE}
                onValueChange={(v) => setConfig({ video_type: v === NONE ? null : Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>All types</SelectItem>
                  {(videoTypes.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-end">
              <Check label="Only videos not linked to a story" checked={!!config.standalone_only} onChange={(v) => setConfig({ standalone_only: v })} />
            </div>
          </div>
        )}

        {has("banner") && (
          <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-3">
            <Field label="Button text">
              <Input value={config.button_label ?? ""} maxLength={40} onChange={(e) => setConfig({ button_label: e.target.value })} />
            </Field>
            <Field label="Button link" hint="/story-map or https://…">
              <Input value={config.button_url ?? ""} maxLength={300} onChange={(e) => setConfig({ button_url: e.target.value })} />
            </Field>
            <Field label="Colour">
              <Pick
                value={config.theme ?? "ocean"}
                onChange={(v) => v && setConfig({ theme: v })}
                options={meta.banner_themes.map((t) => ({ value: t, label: t }))}
              />
            </Field>
          </div>
        )}

        {has("ad_size") && (
          <Field label="Ad size">
            <Pick
              value={config.ad_size ?? "banner"}
              onChange={(v) => v && setConfig({ ad_size: v })}
              options={meta.ad_sizes.map((s) => ({ value: s, label: s }))}
            />
          </Field>
        )}

        <div className="space-y-3 border-t pt-3">
          {has("allow_repeats") && (
            <Check
              label="Allow stories already shown in sections above"
              checked={draft.allow_repeats}
              onChange={(v) => set("allow_repeats", v)}
            />
          )}
          {has("see_all") && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-end">
                <Check label={'Show "See all" link'} checked={draft.show_see_all} onChange={(v) => set("show_see_all", v)} />
              </div>
              {draft.show_see_all && (
                <>
                  <Field label="Link text" hint="Default: See all">
                    <Input value={draft.see_all_label} maxLength={40} onChange={(e) => set("see_all_label", e.target.value)} />
                  </Field>
                  <Field label="Link to" hint="Blank = automatic from the filters">
                    <Input value={draft.see_all_url} maxLength={300} onChange={(e) => set("see_all_url", e.target.value)} />
                  </Field>
                </>
              )}
            </div>
          )}
          <Check label="Show on the homepage" checked={draft.is_enabled} onChange={(v) => set("is_enabled", v)} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save section
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AdminHomeSections = () => {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<{ draft: Draft; id: number | null } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminHomeSection | null>(null);

  const { data: sections, isLoading } = useQuery({
    queryKey: ["admin-home-sections"],
    queryFn: storyApi.getAdminHomeSections,
  });
  const { data: meta } = useQuery({
    queryKey: ["admin-home-section-types"],
    queryFn: storyApi.getAdminHomeSectionTypes,
    staleTime: Infinity,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-home-sections"] });
  const onError = (error: unknown) => toast.error(error instanceof Error ? error.message : "Something went wrong.");

  const toggle = useMutation({ mutationFn: storyApi.toggleAdminHomeSection, onSuccess: refresh, onError });
  const duplicate = useMutation({
    mutationFn: storyApi.duplicateAdminHomeSection,
    onSuccess: () => {
      void refresh();
      toast.success("Duplicated — the copy is hidden until you enable it");
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: storyApi.deleteAdminHomeSection,
    onSuccess: () => {
      void refresh();
      setPendingDelete(null);
      toast.success("Section deleted");
    },
    onError,
  });
  const reorder = useMutation({
    mutationFn: storyApi.reorderAdminHomeSections,
    onSuccess: (rows) => queryClient.setQueryData(["admin-home-sections"], rows),
    onError,
  });

  const move = (index: number, delta: number) => {
    if (!sections) return;
    const ids = sections.map((s) => s.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids);
  };

  const typeLabel = (type: string) => meta?.types.find((t) => t.value === type)?.label ?? type;

  return (
    <div className="h-full space-y-4 overflow-y-auto pr-1">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Homepage sections</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Everything below the hero and Featured Stories, top to bottom. Changes appear on the site within about a
              minute.
            </p>
          </div>
          <Button onClick={() => meta && setEditor({ draft: blankDraft(), id: null })} disabled={!meta}>
            <Plus className="mr-1 h-4 w-4" /> Add section
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          {sections?.length === 0 && (
            <p className="text-sm text-muted-foreground">No sections yet — the homepage body is empty.</p>
          )}
          {sections?.map((section, index) => {
            const Icon = sectionIcon(section.icon);
            return (
              <div
                key={section.id}
                className={`flex flex-wrap items-center gap-2 rounded-md border p-2.5 ${section.is_enabled ? "" : "bg-muted/40 opacity-70"}`}
              >
                <div className="flex flex-col">
                  <Button size="icon" variant="ghost" className="h-6 w-6" disabled={index === 0 || reorder.isPending} onClick={() => move(index, -1)} aria-label="Move up">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" disabled={index === sections.length - 1 || reorder.isPending} onClick={() => move(index, 1)} aria-label="Move down">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <span className="w-6 text-center text-xs text-muted-foreground">{index + 1}</span>
                {Icon && <Icon className="h-4 w-4 shrink-0 text-primary" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{section.title || typeLabel(section.section_type)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {typeLabel(section.section_type)}
                    {meta?.types.find((t) => t.value === section.section_type)?.content &&
                      ` · ${section.item_limit} items · ${section.layout}`}
                  </p>
                </div>
                {!section.is_enabled && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Hidden</span>
                )}
                <Button size="icon" variant="ghost" title={section.is_enabled ? "Hide" : "Show"} onClick={() => toggle.mutate(section.id)}>
                  {section.is_enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" title="Edit" onClick={() => setEditor({ draft: { ...section }, id: section.id })}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" title="Duplicate" onClick={() => duplicate.mutate(section.id)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" title="Delete" onClick={() => setPendingDelete(section)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {editor && meta && (
        <SectionEditor
          key={editor.id ?? "new"}
          meta={meta}
          initial={editor.draft}
          editingId={editor.id}
          onClose={() => setEditor(null)}
        />
      )}

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this section?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            "{pendingDelete?.title || "Untitled"}" will be removed from the homepage. To keep it for later, hide it
            instead.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => pendingDelete && remove.mutate(pendingDelete.id)}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminHomeSections;
