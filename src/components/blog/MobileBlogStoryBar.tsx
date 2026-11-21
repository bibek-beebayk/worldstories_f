import type { BlogLinkedStory } from "@/api/types";
import { copyShareLink } from "@/lib/share";
import { Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

export default function MobileBlogStoryBar({
  story,
  closingId,
  blogPath,
}: {
  story: BlogLinkedStory;
  closingId: string;
  blogPath: string;
}) {
  const [closingVisible, setClosingVisible] = useState(false);
  useEffect(() => {
    const target = document.getElementById(closingId);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setClosingVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [closingId]);
  if (closingVisible) return null;
  const share = () => {
    if (navigator.share) navigator.share({ url: `${window.location.origin}${blogPath}` }).catch(() => undefined);
    else copyShareLink(blogPath);
  };
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-2 backdrop-blur lg:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex min-h-11 items-center gap-3 text-sm">
        <span className="min-w-0 flex-1 truncate">
          <strong>Free to read</strong> · {story.title}
          {story.author ? ` · ${story.author}` : ""}
        </span>
        <button
          type="button"
          onClick={share}
          className="grid h-11 w-11 shrink-0 place-items-center"
          aria-label="Share this blog post"
        >
          <Share2 className="h-4 w-4" />
        </button>
        <Link to={`/story/${story.slug}`} className="flex min-h-11 shrink-0 items-center font-semibold text-primary">
          Read story →
        </Link>
      </div>
    </div>
  );
}
