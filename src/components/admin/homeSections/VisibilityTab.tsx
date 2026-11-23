import type { KeyboardEvent } from "react";
import type { HomeSectionDevice, HomeSectionShowTo, HomeSectionTypesMeta } from "@/api/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isoToLocalInput, localInputToIso } from "@/lib/datetimeLocal";
import { anchorHref } from "@/lib/homeDisplay";
import { SettingGroup } from "./controls";
import type { HomeSectionEditorDraft as Draft } from "./types";

const SHOW_TO_OPTIONS: { value: HomeSectionShowTo; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "signed_in", label: "Signed-in readers only" },
  { value: "signed_out", label: "Signed-out visitors only" },
];

const DEVICE_OPTIONS: { value: HomeSectionDevice; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mobile", label: "Phone only" },
  { value: "desktop", label: "Desktop only" },
];

interface VisibilityTabProps {
  draft: Draft;
  meta: HomeSectionTypesMeta;
  fieldErrors: Record<string, string>;
  onChange: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}

export function VisibilityTab({ draft, meta, fieldErrors, onChange }: VisibilityTabProps) {
  const showToOptions = meta.show_to ?? SHOW_TO_OPTIONS;
  const deviceOptions = meta.devices?.length
    ? meta.devices.map((d) => ({
        value: d.value,
        label: d.value === "all" ? "All" : d.label,
      }))
    : DEVICE_OPTIONS;
  const resolvedHref = anchorHref(draft.anchor_id);

  const handleDeviceKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    const current = Math.max(0, buttons.indexOf(document.activeElement as HTMLButtonElement));
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = (current + delta + buttons.length) % buttons.length;
    onChange("device", deviceOptions[next].value);
    buttons[next].focus();
  };

  return (
    <div className="space-y-4">
      <SettingGroup title="Audience and schedule">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Show to</Label>
            <Select value={draft.show_to} onValueChange={(v) => onChange("show_to", v as HomeSectionShowTo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {showToOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.show_to && <p className="text-xs text-destructive">{fieldErrors.show_to}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="section-starts-at" className="text-xs">
              Starts (optional)
            </Label>
            <Input
              id="section-starts-at"
              type="datetime-local"
              value={isoToLocalInput(draft.starts_at)}
              onChange={(e) => onChange("starts_at", localInputToIso(e.target.value))}
            />
            <p className="text-[11px] text-muted-foreground">Your local time</p>
            {fieldErrors.starts_at && <p className="text-xs text-destructive">{fieldErrors.starts_at}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="section-ends-at" className="text-xs">
              Ends (optional)
            </Label>
            <Input
              id="section-ends-at"
              type="datetime-local"
              value={isoToLocalInput(draft.ends_at)}
              onChange={(e) => onChange("ends_at", localInputToIso(e.target.value))}
            />
            <p className="text-[11px] text-muted-foreground">Hidden from this moment</p>
            {fieldErrors.ends_at && <p className="text-xs text-destructive">{fieldErrors.ends_at}</p>}
          </div>
        </div>
      </SettingGroup>

      <SettingGroup title="Device">
        <div
          role="radiogroup"
          aria-label="Visible devices"
          onKeyDown={handleDeviceKeyDown}
          className="inline-flex flex-wrap rounded-md border p-1"
        >
          {deviceOptions.map((option) => {
            const checked = draft.device === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                onClick={() => onChange("device", option.value)}
                className={`min-h-9 rounded px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  checked ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {fieldErrors.device && <p className="text-xs text-destructive">{fieldErrors.device}</p>}
      </SettingGroup>

      <SettingGroup title="Anchor link">
        <div className="max-w-md space-y-1.5">
          <Label htmlFor="section-anchor-id" className="text-xs">
            Anchor id (optional)
          </Label>
          <Input
            id="section-anchor-id"
            value={draft.anchor_id}
            maxLength={40}
            placeholder="e.g. quick-reads"
            onChange={(e) => {
              const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
              onChange("anchor_id", sanitized);
            }}
          />
          <p className="text-xs text-muted-foreground">Link straight to this section: {resolvedHref ?? "/#your-id"}</p>
          {fieldErrors.anchor_id && <p className="text-xs text-destructive">{fieldErrors.anchor_id}</p>}
        </div>
      </SettingGroup>
    </div>
  );
}
