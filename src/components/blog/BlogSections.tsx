import { Link } from "react-router";
import { ArrowRight, BookOpen } from "lucide-react";
import type { Blog, BlogLinkedBook, BlogTopicCount } from "@/api/types";
import CoverImage from "@/components/CoverImage";
import { Button } from "@/components/ui/button";
import { formatBlogReadTime, formatReads, type BlogSort } from "@/lib/blogParams";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

/** The featured post as a large card — one stretched link, plus a separate book chip. */
export const FeaturedPost = ({ blog, pinned }: { blog: Blog; pinned: boolean }) => {
  const topic = blog.topics?.[0];
  const readTime = formatBlogReadTime(blog.reading_time_minutes);
  const book = blog.linked_story;
  return (
    <article className="group relative">
      <div className="aspect-[2/1] overflow-hidden rounded-2xl shadow-md ring-1 ring-black/5">
        <CoverImage
          src={blog.cover_image}
          alt=""
          title={blog.title}
          loading="eager"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        {topic && <span className="font-bold uppercase tracking-[0.08em] text-primary">{topic.name}</span>}
        <span className="rounded-full bg-primary px-2.5 py-0.5 font-semibold text-primary-foreground">{pinned ? "Featured" : "Latest"}</span>
        <span className="text-muted-foreground" suppressHydrationWarning>
          {formatDate(blog.published_at)}
          {readTime ? ` · ${readTime}` : ""}
        </span>
      </div>
      <h2 className="!font-serif mt-2 text-2xl font-bold leading-tight sm:text-3xl">
        <Link
          to={`/blog/${blog.slug}`}
          className="transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-primary focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-primary"
        >
          {blog.title}
        </Link>
      </h2>
      {blog.excerpt && <p className="mt-2 line-clamp-3 text-base text-muted-foreground">{blog.excerpt}</p>}
      {book && (
        <Link
          to={`/story/${book.slug}`}
          className="relative z-10 mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary/50 hover:text-primary"
        >
          <BookOpen className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">Read the book: {book.title}</span>
        </Link>
      )}
    </article>
  );
};

/** "Most read this month": the four posts with the most unique readers in 30 days. */
export const MostRead = ({ posts }: { posts: Blog[] }) => {
  if (posts.length === 0) return null;
  return (
    <aside aria-label="Most read this month" className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <h2 className="mb-1 text-base font-bold">Most read this month</h2>
      <ol>
        {posts.map((post, index) => (
          <li key={post.id} className="border-b last:border-b-0">
            <Link to={`/blog/${post.slug}`} className="group flex items-center gap-3 py-3">
              <span className="w-5 shrink-0 text-lg font-bold tabular-nums text-muted-foreground">{index + 1}</span>
              <span className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                <CoverImage src={post.cover_image} alt="" title={post.title} loading="lazy" className="h-full w-full object-cover" />
              </span>
              <span className="min-w-0">
                <span className="!font-serif line-clamp-2 block text-sm font-bold leading-snug group-hover:text-primary">{post.title}</span>
                {typeof post.reads_30d === "number" && post.reads_30d > 0 && (
                  <span className="text-xs text-muted-foreground">{formatReads(post.reads_30d)}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
};

const chipClass = (selected: boolean) =>
  `h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold transition-colors ${
    selected ? "border-slate-900 bg-slate-900 text-white" : "border-border bg-background hover:border-slate-400"
  }`;

/** "All posts" heading, Newest / Most read, and topic chips with counts. */
export const BlogToolbar = ({
  heading,
  sort,
  onSort,
  topics,
  totalPosts,
  activeTopic,
  onTopic,
}: {
  heading: string;
  sort: BlogSort;
  onSort: (sort: BlogSort) => void;
  topics: BlogTopicCount[];
  totalPosts: number | null;
  activeTopic: string;
  onTopic: (slug: string) => void;
}) => (
  <div className="mb-5 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold tracking-tight">{heading}</h2>
      <div className="inline-flex rounded-lg border p-0.5" role="group" aria-label="Sort posts">
        {(
          [
            ["newest", "Newest"],
            ["popular", "Most read"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={sort === value}
            onClick={() => onSort(value)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              sort === value ? "bg-slate-900 text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
    {topics.length > 0 && (
      <div role="group" aria-label="Topics" className="-mx-3 flex gap-2 overflow-x-auto px-3 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <button type="button" aria-pressed={activeTopic === ""} onClick={() => onTopic("")} className={chipClass(activeTopic === "")}>
          All{totalPosts !== null ? ` ${totalPosts}` : ""}
        </button>
        {topics.map((topic) => (
          <button key={topic.slug} type="button" aria-pressed={activeTopic === topic.slug} onClick={() => onTopic(topic.slug)} className={chipClass(activeTopic === topic.slug)}>
            {topic.name} <span className="opacity-70">{topic.post_count}</span>
          </button>
        ))}
      </div>
    )}
  </div>
);

/** A dark band that sends readers on to the books the posts are about. */
export const BooksBand = ({ books }: { books: BlogLinkedBook[] }) => {
  if (books.length === 0) return null;
  return (
    <section className="mt-12 rounded-2xl bg-slate-900 px-5 py-8 text-white sm:px-8 sm:py-10" aria-label="Read the books we write about">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="!font-serif text-2xl font-bold">Read the books we write about</h2>
          <p className="mt-1 text-sm text-slate-300">The stories our posts return to most, free to read.</p>
        </div>
        <Button asChild className="rounded-full bg-white px-5 font-bold text-slate-900 hover:bg-white/90">
          <Link to="/library">
            Open the Library <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <ul className="mt-6 grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-6">
        {books.map((book) => (
          <li key={book.id}>
            <Link to={`/story/${book.slug}`} className="group block">
              <span className="block aspect-[2/3] overflow-hidden rounded-md bg-slate-800 shadow-lg">
                <CoverImage src={book.cover_image} alt="" title={book.title} author={book.author} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              </span>
              <span className="mt-2 block line-clamp-2 text-xs font-semibold leading-snug group-hover:underline">{book.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
