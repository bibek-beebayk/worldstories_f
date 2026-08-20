import { Link } from "react-router";
import { BookOpen, Globe2, PenLine, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildMeta } from "@/lib/buildMeta";

export function meta() {
  return buildMeta({
    title: "About WorldStories",
    description:
      "WorldStories is a home for stories from around the world — discover new tales, connect with authors, and immerse yourself in diverse narratives across genres.",
    path: "/about",
  });
}

const values = [
  {
    icon: Globe2,
    title: "Stories from everywhere",
    description: "We bring together short stories, novels, and audiobooks from writers across genres and backgrounds.",
  },
  {
    icon: PenLine,
    title: "A home for new writers",
    description: "Every submission is reviewed by our team before publishing, so writers of any experience level can share their work.",
  },
  {
    icon: Users,
    title: "Built for readers",
    description: "Track your reading progress, favorite what you love, and pick up right where you left off — on any device.",
  },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="rounded-full bg-primary/10 p-3 w-fit">
          <BookOpen className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">About WorldStories</h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          WorldStories is the home for stories from around the world. We're building a place where
          readers can discover new tales, connect with authors, and immerse themselves in diverse
          narratives across genres — from short stories and novels to poetry and audiobooks.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {values.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardContent className="flex flex-col gap-2 p-5">
                <Icon className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-semibold">{title}</h2>
                <p className="text-xs text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 space-y-4 text-sm text-muted-foreground sm:text-base">
          <p>
            Anyone can submit a story to WorldStories. Every submission is reviewed by our team before
            it goes live, so the library stays a place readers can trust. Once published, stories can be
            read in the browser, downloaded, or listened to as an audiobook where narration is
            available.
          </p>
          <p>
            WorldStories is an independent, growing project. If you have feedback, want to report a
            problem, or want to get in touch for any other reason, visit our{" "}
            <Link to="/contact" className="font-medium text-primary hover:underline">
              Contact page
            </Link>
            .
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/library">Explore the Library</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/publish">Submit a Story</Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default About;
