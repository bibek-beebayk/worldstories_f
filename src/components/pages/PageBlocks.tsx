import { Link } from "react-router";
import { ArrowRight, ChevronDown } from "lucide-react";
import type { PageStoryLayout, PublicPageBlock, Story } from "@/api/types";
import StoryCard from "@/components/StoryCard";
import { Button } from "@/components/ui/button";
import { sanitizeBlogContent } from "@/lib/sanitizeHtml";

const isExternal = (url: string) => /^https?:\/\//.test(url);

/** A site path renders as a router Link, a full URL as a new-tab anchor. */
const SmartLink = ({ url, className, children }: { url: string; className?: string; children: React.ReactNode }) =>
  isExternal(url) ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <Link to={url} className={className}>
      {children}
    </Link>
  );

const StoryCollection = ({
  heading,
  stories,
  layout,
  seeAllUrl,
}: {
  heading: string;
  stories: Story[];
  layout: PageStoryLayout;
  seeAllUrl?: string | null;
}) => {
  if (stories.length === 0) return null;
  return (
    <section>
      {(heading || seeAllUrl) && (
        <div className="mb-5 flex items-center justify-between gap-3">
          {heading && <h2 className="ws-heading text-xl tracking-tight sm:text-2xl">{heading}</h2>}
          {seeAllUrl && (
            <Link to={seeAllUrl} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
              See all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}
      {layout === "rail" ? (
        <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-2 sm:-mx-4 sm:gap-4 sm:px-4">
          {stories.map((story) => (
            <div key={story.id} className="w-36 shrink-0 sm:w-44">
              <StoryCard {...story} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {stories.map((story) => (
            <StoryCard key={story.id} {...story} />
          ))}
        </div>
      )}
    </section>
  );
};

/**
 * One page block. `asPageHeading` makes a leading banner's heading the page's
 * single <h1> (the page title is not rendered separately in that case).
 */
export const PageBlock = ({ block, asPageHeading = false }: { block: PublicPageBlock; asPageHeading?: boolean }) => {
  switch (block.type) {
    case "rich_text":
      return (
        <div
          className="prose prose-lg max-w-3xl leading-8"
          // Sanitized on save by the backend, and again here.
          dangerouslySetInnerHTML={{ __html: sanitizeBlogContent(block.config.html) }}
        />
      );

    case "story_list":
      return <StoryCollection heading={block.config.heading} stories={block.stories ?? []} layout={block.config.layout} />;

    case "story_query":
      return (
        <StoryCollection
          heading={block.config.heading}
          stories={block.stories ?? []}
          layout={block.config.layout}
          seeAllUrl={block.see_all_url}
        />
      );

    case "banner": {
      const { heading, text, image, cta_label, cta_url, background_color } = block.config;
      const Heading = asPageHeading ? "h1" : "h2";
      return (
        <section
          className="relative overflow-hidden rounded-lg px-6 py-12 text-white sm:px-10 sm:py-16"
          style={{ backgroundColor: background_color }}
        >
          {image && (
            <>
              <img src={image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/55" />
            </>
          )}
          <div className="relative max-w-2xl space-y-4">
            {/* Not .ws-heading: banner text sits on the banner's own colour. */}
            <Heading className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl" style={{ fontFamily: "var(--pt-heading-font, inherit)" }}>
              {heading}
            </Heading>
            {text && <p className="text-sm text-white/85 sm:text-base">{text}</p>}
            {cta_label && cta_url && (
              <Button asChild size="lg" className="rounded-full px-7">
                <SmartLink url={cta_url}>{cta_label}</SmartLink>
              </Button>
            )}
          </div>
        </section>
      );
    }

    case "image":
      return (
        <figure className="space-y-2">
          <img src={block.config.url} alt={block.config.alt} loading="lazy" className="w-full rounded-lg object-cover" />
          {block.config.caption && (
            <figcaption className="text-center text-sm text-muted-foreground">{block.config.caption}</figcaption>
          )}
        </figure>
      );

    case "faq":
      return (
        <section className="max-w-3xl">
          {block.config.heading && (
            <h2 className="ws-heading mb-4 text-xl tracking-tight sm:text-2xl">{block.config.heading}</h2>
          )}
          {/* <details> keeps every answer in the HTML, so it's indexable even while collapsed. */}
          <div className="divide-y rounded-lg border bg-card">
            {block.config.items.map((item, index) => (
              <details key={index} className="group px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium">
                  {item.question}
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      );

    case "cta":
      return (
        <section className="flex flex-col items-center gap-4 rounded-lg border bg-card px-6 py-8 text-center">
          {block.config.text && <p className="text-base font-medium sm:text-lg">{block.config.text}</p>}
          <Button
            asChild
            size="lg"
            className="rounded-full px-8"
            style={{ backgroundColor: block.config.bg_color, color: block.config.text_color }}
          >
            <SmartLink url={block.config.url} className="flex items-center gap-2">
              {block.config.label}
              <ArrowRight className="h-4 w-4" />
            </SmartLink>
          </Button>
        </section>
      );

    default:
      return null;
  }
};

/** Plain text of the first rich-text block — the meta description fallback. */
export const pageExcerpt = (blocks: PublicPageBlock[], maxLength = 160) => {
  const firstText = blocks.find((block) => block.type === "rich_text");
  if (!firstText || firstText.type !== "rich_text") return "";
  const text = firstText.config.html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
};

/**
 * A page's content: its <h1> (unless a leading banner carries it) and its
 * blocks. Each block is wrapped in `.ws-block .ws-block-<type>` so a theme's
 * custom CSS can target them.
 */
export const PageBody = ({ title, blocks }: { title: string; blocks: PublicPageBlock[] }) => {
  const leadsWithBanner = blocks[0]?.type === "banner";
  return (
    <>
      {!leadsWithBanner && (
        <h1 className="ws-heading ws-page-title text-3xl tracking-tight sm:text-4xl md:text-5xl">{title}</h1>
      )}
      {blocks.map((block, index) => (
        <div key={block.id} className={`ws-block ws-block-${block.type.replace("_", "-")}`}>
          <PageBlock block={block} asPageHeading={index === 0 && leadsWithBanner} />
        </div>
      ))}
    </>
  );
};
