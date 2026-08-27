import { useQuery } from "@tanstack/react-query";
import { Tag as TagIcon } from "lucide-react";
import { storyApi } from "@/api/story";
import FullScreenLoader from "@/components/FullScreenLoader";
import AlphabeticalTaxonomyList from "@/components/AlphabeticalTaxonomyList";
import { buildMeta } from "@/lib/buildMeta";
import type { Route } from "./+types/TagsIndex";

export function meta() {
  return buildMeta({
    title: "Tags — Browse by Topic | WorldStories",
    description: "Every story tag on WorldStories, A to Z.",
    path: "/tags",
  });
}

export async function loader() {
  try {
    return await storyApi.getTags();
  } catch {
    return undefined;
  }
}

export default function TagsIndex({ loaderData }: Route.ComponentProps) {
  const { data: tags, isLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: storyApi.getTags,
    initialData: loaderData,
  });

  if (isLoading && !tags) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.10),transparent_38%)]">
      <div className="border-b border-violet-200/60 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-sky-50">
        <div className="container mx-auto px-4 py-8 sm:py-10">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
            <TagIcon className="h-3.5 w-3.5" />
            Browse by tag
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Tags</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-700 sm:text-base">
            Every tag, A to Z. The number after each name is how many stories carry it.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 sm:py-10">
        <AlphabeticalTaxonomyList items={tags || []} basePath="/tag" emptyLabel="No tags yet." />
      </main>
    </div>
  );
}
