import { useCallback, useEffect, useState } from "react";
import { BookOpenText, Download, HardDrive, Library, WifiOff } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import DownloadStorySummaryRow from "@/components/DownloadStorySummaryRow";
import ProfileDownloadedStory from "@/components/ProfileDownloadedStory";
import Seo from "@/components/Seo";
import { Card, CardContent } from "@/components/ui/card";
import { DownloadRecord, groupDownloadsByStory, listDownloads } from "@/lib/offlineDb";
import { formatBytes } from "@/lib/utils";
import { MAX_DOWNLOADED_TITLES } from "@/hooks/useOfflineDownload";

const Downloads = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedStory = searchParams.get("story");
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(null);

  const refreshDownloads = useCallback(() => {
    listDownloads().then(setDownloads);
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then((estimate) =>
        setStorageEstimate({ usage: estimate.usage || 0, quota: estimate.quota || 0 })
      );
    }
  }, []);

  useEffect(() => {
    refreshDownloads();
    window.addEventListener("focus", refreshDownloads);
    return () => window.removeEventListener("focus", refreshDownloads);
  }, [refreshDownloads]);

  const selectedDownloads = selectedStory
    ? downloads.filter((item) => item.story_slug === selectedStory)
    : [];
  const groupedDownloads = groupDownloadsByStory(downloads);
  const totalBytes = downloads.reduce((sum, item) => sum + item.size_bytes, 0);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_50%),linear-gradient(to_bottom,#f8fafc,transparent_280px)]">
      <Seo
        title="Downloads | WorldStories"
        description="Read and listen to content saved on this device."
        path="/downloads"
        noIndex
      />
      <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
        {!selectedStory && (
          <div className="mb-6 rounded-2xl border border-cyan-200/60 bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-100 p-5 sm:p-6">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
              <Download className="h-3.5 w-3.5" />
              Offline Library
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Your Downloads</h1>
            <p className="mt-2 text-sm text-slate-700 sm:text-base">
              Read and listen anywhere with stories saved securely on this device.
            </p>
          </div>
        )}

        {selectedStory ? (
          <section className="mx-auto max-w-3xl">
            <ProfileDownloadedStory
              storySlug={selectedStory}
              storyTitle={selectedDownloads[0]?.story_title || "Downloaded story"}
              downloads={selectedDownloads}
              onBack={() => setSearchParams({})}
              onChange={refreshDownloads}
            />
          </section>
        ) : (
          <>
            <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              <Card className="border-cyan-100 bg-white/85 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <Library className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-2xl font-bold text-slate-900">{groupedDownloads.length}</p>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    Saved titles · {groupedDownloads.length}/{MAX_DOWNLOADED_TITLES}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-cyan-100 bg-white/85 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <BookOpenText className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-2xl font-bold text-slate-900">{downloads.length}</p>
                  <p className="text-xs text-muted-foreground sm:text-sm">Downloaded items</p>
                </CardContent>
              </Card>
              <Card className="col-span-2 border-cyan-100 bg-white/85 shadow-sm sm:col-span-1">
                <CardContent className="p-4 sm:p-5">
                  <HardDrive className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-2xl font-bold text-slate-900">{formatBytes(totalBytes)}</p>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    {storageEstimate && storageEstimate.quota > 0
                      ? `${formatBytes(storageEstimate.usage)} total device storage used`
                      : "Offline storage used"}
                  </p>
                </CardContent>
              </Card>
            </section>

            <section>
              <div className="mb-4 flex items-center gap-2">
                <WifiOff className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold sm:text-xl">Available Offline</h2>
                {groupedDownloads.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {groupedDownloads.length} {groupedDownloads.length === 1 ? "story" : "stories"}
                  </span>
                )}
              </div>

              {groupedDownloads.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                  {groupedDownloads.map((summary) => (
                    <DownloadStorySummaryRow
                      key={summary.story_slug}
                      summary={summary}
                      onClick={() => setSearchParams({ story: summary.story_slug })}
                    />
                  ))}
                </div>
              )}

              {downloads.length === 0 && (
                <Card className="border-dashed bg-card/80">
                  <CardContent className="flex flex-col items-center px-5 py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Download className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mt-4 font-semibold">Your offline shelf is empty</h3>
                    <p className="mt-1 max-w-md text-sm text-muted-foreground">
                      Look for the download icon on a story's chapters, audiobook tracks, PDF, or EPUB file.
                    </p>
                  </CardContent>
                </Card>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Downloads;
