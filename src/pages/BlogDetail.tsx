import AdSpace from "@/components/AdSpace";
import CoverImage from "@/components/CoverImage";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Card, CardContent } from "@/components/ui/card";
import { storyApi } from "@/api/story";
import { useBlog } from "@/hooks/useBlog";
import { buildMeta, SITE_URL } from "@/lib/buildMeta";
import { plainText } from "@/lib/plainText";
import { sanitizeBlogContent } from "@/lib/sanitizeHtml";
import { ArrowRight } from "lucide-react";
import { Link, data, useParams } from "react-router";
import type { Route } from "./+types/BlogDetail";

export async function loader({ params }: Route.LoaderArgs) {
  try {
    return await storyApi.getBlog(params.slug!);
  } catch {
    return data(null, { status: 404 });
  }
}

export function meta({ data: loaderData, params }: Route.MetaArgs) {
  if (!loaderData) {
    return buildMeta({
      title: "Post Not Found | WorldStories",
      description: "The requested blog post could not be found.",
      path: `/blog/${params.slug}`,
      noIndex: true,
    });
  }

  const blogPath = `/blog/${loaderData.slug}`;
  const plainContent = plainText(loaderData.content);
  const description = (loaderData.excerpt || plainContent).slice(0, 160);

  return buildMeta({
    title: `${loaderData.title} | WorldStories Blog`,
    description,
    path: blogPath,
    image: loaderData.cover_image,
    type: "article",
    article: {
      publishedTime: loaderData.published_at,
      modifiedTime: loaderData.updated_at,
      author: loaderData.author_name || undefined,
    },
    structuredData: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: loaderData.title,
      datePublished: loaderData.published_at,
      dateModified: loaderData.updated_at,
      author: loaderData.author_name ? { "@type": "Person", name: loaderData.author_name } : undefined,
      image: loaderData.cover_image || undefined,
      url: `${SITE_URL}${blogPath}`,
      articleBody: plainContent.slice(0, 5000),
    },
  });
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

const BlogDetail = ({ loaderData }: Route.ComponentProps) => {
  const { slug } = useParams();
  const { data: blog, isLoading, isError } = useBlog(slug!, loaderData || undefined);

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (isError || !blog) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold">Post Not Found</h1>
        <p className="text-muted-foreground">This blog post doesn't exist or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="relative mb-6 aspect-video overflow-hidden rounded-lg shadow-md">
        <CoverImage src={blog.cover_image} alt={blog.title} className="h-full w-full object-cover" />
      </div>

      <h1 className="mb-3 text-3xl font-bold">{blog.title}</h1>
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        {blog.author_name && <span>{blog.author_name}</span>}
        {blog.author_name && <span aria-hidden="true">&middot;</span>}
        <span suppressHydrationWarning>{formatDate(blog.published_at)}</span>
      </div>

      <AdSpace size="banner" className="mb-8" />

      <div
        className="prose prose-sm md:prose-base max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: sanitizeBlogContent(blog.content) }}
      />

      <AdSpace size="rectangle" className="my-8" />

      {blog.linked_story && (
        <Card className="mt-8">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-20 w-16 shrink-0 overflow-hidden rounded-md">
              <CoverImage
                src={blog.linked_story.cover_image}
                alt={blog.linked_story.title}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Continue reading the full story</p>
              <p className="truncate font-semibold">{blog.linked_story.title}</p>
            </div>
            <Link
              to={`/story/${blog.linked_story.slug}`}
              className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Read Story <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BlogDetail;
