import type { ReactNode } from "react";
import { PAGE_FONT_NAMES } from "@/components/pages/pageTheme";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ThemeLookValues } from "@/api/types";

// Form pieces shared by the page-theme and site-theme editors.

export const Field = ({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

export const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <fieldset className="space-y-3 rounded-md border p-4">
    <legend className="px-1 text-sm font-semibold">{title}</legend>
    {children}
  </fieldset>
);

export const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
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

const SITE_FONT = "__site__"; // Radix Select can't use "" as an item value.

export const FontSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <Select value={value || SITE_FONT} onValueChange={(v) => onChange(v === SITE_FONT ? "" : v)}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={SITE_FONT}>Site default</SelectItem>
      {PAGE_FONT_NAMES.map((name) => (
        <SelectItem key={name} value={name}>
          {name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const COLOR_FIELDS: { key: keyof ThemeLookValues; label: string }[] = [
  { key: "background_color", label: "Page background" },
  { key: "surface_color", label: "Cards & panels" },
  { key: "text_color", label: "Text" },
  { key: "muted_text_color", label: "Secondary text" },
  { key: "heading_color", label: "Headings" },
  { key: "primary_color", label: "Accent (buttons, links)" },
  { key: "primary_text_color", label: "Text on accent" },
  { key: "border_color", label: "Borders" },
];

/** The colour swatch strip shown beside a theme in a list. */
export const ThemeSwatches = ({ theme }: { theme: ThemeLookValues }) => (
  <span className="flex shrink-0 overflow-hidden rounded-md border">
    {[theme.background_color, theme.surface_color, theme.heading_color, theme.primary_color].map((color, index) => (
      <span key={index} className="h-6 w-5" style={{ backgroundColor: color }} />
    ))}
  </span>
);
