import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  ImageOff,
  LayoutTemplate,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { storyApi } from "@/api/story";
import type {
  AdminHomeSection,
  HomeSectionAnalytics,
  HomeSectionConfig,
  HomeSectionDisplay,
  HomeSectionTypesMeta,
} from "@/api/types";
import { FeaturedStoryPickerModal } from "@/components/admin/FeaturedStoryPickerModal";
import { AppearanceTab } from "@/components/admin/homeSections/AppearanceTab";
import { ContentSettings, validateHomeSectionDraft } from "@/components/admin/homeSections/ContentSettings";
import { LayoutTab } from "@/components/admin/homeSections/LayoutTab";
import { LivePreview } from "@/components/admin/homeSections/LivePreview";
import { TemplatePickerDialog } from "@/components/admin/homeSections/TemplatePickerDialog";
import { VisibilityTab } from "@/components/admin/homeSections/VisibilityTab";
import type { HomeSectionEditorDraft as Draft } from "@/components/admin/homeSections/types";
import { sectionIcon } from "@/components/home/sectionIcons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { DEFAULT_DISPLAY, normalizeDisplay } from "@/lib/homeDisplay";
import { audienceBadges } from "@/lib/homeSectionSchedule";

const NONE = "none";

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
  show_to: "all",
  starts_at: null,
  ends_at: null,
  device: "all",
  anchor_id: "",
  display: { ...DEFAULT_DISPLAY },
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
  const [draft, setDraft] = useState<Draft>(() => ({
    ...initial,
    device: initial.device ?? "all",
    anchor_id: initial.anchor_id ?? "",
    display: normalizeDisplay(initial.display),
  }));
  const [activeTab, setActiveTab] = useState<"content" | "layout" | "appearance" | "visibility">("content");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const typeMeta = meta.types.find((t) => t.value === draft.section_type);
  const has = (field: string) => typeMeta?.fields.includes(field) ?? false;
  const config = draft.config;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
  const setDisplay = (patch: Partial<HomeSectionDisplay>) => {
    setDraft((d) => ({ ...d, display: { ...normalizeDisplay(d.display), ...patch } }));
    setFieldErrors((prev) => {
      if (!("display" in prev)) return prev;
      const next = { ...prev };
      delete next.display;
      return next;
    });
  };
  const setConfig = (patch: Partial<HomeSectionConfig>) => {
    setDraft((d) => ({ ...d, config: { ...d.config, ...patch } }));
    setFieldErrors((prev) => {
      if (!("config" in prev)) return prev;
      const next = { ...prev };
      delete next.config;
      return next;
    });
  };

  const validationError = validateHomeSectionDraft(draft);
  const previewPayload = typeMeta?.content
    ? {
        section_type: draft.section_type,
        variant: draft.variant,
        item_limit: draft.item_limit,
        allow_repeats: draft.allow_repeats,
        config: draft.config,
        display: { show_summary: draft.display.show_summary },
      }
    : null;

  const LAYOUT_ERROR_FIELDS = ["layout", "card_style", "columns_mobile", "columns_desktop", "item_limit"] as const;
  const VISIBILITY_ERROR_FIELDS = ["device", "anchor_id", "starts_at", "ends_at", "show_to"] as const;
  const hasLayoutError = LAYOUT_ERROR_FIELDS.some((key) => Boolean(fieldErrors[key]));
  const hasAppearanceError = Boolean(fieldErrors.display);
  const hasVisibilityError = VISIBILITY_ERROR_FIELDS.some((key) => Boolean(fieldErrors[key]));
  const hasContentError = Boolean(fieldErrors.config);

  const save = useMutation({
    mutationFn: () => {
      const { stories_detail: _ignored, ...payload } = draft;
      return editingId ? storyApi.updateAdminHomeSection(editingId, payload) : storyApi.createAdminHomeSection(payload);
    },
    onSuccess: () => {
      setFieldErrors({});
      void queryClient.invalidateQueries({ queryKey: ["admin-home-sections"] });
      toast.success(editingId ? "Section updated" : "Section created");
      onClose();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Could not save the section.";
      const nextErrors: Record<string, string> = {};
      for (const field of [...LAYOUT_ERROR_FIELDS, ...VISIBILITY_ERROR_FIELDS, "display", "config", "title"]) {
        if (message.toLowerCase().includes(`${field}:`)) {
          nextErrors[field] = message;
        }
      }
      setFieldErrors(nextErrors);
      if (VISIBILITY_ERROR_FIELDS.some((k) => k in nextErrors)) {
        setActiveTab("visibility");
      } else if ("display" in nextErrors) {
        setActiveTab("appearance");
      } else if (LAYOUT_ERROR_FIELDS.some((k) => k in nextErrors)) {
        setActiveTab("layout");
      } else if ("config" in nextErrors) {
        setActiveTab("content");
      }
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

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{editingId ? "Edit section" : "New section"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Section type">
            <Pick
              value={draft.section_type}
              onChange={(v) => {
                if (!v) return;
                const nextType = meta.types.find((t) => t.value === v);
                const allowedLayouts = nextType?.layouts.map((l) => l.value) ?? [];
                const allowedStyles = nextType?.card_styles.map((s) => s.value) ?? [];
                const nextLayout = allowedLayouts.includes(draft.layout) ? draft.layout : (allowedLayouts[0] ?? "grid");
                const nextStyle = allowedStyles.includes(draft.card_style)
                  ? draft.card_style
                  : (allowedStyles[0] ?? "default");
                setFieldErrors({});
                setDraft({
                  ...blankDraft(v),
                  title: draft.title,
                  subtitle: draft.subtitle,
                  is_enabled: draft.is_enabled,
                  layout: nextLayout,
                  card_style: nextStyle,
                });
              }}
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
              <Pick value={draft.variant} onChange={(v) => v && set("variant", v)} options={meta.variants} />
            </Field>
          )}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "content" | "layout" | "appearance" | "visibility")}
        >
          <TabsList>
            <TabsTrigger value="content" className="gap-1.5">
              Content
              {hasContentError && <span className="h-2 w-2 rounded-full bg-destructive" aria-label="Has error" />}
            </TabsTrigger>
            {typeMeta?.content && (
              <TabsTrigger value="layout" className="gap-1.5">
                Layout
                {hasLayoutError && <span className="h-2 w-2 rounded-full bg-destructive" aria-label="Has error" />}
              </TabsTrigger>
            )}
            <TabsTrigger value="appearance" className="gap-1.5">
              Appearance
              {hasAppearanceError && <span className="h-2 w-2 rounded-full bg-destructive" aria-label="Has error" />}
            </TabsTrigger>
            <TabsTrigger value="visibility" className="gap-1.5">
              Visibility
              {hasVisibilityError && <span className="h-2 w-2 rounded-full bg-destructive" aria-label="Has error" />}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="content" className="space-y-4 pt-2">
            <ContentSettings
              draft={draft}
              meta={meta}
              setConfig={setConfig}
              setAllowRepeats={(allow_repeats) => set("allow_repeats", allow_repeats)}
            />

            {has("story_ids") && (
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Picked stories ({ids.length}/48)</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPickerOpen(true)}
                    disabled={ids.length >= 48}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add story
                  </Button>
                </div>
                {ids.length === 0 && <p className="text-xs text-muted-foreground">No stories picked yet.</p>}
                {ids.map((id, index) => (
                  <div key={id} className="flex items-center gap-2 rounded border px-2 py-1 text-sm">
                    <span className="w-5 text-xs text-muted-foreground">{index + 1}</span>
                    <span className="flex-1 truncate">{titleOf(id)}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => move(index, 1)}
                      disabled={index === ids.length - 1}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setConfig({ story_ids: ids.filter((x) => x !== id) })}
                    >
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

            {has("banner") && (
              <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-3">
                <Field label="Button text">
                  <Input
                    value={config.button_label ?? ""}
                    maxLength={40}
                    onChange={(e) => setConfig({ button_label: e.target.value })}
                  />
                </Field>
                <Field label="Button link" hint="/story-map or https://…">
                  <Input
                    value={config.button_url ?? ""}
                    maxLength={300}
                    onChange={(e) => setConfig({ button_url: e.target.value })}
                  />
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

            <LivePreview payload={previewPayload} validationError={validationError} />
          </TabsContent>
          {typeMeta?.content && (
            <TabsContent value="layout" className="space-y-4 pt-2">
              <LayoutTab
                draft={draft}
                meta={meta}
                previewPayload={previewPayload}
                validationError={validationError}
                fieldErrors={fieldErrors}
                onChange={set}
                onDisplayChange={setDisplay}
              />
            </TabsContent>
          )}
          <TabsContent value="appearance" className="space-y-4 pt-2">
            <AppearanceTab
              draft={draft}
              meta={meta}
              previewPayload={previewPayload}
              validationError={validationError}
              fieldError={fieldErrors.display}
              onDisplayChange={setDisplay}
            />
          </TabsContent>
          <TabsContent value="visibility" className="space-y-4 pt-2">
            <VisibilityTab draft={draft} meta={meta} fieldErrors={fieldErrors} onChange={set} />
          </TabsContent>
        </Tabs>

        <div className="space-y-3 border-t pt-3">
          {has("allow_repeats") && draft.section_type !== "stories_query" && (
            <Check
              label="Allow stories already shown in sections above"
              checked={draft.allow_repeats}
              onChange={(v) => set("allow_repeats", v)}
            />
          )}
          {has("see_all") && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-end">
                <Check
                  label={'Show "See all" link'}
                  checked={draft.show_see_all}
                  onChange={(v) => set("show_see_all", v)}
                />
              </div>
              {draft.show_see_all && (
                <>
                  <Field label="Link text" hint="Default: See all">
                    <Input
                      value={draft.see_all_label}
                      maxLength={40}
                      onChange={(e) => set("see_all_label", e.target.value)}
                    />
                  </Field>
                  <Field label="Link to" hint="Blank = automatic from the filters">
                    <Input
                      value={draft.see_all_url}
                      maxLength={300}
                      onChange={(e) => set("see_all_url", e.target.value)}
                    />
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
          <Button type="button" onClick={() => save.mutate()} disabled={save.isPending || validationError !== null}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save section
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const percent = (value: number | null) => (value === null ? "-" : `${(value * 100).toFixed(1)}%`);

/** Clicks and click-through (clicks / homepage visits) for the last 7 and 30 days. */
const SectionClicks = ({ stats, sectionId }: { stats: HomeSectionAnalytics | undefined; sectionId: number }) => {
  if (!stats) return null;
  const mine = stats.sections[String(sectionId)] ?? {};
  return (
    <div
      className="hidden shrink-0 gap-3 text-right text-[11px] leading-tight text-muted-foreground md:flex"
      title="Clicks on this section's items, and clicks divided by homepage visits. Audience only (staff and bots excluded)."
    >
      {[7, 30].map((days) => {
        const row = mine[String(days)];
        return (
          <div key={days}>
            <p className="font-medium text-foreground">{(row?.clicks ?? 0).toLocaleString()} clicks</p>
            <p>
              {percent(row?.click_through ?? (stats.visits[String(days)] ? 0 : null))} CTR · {days}d
            </p>
          </div>
        );
      })}
    </div>
  );
};

const AdminHomeSections = () => {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<{ draft: Draft; id: number | null } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminHomeSection | null>(null);
  const [coversOpen, setCoversOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const { data: sections, isLoading } = useQuery({
    queryKey: ["admin-home-sections"],
    queryFn: storyApi.getAdminHomeSections,
  });
  const { data: meta } = useQuery({
    queryKey: ["admin-home-section-types"],
    queryFn: storyApi.getAdminHomeSectionTypes,
    staleTime: Infinity,
  });

  const { data: clickStats } = useQuery({
    queryKey: ["admin-home-section-analytics"],
    queryFn: storyApi.getAdminHomeSectionAnalytics,
    staleTime: 60_000,
  });
  const covers = useQuery({
    queryKey: ["admin-home-missing-covers"],
    queryFn: storyApi.getAdminMissingCovers,
    enabled: coversOpen,
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
    <div className="h-full space-y-4 overflow-y-auto scrollbar-thin pr-1">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Homepage sections</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Everything below the hero and Featured Stories, top to bottom. Changes appear on the site within about a
              minute.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCoversOpen(true)}>
              <ImageOff className="mr-1 h-4 w-4" /> Missing covers
            </Button>
            <Button variant="outline" onClick={() => setTemplatesOpen(true)} disabled={!meta}>
              <LayoutTemplate className="mr-1 h-4 w-4" /> Add from template
            </Button>
            <Button onClick={() => meta && setEditor({ draft: blankDraft(), id: null })} disabled={!meta}>
              <Plus className="mr-1 h-4 w-4" /> Add section
            </Button>
          </div>
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
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    disabled={index === 0 || reorder.isPending}
                    onClick={() => move(index, -1)}
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    disabled={index === sections.length - 1 || reorder.isPending}
                    onClick={() => move(index, 1)}
                    aria-label="Move down"
                  >
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
                {audienceBadges(section).map((badge) => (
                  <span key={badge} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                    {badge}
                  </span>
                ))}
                <SectionClicks stats={clickStats} sectionId={section.id} />
                {!section.is_enabled && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Hidden</span>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  title={section.is_enabled ? "Hide" : "Show"}
                  onClick={() => toggle.mutate(section.id)}
                >
                  {section.is_enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  title="Edit"
                  onClick={() => setEditor({ draft: { ...section }, id: section.id })}
                >
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

      <TemplatePickerDialog
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onCreated={(section) =>
          setEditor({
            draft: {
              ...section,
              device: section.device ?? "all",
              anchor_id: section.anchor_id ?? "",
              display: normalizeDisplay(section.display),
            },
            id: section.id,
          })
        }
      />

      <Dialog open={coversOpen} onOpenChange={setCoversOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Published stories without a cover</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            These show a placeholder tile, and are skipped by any section set to "Only stories with a cover". Most
            viewed first.
          </p>
          {covers.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          {covers.data && covers.data.total === 0 && <p className="text-sm">Every published story has a cover.</p>}
          <ul className="space-y-1">
            {covers.data?.results.map((story) => (
              <li key={story.id} className="flex items-center justify-between gap-3 rounded border px-2 py-1 text-sm">
                <span className="truncate">{story.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{story.views.toLocaleString()} views</span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

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
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => pendingDelete && remove.mutate(pendingDelete.id)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminHomeSections;
