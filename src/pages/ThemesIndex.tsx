import { useQuery } from "@tanstack/react-query";
import { Palette } from "lucide-react";
import { storyApi } from "@/api/story";
import FullScreenLoader from "@/components/FullScreenLoader";
import AlphabeticalTaxonomyList from "@/components/AlphabeticalTaxonomyList";
import { buildMeta } from "@/lib/buildMeta";
import type { Route } from "./+types/ThemesIndex";

export function meta() {
  return buildMeta({
    title: "Themes — Browse by Theme | WorldStories",
    description: "Every story theme on WorldStories, A to Z.",
    path: "/themes",
  });
}

export async function loader() {
  try {
    return await storyApi.getThemes();
  } catch {
    return undefined;
  }
}

export default function ThemesIndex({ loaderData }: Route.ComponentProps) {
  const { data: themes, isLoading } = useQuery({
    queryKey: ["themes"],
    queryFn: storyApi.getThemes,
    initialData: loaderData,
  });

  if (isLoading && !themes) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.10),transparent_38%)]">
      <div className="border-b border-violet-200/60 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-sky-50">
        <div className="container mx-auto px-4 py-8 sm:py-10">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
            <Palette className="h-3.5 w-3.5" />
            Browse by theme
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Themes</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-700 sm:text-base">
            Every theme, A to Z. The number after each name is how many stories carry it.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 sm:py-10">
        <AlphabeticalTaxonomyList items={themes || []} basePath="/theme" emptyLabel="No themes yet." />
      </main>
    </div>
  );
}
