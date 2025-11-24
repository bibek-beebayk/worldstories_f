import AdSpace from "@/components/AdSpace";
import FullScreenLoader from "@/components/FullScreenLoader";
import StoryCard from "@/components/StoryCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useGenres } from "@/hooks/useGenres";
import { useStories } from "@/hooks/useStories";
import { formatViews } from "@/lib/utils";
import { Filter } from "lucide-react";
import { useState } from "react";

const Catalogue = () => {
  // -------------------------------
  // Applied filters (used in API)
  // -------------------------------
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("popular");

  // -------------------------------
  // Temporary filters (UI only)
  // -------------------------------
  const [tempGenres, setTempGenres] = useState<number[]>(selectedGenres);
  const [tempStatus, setTempStatus] = useState(status);
  const [tempSort, setTempSort] = useState(sort);

  const [openFilter, setOpenFilter] = useState(false);
  const [page, setPage] = useState(1);

  const { data: stories, isLoading } = useStories(page, selectedGenres, sort, status);
  const { data: genres } = useGenres();

  // -------------------------------
  // Filters panel content
  // -------------------------------
  const Filters = (
    <div className="space-y-6 p-4 flex flex-col h-full overflow-auto">

      {/* Sort */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Sort By</Label>
        <Select value={tempSort} onValueChange={(v) => setTempSort(v)}>
          <SelectTrigger type="button">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
            <SelectItem value="views">Most Viewed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Status */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Status</Label>
        <Select value={tempStatus} onValueChange={(v) => setTempStatus(v)}>
          <SelectTrigger type="button">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stories</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Genres */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Genres</Label>
        <div className="space-y-3">
          {genres?.map((genre) => (
            <div key={genre.id} className="flex items-center space-x-2">
              <Checkbox
                id={genre.id.toString()}
                checked={tempGenres.includes(genre.id)}
                onCheckedChange={(checked) => {
                  setTempGenres((prev) =>
                    checked ? [...prev, genre.id] : prev.filter((g) => g !== genre.id)
                  );
                }}
              />
              <Label htmlFor={genre.id.toString()} className="text-xs cursor-pointer">
                {genre.name + ` ( ${formatViews(genre.stories_count)} )`}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Rating (static for now) */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Rating</Label>
        <Select defaultValue="all">
          <SelectTrigger type="button">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="4.5">4.5+ Stars</SelectItem>
            <SelectItem value="4.0">4.0+ Stars</SelectItem>
            <SelectItem value="3.5">3.5+ Stars</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Apply Filters Button */}
      <Button
        className="w-full mt-4"
        onClick={() => {
          setSort(tempSort);
          setStatus(tempStatus);
          setSelectedGenres(tempGenres);
          setOpenFilter(false); // close mobile sheet
        }}
      >
        Apply Filters
      </Button>

      {/* Optional Reset Button */}
      <Button
        variant="outline"
        className="w-full mt-2"
        onClick={() => {
          setTempSort("popular");
          setTempStatus("all");
          setTempGenres([]);
        }}
      >
        Reset Filters
      </Button>

      <AdSpace size="rectangle" />
    </div>
  );

  if (isLoading) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">

        {/* Mobile Filters */}
        <div className="flex justify-between items-center mb-6 md:hidden">
          <h1 className="text-2xl font-bold">Browse Stories</h1>
          <Sheet open={openFilter} onOpenChange={setOpenFilter}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              {Filters}
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex gap-8">

          {/* Desktop Sidebar */}
          <aside className="w-64 hidden md:block">
            <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
              {Filters}
            </div>
          </aside>

          {/* Story Grid */}
          <div className="flex-1">
            <div className="hidden md:block mb-6">
              <h1 className="text-3xl font-bold mb-2">Browse Stories</h1>
              <p className="text-muted-foreground">
                Discover amazing stories from talented creators
              </p>
            </div>

            <AdSpace size="banner" className="mb-8" />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
              {stories?.results?.map((story, index) => (
                <StoryCard key={index} {...story} />
              ))}
            </div>

            <AdSpace size="banner" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Catalogue;
