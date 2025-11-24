import AdSpace from "@/components/AdSpace";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStory } from "@/hooks/useStory";
import { BookMarked, Clock, Eye, Heart, Share2, Star } from "lucide-react";
import { Link, useParams } from "react-router-dom";

const StoryDetail = () => {
  const { slug } = useParams();
  // const slug = "the-raven"

  console.log("Slug: ", slug);

  const { data: story, isLoading, isError } = useStory(slug);

  if (isLoading) {
    return < FullScreenLoader />;
  }

  if (isError || !story) {
    return <div>Error loading story.</div>;
  }

  // const story = {
  //   title: "Echoes of Tomorrow",
  //   author: "Sarah Chen",
  //   image: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&q=80",
  //   rating: 4.8,
  //   views: "2.3M",
  //   genre: "Sci-Fi",
  //   status: "Ongoing",
  //   chapters: 24,
  //   description: "In a world where memories can be bought and sold, Maya discovers she has the rare ability to see the true past. When a powerful corporation tries to exploit her gift, she must navigate a dangerous conspiracy that threatens not just her future, but the fabric of reality itself.",
  //   tags: ["Dystopian", "Thriller", "Romance", "Action"],
  //   lastUpdated: "2 days ago"
  // };

  // const chapters = [
  //   { number: 1, title: "The Beginning", date: "Jan 15, 2024", views: "450K" },
  //   { number: 2, title: "First Memories", date: "Jan 18, 2024", views: "420K" },
  //   { number: 3, title: "The Discovery", date: "Jan 22, 2024", views: "390K" },
  //   { number: 4, title: "Running Away", date: "Jan 25, 2024", views: "380K" },
  //   { number: 5, title: "New Allies", date: "Jan 29, 2024", views: "370K" },
  // ];

  const relatedStories = [
    { title: "Memory Wars", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80", rating: 4.7, views: "1.8M", genre: "Sci-Fi" },
    { title: "Digital Dreams", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80", rating: 4.6, views: "1.5M", genre: "Sci-Fi" },
    { title: "The Last Code", image: "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&q=80", rating: 4.8, views: "2.1M", genre: "Sci-Fi" },
  ];

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
                    <Badge variant="outline">{story.is_completed? "Complete" : "Ongoing"}</Badge>
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

                <Link to={"/read/1/1"} className="flex gap-3 pt-4 w-full flex-wrap">
                  <Button size="lg" className="flex-1 min-w-[140px]">
                    <BookMarked className="h-4 w-4 mr-2" />
                    Start Reading
                  </Button>
                  <Button size="lg" variant="outline">
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="outline">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <AdSpace size="banner" className="mb-8" />

            {/* Tabs */}
            <Tabs defaultValue="chapters" className="mb-8">
              <TabsList>
                <TabsTrigger value="chapters">Chapters</TabsTrigger>
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="chapters" className="mt-6">
                <Card >
                  <CardContent className="p-0">
                    {story?.chapters?.map((chapter, index) => (
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
                    ))}
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
                          <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" />
                          <AvatarFallback>SC</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{story.author.name}</p>
                          <p className="text-sm text-muted-foreground">15 stories · 5.2M readers</p>
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
