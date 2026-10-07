import { useQuery } from "@tanstack/react-query";
import { data, redirect, useParams, useSearchParams } from "react-router";
import { storyApi } from "@/api/story";
import type { PublicPage, PublicPageBlock } from "@/api/types";
import FullScreenLoader from "@/components/FullScreenLoader";
import { PageBody, pageExcerpt } from "@/components/pages/PageBlocks";
import ThemedPage from "@/components/pages/ThemedPage";
import { themeFontsUrl } from "@/components/pages/pageTheme";
import { buildMeta, SITE_URL } from "@/lib/buildMeta";
import NotFound from "@/pages/NotFound";
import type { Route } from "./+types/DynamicPage";

// Admin-built pages at /pages/<slug>. Rendered on the server so search
// engines get the full content, a real 404 for unknown/unpublished pages, and
// a 301 when the page has moved to a new slug.
export async function loader({ params }: Route.LoaderArgs) {
  try {
    const page = await storyApi.getPage(params.slug!);
    if ("redirect" in page) throw redirect(page.redirect, 301);
    return page;
  } catch (error) {
    if (error instanceof Response) throw error;
    return data(null, { status: 404 });
  }
}

const structuredData = (page: PublicPage, description: string) => {
  const url = `${SITE_URL}${page.path}`;
  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebPage",
      "@id": url,
      url,
      name: page.meta_title || page.title,
      description,
      datePublished: page.published_at,
      dateModified: page.updated_at,
    },
  ];

  for (const block of page.blocks) {
    if ((block.type === "story_list" || block.type === "story_query") && block.stories?.length) {
      graph.push({
        "@type": "ItemList",
        name: block.config.heading || page.title,
        itemListElement: block.stories.map((story, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${SITE_URL}/story/${story.slug}`,
          name: story.title,
        })),
      });
    }
    if (block.type === "faq" && block.config.items.length) {
      graph.push({
        "@type": "FAQPage",
        mainEntity: block.config.items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      });
    }
  }

  return { "@context": "https://schema.org", "@graph": graph };
};

const firstBannerImage = (blocks: PublicPageBlock[]) => {
  const banner = blocks.find((block) => block.type === "banner");
  return banner?.type === "banner" ? banner.config.image : "";
};

export function meta({ data: page, location }: Route.MetaArgs) {
  if (!page) {
    return buildMeta({
      title: "Page Not Found | WorldStories",
      description: "The requested WorldStories page could not be found.",
      path: location.pathname,
      noIndex: true,
    });
  }
  const description = page.meta_description || pageExcerpt(page.blocks) || `${page.title} on WorldStories.`;
  // The theme's fonts go in the <head> with everything else, so they're
  // requested on first paint rather than after hydration.
  const fontsUrl = page.theme ? themeFontsUrl(page.theme) : null;
  const tags = buildMeta({
    title: page.meta_title || `${page.title} | WorldStories`,
    description,
    path: page.path,
    image: page.og_image || firstBannerImage(page.blocks) || null,
    noIndex: page.noindex,
    structuredData: structuredData(page, description),
  });
  return fontsUrl ? [...tags, { tagName: "link", rel: "stylesheet", href: fontsUrl }] : tags;
}

const PageView = ({ page }: { page: PublicPage }) => (
  <ThemedPage theme={page.theme} scope={`ws-page-theme-${page.theme?.id ?? "site"}`}>
    {page.is_preview && (
      <p className="tinted-chip rounded-md border [--tint:#f59e0b] px-3 py-2 text-sm">
        Preview — this page isn't live yet, so visitors and search engines can't see it.
      </p>
    )}
    <PageBody title={page.title} blocks={page.blocks} />
  </ThemedPage>
);

const DynamicPage = ({ loaderData }: Route.ComponentProps) => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  // Drafts can only be fetched with the admin's token, which lives in the
  // browser — so a preview of an unpublished page loads client-side.
  const wantsPreview = searchParams.get("preview") === "1" && !loaderData;
  const preview = useQuery({
    queryKey: ["page-preview", slug],
    queryFn: () => storyApi.getPage(slug!, true),
    enabled: wantsPreview,
    retry: false,
  });

  if (loaderData) return <PageView page={loaderData} />;
  if (wantsPreview && preview.isLoading) return <FullScreenLoader />;
  if (wantsPreview && preview.data && !("redirect" in preview.data)) return <PageView page={preview.data} />;
  return <NotFound />;
};

export default DynamicPage;
