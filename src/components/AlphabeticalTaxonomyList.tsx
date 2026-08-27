import { Link } from "react-router";

interface TaxonomyItem {
  slug: string;
  name: string;
  stories_count: number;
}

interface AlphabeticalTaxonomyListProps {
  items: TaxonomyItem[];
  basePath: string; // e.g. "/tag" or "/theme" — item links become `${basePath}/${slug}`
  emptyLabel: string;
}

// Anything not starting with A-Z (numbers, punctuation, non-Latin) falls
// into one shared bucket rendered last, rather than one section per symbol.
const OTHER_GROUP = "#";

function groupByLetter(items: TaxonomyItem[]) {
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const groups = new Map<string, TaxonomyItem[]>();
  for (const item of sorted) {
    const first = item.name.trim().charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : OTHER_GROUP;
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter)!.push(item);
  }
  const letters = [...groups.keys()].filter((letter) => letter !== OTHER_GROUP).sort();
  if (groups.has(OTHER_GROUP)) letters.push(OTHER_GROUP);
  return letters.map((letter) => ({ letter, items: groups.get(letter) as TaxonomyItem[] }));
}

export default function AlphabeticalTaxonomyList({ items, basePath, emptyLabel }: AlphabeticalTaxonomyListProps) {
  if (!items.length) {
    return <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">{emptyLabel}</div>;
  }

  const groups = groupByLetter(items);

  return (
    <div className="space-y-10">
      {groups.map(({ letter, items: groupItems }) => (
        <section key={letter}>
          <h2 className="mb-3 text-lg font-bold text-primary">{letter}</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2.5 border-t pt-4">
            {groupItems.map((item) => (
              <Link
                key={item.slug}
                to={`${basePath}/${item.slug}`}
                className="text-sm text-foreground transition-colors hover:text-primary hover:underline"
              >
                {item.name} <span className="text-muted-foreground">({item.stories_count})</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
