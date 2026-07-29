import type { Context } from "@netlify/edge-functions";

// Link-preview scrapers (Facebook, X/Twitter, Slack, Discord, iMessage, etc.) and several
// search crawlers fetch raw HTML without executing JavaScript, so they only ever see the
// generic homepage meta tags baked into index.html. This function intercepts just those
// bots on story pages, fetches the real story from the API, and rewrites the response HTML
// with the story's own title/description/image before it reaches the bot.
const BOT_PATTERN =
  /facebookexternalhit|Facebot|Twitterbot|Slackbot|Slack-ImgProxy|Discordbot|WhatsApp|TelegramBot|LinkedInBot|Pinterest|redditbot|SkypeUriPreview|Applebot|Googlebot|bingbot|DuckDuckBot|YandexBot|W3C_Validator|vkShare/i;

function getSiteUrl(): string {
  return (Netlify.env.get("SITE_URL") || "https://worldstories.net").replace(/\/+$/, "");
}

function getApiBaseUrl(): string {
  return (
    Netlify.env.get("API_BASE_URL") || "https://worldstories-b-production.up.railway.app/api"
  ).replace(/\/+$/, "");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

interface StoryGenre {
  name: string;
}

interface StoryAuthor {
  name: string;
}

interface StoryPayload {
  title: string;
  about?: string | null;
  author?: StoryAuthor | null;
  cover_image?: string | null;
  genres?: StoryGenre[];
  published_date?: string | null;
  has_audio?: boolean;
}

export function injectStoryMeta(
  html: string,
  params: {
    title: string;
    description: string;
    image: string;
    canonicalUrl: string;
    structuredData: Record<string, unknown>;
  }
): string {
  const safeTitle = escapeAttr(params.title);
  const safeDescription = escapeAttr(params.description);
  const safeImage = escapeAttr(params.image);
  const safeCanonical = escapeAttr(params.canonicalUrl);
  const jsonLd = JSON.stringify(params.structuredData).replace(/</g, "\\u003c");

  return html
    .replace(/<title>.*?<\/title>/s, `<title>${safeTitle}</title>`)
    .replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${safeDescription}" />`)
    .replace(/<link rel="canonical" href=".*?"\s*\/?>/, `<link rel="canonical" href="${safeCanonical}" />`)
    .replace(/<meta property="og:title" content=".*?"\s*\/?>/, `<meta property="og:title" content="${safeTitle}" />`)
    .replace(/<meta property="og:description" content=".*?"\s*\/?>/, `<meta property="og:description" content="${safeDescription}" />`)
    .replace(/<meta property="og:type" content=".*?"\s*\/?>/, `<meta property="og:type" content="book" />`)
    .replace(/<meta property="og:url" content=".*?"\s*\/?>/, `<meta property="og:url" content="${safeCanonical}" />`)
    .replace(/<meta property="og:image" content=".*?"\s*\/?>/, `<meta property="og:image" content="${safeImage}" />`)
    .replace(/<meta name="twitter:title" content=".*?"\s*\/?>/, `<meta name="twitter:title" content="${safeTitle}" />`)
    .replace(/<meta name="twitter:description" content=".*?"\s*\/?>/, `<meta name="twitter:description" content="${safeDescription}" />`)
    .replace(/<meta name="twitter:image" content=".*?"\s*\/?>/, `<meta name="twitter:image" content="${safeImage}" />`)
    .replace("</head>", `<script type="application/ld+json">${jsonLd}</script></head>`);
}

export default async (request: Request, context: Context) => {
  const userAgent = request.headers.get("user-agent") || "";
  if (!BOT_PATTERN.test(userAgent)) {
    return context.next();
  }

  const url = new URL(request.url);
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 2 || segments[0] !== "story") {
    // Not the base story page (e.g. /story/:slug/pdf) — leave it to the normal SPA shell.
    return context.next();
  }
  const slug = segments[1];

  const response = await context.next();

  try {
    const apiRes = await fetch(`${getApiBaseUrl()}/stories/${slug}/`);
    if (!apiRes.ok) return response;
    const story: StoryPayload = await apiRes.json();

    const siteUrl = getSiteUrl();
    const canonicalUrl = `${siteUrl}/story/${slug}`;
    const title = `${story.title}${story.author?.name ? ` by ${story.author.name}` : ""} | WorldStories`;
    const description = stripHtml(story.about || `Read ${story.title} on WorldStories.`).slice(0, 160);
    const image = story.cover_image || `${siteUrl}/og-image.png`;

    const html = await response.text();
    const rewritten = injectStoryMeta(html, {
      title,
      description,
      image,
      canonicalUrl,
      structuredData: {
        "@context": "https://schema.org",
        "@type": story.has_audio ? ["CreativeWork", "Audiobook"] : "CreativeWork",
        name: story.title,
        description,
        url: canonicalUrl,
        image: story.cover_image || undefined,
        genre: (story.genres || []).map((genre) => genre.name),
        datePublished: story.published_date || undefined,
        author: story.author ? { "@type": "Person", name: story.author.name } : undefined,
      },
    });

    return new Response(rewritten, {
      status: response.status,
      headers: response.headers,
    });
  } catch {
    return response;
  }
};

export const config = { path: "/story/*" };
