import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { storyApi } from "@/api/story";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type PickerKind = "video" | "blog";

export function ContentPickerDialog({
  open,
  kind,
  excludeIds,
  onClose,
  onSelect,
}: {
  open: boolean;
  kind: PickerKind;
  excludeIds: number[];
  onClose: () => void;
  onSelect: (item: { id: number; title: string }) => void;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (open) setSearch("");
  }, [open]);

  const items = useQuery({
    queryKey: ["home-section-content-picker", kind, debounced],
    enabled: open,
    queryFn: async () => {
      if (kind === "video") {
        const response = await storyApi.listAdminVideos(1, debounced);
        return response.results.map((video) => ({ id: video.id, title: video.display_title || video.title }));
      }
      const response = await storyApi.getAdminBlogs({ page: 1, search: debounced });
      return response.results.map((blog) => ({ id: blog.id, title: blog.title }));
    },
  });
  const excluded = new Set(excludeIds);
  const rows = (items.data ?? []).filter((item) => !excluded.has(item.id));

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose a {kind}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${kind}s`}
            className="pl-9"
            autoFocus
          />
        </div>
        <div className="max-h-80 space-y-1 overflow-y-auto scrollbar-thin">
          {items.isLoading && <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin" />}
          {!items.isLoading && rows.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No matching {kind}s.</p>
          )}
          {rows.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              className="min-h-11 w-full justify-start text-left"
              onClick={() => onSelect(item)}
            >
              <span className="truncate">{item.title}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
