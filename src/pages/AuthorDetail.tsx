import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen } from "lucide-react";
import { data, Link, redirect, useParams } from "react-router";
import { storyApi } from "@/api/story";
import AuthorPortrait from "@/components/AuthorPortrait";
import FullScreenLoader from "@/components/FullScreenLoader";
import { buildMeta, SITE_URL } from "@/lib/buildMeta";
import StoryCard from "@/components/StoryCard";
import type { Route } from "./+types/AuthorDetail";

export async function loader({ params }: Route.LoaderArgs) {
  const identifier = params.slug || "";
  try {
    const author = await storyApi.getAuthor(identifier);
    if (/^\d+$/.test(identifier)) throw redirect(`/authors/${author.slug}`, 301);
    return author;
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("[SSR loader] request failed:", error);
    return data(null, { status: 404 });
  }
}

export function meta({ data: author, params }: Route.MetaArgs) {
  if (!author) return buildMeta({ title: "Author Not Found | WorldStories", description: "The requested author could not be found.", path: `/authors/${params.slug || ""}`, noIndex: true });
  const description = author.bio?.trim() || `Explore stories by ${author.name} on WorldStories.`;
  return buildMeta({ title: `${author.name} — Author | WorldStories`, description: description.slice(0, 160), path: `/authors/${author.slug}`, image: author.image, structuredData: { "@context": "https://schema.org", "@type": "Person", name: author.name, description, image: author.image || undefined, url: `${SITE_URL}/authors/${author.slug}`, mainEntityOfPage: author.stories.map((story) => `${SITE_URL}/story/${story.slug}`) } });
}

export default function AuthorDetail({ loaderData }: Route.ComponentProps) {
  const { slug = "" } = useParams();
  const { data: author, isLoading, isError } = useQuery({ queryKey: ["author", slug], queryFn: () => storyApi.getAuthor(slug), enabled: Boolean(slug), retry: false, initialData: loaderData || undefined });
  if (isLoading) return <FullScreenLoader />;
  if (isError || !author) return <div className="container mx-auto px-4 py-16 text-center"><h1 className="font-serif text-2xl font-semibold">Author not found</h1><Link to="/authors" className="mt-4 inline-flex min-h-11 items-center gap-1 text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Browse all authors</Link></div>;
  const details = [author.years_label, author.country_label].filter(Boolean).join(" · ");

  return <div className="min-h-screen bg-muted/20"><main className="container mx-auto px-4 py-7 sm:py-10"><Link to="/authors" className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> All authors</Link><section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8"><div className="grid gap-7 sm:grid-cols-[180px_1fr] sm:items-start lg:grid-cols-[220px_1fr]"><AuthorPortrait src={author.image} name={author.name} className="mx-auto aspect-square w-40 rounded-xl sm:mx-0 sm:w-full" /><div className="text-center sm:text-left"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Author</p><h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">{author.name}</h1>{details && <p className="mt-3 text-sm text-muted-foreground">{details}</p>}{author.known_for && <p className="mt-3 text-sm">Known for <em>{author.known_for}</em></p>}<p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium"><BookOpen className="h-4 w-4 text-primary" />{author.titles_count} {author.titles_count === 1 ? "available title" : "available titles"}</p><div className="mx-auto mt-5 max-w-3xl whitespace-pre-line text-sm leading-7 text-muted-foreground sm:mx-0 sm:text-base">{author.bio?.trim() || "No biography is available for this author yet."}</div></div></div></section><section className="py-10"><h2 className="mb-5 font-serif text-2xl font-semibold">Stories by {author.name}</h2>{author.stories.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{author.stories.map((story) => <StoryCard key={story.id} {...story} />)}</div> : <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">No published stories are available from this author.</div>}</section></main></div>;
}
