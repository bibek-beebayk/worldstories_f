import type { BlogTocItem } from "@/lib/blogToc";
import { useEffect, useState } from "react";

interface BlogTocProps {
  items: BlogTocItem[];
  mobile?: boolean;
}

export default function BlogToc({ items, mobile = false }: BlogTocProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const headings = items.map(({ id }) => document.getElementById(id)).filter((node): node is HTMLElement => !!node);
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70%", threshold: [0, 1] },
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 3) return null;

  const links = (
    <ol className="space-y-1.5 text-sm">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${encodeURIComponent(item.id)}`}
            aria-current={activeId === item.id ? "true" : undefined}
            className="flex min-h-11 items-center border-l-2 border-transparent px-3 py-2 text-muted-foreground transition-colors hover:text-foreground aria-[current=true]:border-primary aria-[current=true]:font-semibold aria-[current=true]:text-foreground"
            onClick={(event) => {
              event.preventDefault();
              document.getElementById(item.id)?.scrollIntoView({
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                block: "start",
              });
              window.history.replaceState(null, "", `#${encodeURIComponent(item.id)}`);
            }}
          >
            {item.label}
          </a>
        </li>
      ))}
    </ol>
  );

  if (mobile) {
    return (
      <details className="mb-6 rounded-sm border bg-card p-3 lg:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
          On this page · {items.length} sections
        </summary>
        <nav aria-label="Table of contents" className="mt-2">
          {links}
        </nav>
      </details>
    );
  }

  return (
    <nav aria-labelledby="blog-toc-heading" className="hidden rounded-sm border bg-card p-4 lg:block">
      <h2 id="blog-toc-heading" className="mb-2 font-semibold">
        On this page
      </h2>
      {links}
    </nav>
  );
}
