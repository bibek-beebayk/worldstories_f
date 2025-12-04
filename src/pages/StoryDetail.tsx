import AdSpace from "@/components/AdSpace";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStory } from "@/hooks/useStory";
import { BookMarked, Eye, Headphones, Heart, Share2, Star } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";


const StoryDetail = () => {
  const { slug } = useParams();
  const { data: story, isLoading, isError } = useStory(slug);
  // const [pendingScroll, setPendingScroll] = useState<"chapters" | "audios" | null>(null);

  // const slug = "the-raven"

  // debugger;

  const [activeTab, setActiveTab] = useState("chapters");

  const chaptersRef = useRef<HTMLDivElement | null>(null);
  const audiosRef = useRef<HTMLDivElement | null>(null);

  // useEffect(() => {
  //   if (pendingScroll === "chapters" && chaptersRef.current) {
  //     chaptersRef.current.scrollIntoView({ behavior: "smooth" });
  //     setPendingScroll(null);
  //   }
  //   if (pendingScroll === "audios" && audiosRef.current) {
  //     audiosRef.current.scrollIntoView({ behavior: "smooth" });
  //     setPendingScroll(null);
  //   }
  // }, [pendingScroll, activeTab]);

  // const goToChapters = () => {
  //   setActiveTab("chapters");
  //   setPendingScroll("chapters");  // tell effect to scroll later
  // };

  // const goToAudios = () => {
  //   setActiveTab("audios");
  //   setPendingScroll("audios");
  // };



  if (isLoading) {
    return < FullScreenLoader />;
  }

  if (isError || !story) {
    return <div>Error loading story.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* <Header /> */}

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Story Header */}
            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 mb-8">
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-lg">
                <img
                  src={story.cover_image}
                  alt={story.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>{story.story_type}</Badge>
                    <Badge variant="outline">{story.is_completed ? "Complete" : "Ongoing"}</Badge>
                  </div>
                  <h1 className="text-4xl font-bold mb-2">{story.title}</h1>
                  <div className="flex items-center gap-2 mb-4">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={story.author.image} />
                      <AvatarFallback>SC</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">by <span className="text-foreground font-medium">{story.author.name}</span></span>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">{story.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span>{story.views}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookMarked className="h-4 w-4 text-muted-foreground" />
                    <span>{story.chapter_count} chapters</span>
                  </div>
                  {/* <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{story.lastUpdated}</span>
                  </div> */}
                </div>

                <p className="text-muted-foreground leading-relaxed">
                  {story.about}
                </p>

                <div className="flex flex-wrap gap-2">
                  {story.genres.map((tag, index) => (
                    <Badge key={index} variant="secondary">{tag.name}</Badge>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1">
                  {story.chapters.length > 0 && (

                    <Link to={`/read/${story.slug}/${story.chapters[0].slug}`} className="">
                      {story.chapters.length > 0 && (
                        <Button size="lg" className="flex-1 min-w-[140px]">
                          <BookMarked className="h-4 w-4 mr-2" />
                          Start Reading
                        </Button>
                      )}
                    </Link>
                  )}

                  {story.audios.length > 0 && (
                    <Link to={`/listen/${story.slug}/${story.audios[0].slug}`} className="">
                      <Button size="lg" variant="secondary" className="flex-1 min-w-[140px]">
                        <Headphones className="h-4 w-4 mr-2" />
                        Listen to Audio
                      </Button>
                    </Link>
                  )}

                  <Button size="lg" variant="outline">
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="outline">
                    <Share2 className="h-4 w-4" />
                  </Button>
                  {/* </Link> */}
                </div>

              </div>
            </div>

            <AdSpace size="banner" className="mb-8" />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="chapters">Chapters</TabsTrigger>
                {/* {story.audios.length > 0 && ( */}
                <TabsTrigger value="audios">Audios</TabsTrigger>
                {/* )} */}
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>

              </TabsList>

              <TabsContent value="chapters" className="mt-6" ref={chaptersRef}>
                <Card >
                  <CardContent className="p-0">
                    {story.chapters.length > 0 ? <>{story?.chapters?.map((chapter, index) => (
                      <Link to={`/read/${slug}/${chapter.slug}/`} key={index}>
                        <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-semibold text-muted-foreground w-8">
                              {chapter.order}
                            </span>
                            <div>
                              <h3 className="font-medium">{chapter.title}</h3>
                              {/* <p className="text-xs text-muted-foreground">{chapter.date}</p> */}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Eye className="h-3 w-3" />
                            {/* <span>{chapter.views}</span> */}
                          </div>
                        </div>
                        {index < story.chapters.length - 1 && <Separator />}
                      </Link>
                    ))}</> : <p className="p-4 text-muted-foreground">No chapters available.</p>}

                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="audios" className="mt-6" ref={audiosRef}>
                <Card >
                  <CardContent className="p-0">
                    {story.audios.length > 0 ? <>{story?.audios?.map((chapter, index) => (
                      <Link to={`/read/${slug}/${chapter.slug}/`} key={index}>
                        <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-semibold text-muted-foreground w-8">
                              {chapter.order}
                            </span>
                            <div>
                              <h3 className="font-medium">{chapter.title}</h3>
                              {/* <p className="text-xs text-muted-foreground">{chapter.date}</p> */}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Headphones className="h-3 w-3" />
                            {/* <span>{chapter.views}</span> */}
                          </div>
                        </div>
                        {index < story.chapters.length - 1 && <Separator />}
                      </Link>
                    ))}</> : <p className="p-4 text-muted-foreground">No audio available.</p>}
                  </CardContent>
                </Card>
              </TabsContent>


              <TabsContent value="about" className="mt-6">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Story Description</h3>
                      <p className="text-muted-foreground">{story.description}</p>
                    </div>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2">About the Author</h3>
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={story.author.image} />
                          <AvatarFallback>SC</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{story.author.name}</p>
                          <p className="text-sm text-muted-foreground">{story.author.stories_count} stories · 5.2M readers</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {story.author.bio}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground">Reviews coming soon...</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <AdSpace size="rectangle" />

            {/* <div>
              <h2 className="text-xl font-bold mb-4">More by {story.author}</h2>
              <div className="space-y-4">
                {relatedStories.map((relStory, index) => (
                  <StoryCard key={index} {...relStory} />
                ))}
              </div>
            </div> */}

            {/* <AdSpace size="rectangle" /> */}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StoryDetail;
