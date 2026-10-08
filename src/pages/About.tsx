import { Link } from "react-router";
import { BookOpen, Globe2, Library, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildMeta } from "@/lib/buildMeta";
import { identityFromMatches, useSiteIdentity } from "@/lib/siteIdentity";
import type { Route } from "./+types/About";

export function meta({ matches }: Route.MetaArgs) {
  // The publisher is only named — here, in the snippet and the structured
  // data — while the admin's "Show publisher info" switch is on.
  const identity = identityFromMatches(matches);
  return buildMeta({
    title: "About WorldStories",
    description: identity.showPublisher
      ? `Learn about WorldStories, its public-domain library, WorldStories Originals, and independent publisher ${identity.contactName}.`
      : "Learn about WorldStories, its public-domain library of classics and folk stories, and WorldStories Originals.",
    path: "/about",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "WorldStories",
      url: "https://worldstories.net",
      email: identity.email,
      ...(identity.showPublisher ? { founder: { "@type": "Person", name: identity.contactName } } : {}),
    },
  });
}

const values = [
  {
    icon: Globe2,
    title: "Public-domain classics",
    description: "Read enduring literature and folk stories freely in one accessible library.",
  },
  {
    icon: PenLine,
    title: "WorldStories Originals",
    description: "Discover original serial fiction published under the WorldStories Originals imprint.",
  },
  {
    icon: Library,
    title: "Free to explore",
    description: "Read online, listen where narration is available, and discover stories from around the world.",
  },
];

const About = () => {
  const identity = useSiteIdentity();
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="rounded-full bg-primary/10 p-3 w-fit">
          <BookOpen className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">About WorldStories</h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          WorldStories is a free library of public domain classics and folk literature, plus original
          serial fiction published under the WorldStories Originals imprint.
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

        <section className="mt-10 space-y-4 rounded-xl border border-primary/15 bg-primary/5 p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-foreground">
            {identity.showPublisher ? "About the Publisher" : "Get in Touch"}
          </h2>
          {identity.showPublisher && (
            <p>
              WorldStories and WorldStories Originals are owned and operated by {identity.contactName}, an
              independent developer and author based in {identity.location}.
            </p>
          )}
          <p>
            WorldStories Originals titles are also available as ebooks on Amazon Kindle.
            {/* TODO: Add the Amazon Kindle author/store URL when it is available. */}
          </p>
          <p>
            Contact:{" "}
            <a href={`mailto:${identity.email}`} className="font-medium text-primary hover:underline">
              {identity.email}
            </a>
          </p>
        </section>

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
