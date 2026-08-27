import { Link } from "react-router";
import CoverImage from "@/components/CoverImage";
import { Blog } from "@/api/types";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

const BlogCard = ({ blog }: { blog: Blog }) => {
  return (
    <Link to={`/blog/${blog.slug}`} className="group block cursor-pointer">
      <div className="relative mb-3 aspect-video overflow-hidden rounded-lg shadow-md">
        <CoverImage
          src={blog.cover_image}
          alt={blog.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <h3 className="mb-1 line-clamp-2 text-sm font-semibold transition-colors group-hover:text-primary">
        {blog.title}
      </h3>
      {blog.excerpt && <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{blog.excerpt}</p>}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {blog.author_name && <span>{blog.author_name}</span>}
        {blog.author_name && <span aria-hidden="true">&middot;</span>}
        <span suppressHydrationWarning>{formatDate(blog.published_at)}</span>
      </div>
    </Link>
  );
};

export default BlogCard;
