import type { BlogLinkedBlog } from "@/api/types";
import CoverImage from "@/components/CoverImage";
import { Link } from "react-router";

export default function BlogKeepReading({ posts }: { posts: BlogLinkedBlog[] }) {
  if (!posts.length) return null;
  return (
    <section className="mt-10" aria-labelledby="keep-reading-heading">
      <h2 id="keep-reading-heading" className="mb-4 text-xl font-bold">
        Keep reading
      </h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.slice(0, 3).map((post) => (
          <Link key={post.id} to={`/blog/${post.slug}`} className="group overflow-hidden rounded-sm border bg-card">
            <div className="aspect-video overflow-hidden">
              <CoverImage
                src={post.cover_image}
                alt={post.title}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
            <div className="p-4">
              <h3 className="line-clamp-2 font-semibold group-hover:text-primary">{post.title}</h3>
              {post.excerpt && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
