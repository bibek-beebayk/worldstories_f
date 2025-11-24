import FullScreenLoader from "@/components/FullScreenLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useChapter } from "@/hooks/useChapter";
import {
  ArrowLeft,
  BookMarked,
  Heart,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

const StoryReader = () => {
  const { story_slug, chapter_slug } = useParams();
  const { data: chapter, isLoading, isError } = useChapter(
    story_slug,
    chapter_slug
  );

  // ---------------------------
  // ALL HOOKS AT THE TOP (Fixes your hook-order error)
  // ---------------------------
  const [fontSize, setFontSize] = useState(18);
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const hiddenRef = useRef<HTMLDivElement>(null);

  const pageHeight = 1300;

  // ---------------------------
  // Pagination Logic (Fixed)
  // ---------------------------
  useEffect(() => {
    if (!chapter?.content) return;

    setPages([]);
    setCurrentPage(0);

    setTimeout(() => {
      const container = hiddenRef.current;
      if (!container) return;

      // Inject chapter content into the measurement div
      container.innerHTML = chapter.content;

      const children = Array.from(container.childNodes);
      let pagesArr: string[] = [];
      let currentPageContent: Node[] = [];

      // temp measurement div
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.visibility = "hidden";
      tempDiv.style.width = container.clientWidth + "px";
      tempDiv.style.fontSize = fontSize + "px";
      document.body.appendChild(tempDiv);

      for (let child of children) {
        const clone = child.cloneNode(true);
        tempDiv.appendChild(clone);

        // If element overflows, finalize previous page
        if (tempDiv.scrollHeight > pageHeight) {
          const pageHTML = currentPageContent
            .map((n) =>
              n.nodeType === Node.ELEMENT_NODE
                ? (n as Element).outerHTML
                : n.textContent ?? ""
            )
            .join("");

          pagesArr.push(pageHTML);

          // start fresh
          tempDiv.innerHTML = "";
          currentPageContent = [clone];
          tempDiv.appendChild(clone);
        } else {
          currentPageContent.push(clone);
        }
      }

      // Last page
      if (currentPageContent.length > 0) {
        const lastPageHTML = currentPageContent
          .map((n) =>
            n.nodeType === Node.ELEMENT_NODE
              ? (n as Element).outerHTML
              : n.textContent ?? ""
          )
          .join("");
        pagesArr.push(lastPageHTML);
      }

      document.body.removeChild(tempDiv);
      setPages(pagesArr);
    }, 50);
  }, [chapter, fontSize]);

  // ---------------------------
  // Loading
  // ---------------------------
  if (isLoading) return <FullScreenLoader />;

  // ---------------------------
  // Error
  // ---------------------------
  if (isError || !chapter) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Failed to load chapter.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to={`/story/${story_slug}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h2 className="font-semibold">{chapter?.title}</h2>
            <p className="text-xs text-muted-foreground">{story_slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setFontSize((s) => s - 1)}
          >
            A-
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setFontSize((s) => s + 1)}
          >
            A+
          </Button>
          <Button variant="outline" size="icon">
            <Heart className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon">
            <BookMarked className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Reader */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-3">{chapter.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Chapter {chapter.order}
        </p>

        <Card className="bg-[#f4ede0]">
          <CardContent className="p-6">
            {pages.length > 0 ? (
              <div
                className="prose prose-neutral max-w-none leading-relaxed"
                style={{ fontSize: `${fontSize}px` }}
                dangerouslySetInnerHTML={{
                  __html: pages[currentPage],
                }}
              />
            ) : (
              <p>Loading pages…</p>
            )}

            {/* Hidden pagination measurement div */}
            <div
              ref={hiddenRef}
              className="prose max-w-3xl absolute opacity-0 pointer-events-none"
              style={{ fontSize: `${fontSize}px` }}
            ></div>
          </CardContent>

          {/* Page Navigation */}
          {pages.length > 1 && (
            <div className="flex items-center justify-between mt-6 m-2">
              <Button
                variant="outline"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Previous Page
              </Button>

              <span className="text-sm text-muted-foreground">
                Page {currentPage + 1} / {pages.length}
              </span>

              <Button
                disabled={currentPage === pages.length - 1}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next Page
              </Button>
            </div>
          )}
        </Card>

        <Separator className="my-8" />
      </main>
    </div>
  );
};

export default StoryReader;
