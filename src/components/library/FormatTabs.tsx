import type { ComponentType } from "react";
import { LayoutGrid } from "lucide-react";
import type { LibraryFacets } from "@/api/types";
import { FORMAT_KEYS, type LibraryFormat } from "@/lib/libraryParams";
import { FORMAT_META } from "@/lib/storyFormats";

const countFor = (facets: LibraryFacets | undefined, value: string) =>
  facets?.formats.find((format) => format.value === value)?.count;

/**
 * All · Read · Listen · Read Along · Watch · Quick Read, each with its count
 * (under the other active filters). A real tablist: one tab selected, arrow-key
 * friendly buttons, scrolls sideways on a phone rather than wrapping.
 */
const FormatTabs = ({
  value,
  onChange,
  facets,
}: {
  value: LibraryFormat | "";
  onChange: (format: LibraryFormat | "") => void;
  facets: LibraryFacets | undefined;
}) => {
  const tabs: { key: LibraryFormat | ""; label: string; icon: ComponentType<{ className?: string }> }[] = [
    { key: "", label: "All", icon: LayoutGrid },
    ...FORMAT_KEYS.map((key) => ({ key, label: FORMAT_META[key].label, icon: FORMAT_META[key].icon })),
  ];

  return (
    <div role="tablist" aria-label="Format" className="-mx-3 flex gap-1 overflow-x-auto px-3 sm:mx-0 sm:px-0">
      {tabs.map(({ key, label, icon: Icon }) => {
        const selected = value === key;
        const count = countFor(facets, key === "" ? "all" : key);
        return (
          <button
            key={key || "all"}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(key)}
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {count !== undefined && (
              <span className={`text-xs ${selected ? "opacity-80" : "text-muted-foreground"}`}>{count.toLocaleString()}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default FormatTabs;
