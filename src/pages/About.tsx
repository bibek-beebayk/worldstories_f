import type { ComponentType } from "react";
import { Link } from "react-router";
import {
  Accessibility,
  ArrowRight,
  BookOpen,
  BookOpenText,
  Captions,
  Clapperboard,
  Cloud,
  Compass,
  Dices,
  FileDown,
  Gauge,
  Globe2,
  Headphones,
  Heart,
  Languages,
  Library,
  Mail,
  Map,
  Maximize2,
  Newspaper,
  PenLine,
  Route,
  Search,
  Smartphone,
  Smile,
  Sparkles,
  Stamp,
  SunMoon,
  Trophy,
  Type,
  Zap,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildMeta } from "@/lib/buildMeta";
import { identityFromMatches, useSiteIdentity } from "@/lib/siteIdentity";
import type { Route as RouteTypes } from "./+types/About";

export function meta({ matches }: RouteTypes.MetaArgs) {
  // The publisher is only named — here, in the snippet and the structured
  // data — while the admin's "Show publisher info" switch is on.
  const identity = identityFromMatches(matches);
  return buildMeta({
    title: "About WorldStories",
    description: identity.showPublisher
      ? `WorldStories is a free library of stories from around the world — read, listen, read along or watch — with WorldStories Originals, published by ${identity.contactName}.`
      : "WorldStories is a free library of stories from around the world — read, listen, read along or watch — with public-domain classics, folk tales and WorldStories Originals.",
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

type Icon = ComponentType<{ className?: string }>;

// Every way to take in a story, each linking to its own section. Tints match
// the colours those sections use across the site (Library, Discover).
const CONTENT_TYPES: { icon: Icon; title: string; description: string; to: string; tint: string }[] = [
  {
    icon: BookOpenText,
    title: "Read",
    description: "Novels, short stories, poetry and folk tales, chapter by chapter in a reader you can make your own.",
    to: "/library?mode=read",
    tint: "#10b981",
  },
  {
    icon: Headphones,
    title: "Listen",
    description: "Narrated audiobooks with adjustable playback speed — for the commute, the kitchen or the dark.",
    to: "/audiobooks",
    tint: "#f43f5e",
  },
  {
    icon: Captions,
    title: "Read Along",
    description: "Narration with the text highlighted as it's spoken. Great for learners, young readers and new languages.",
    to: "/library?mode=read-along",
    tint: "#0ea5e9",
  },
  {
    icon: Clapperboard,
    title: "Watch",
    description: "Animated video narrations of selected stories — sit back and let the story play.",
    to: "/watch",
    tint: "#6366f1",
  },
  {
    icon: Zap,
    title: "Quick Reads",
    description: "The heart of a story in a few minutes, for when you want to know if a book is for you. Free with an account.",
    to: "/quick-reads",
    tint: "#f59e0b",
  },
  {
    icon: Sparkles,
    title: "WorldStories Originals",
    description: "Original serial fiction published in-house, and available nowhere else — also as Kindle ebooks.",
    to: "/originals",
    tint: "#8b5cf6",
  },
  {
    icon: FileDown,
    title: "PDF & EPUB editions",
    description: "Many titles also come as the original PDF or EPUB, readable right in your browser.",
    to: "/library",
    tint: "#64748b",
  },
  {
    icon: Newspaper,
    title: "Blog",
    description: "Essays on the stories, their authors and the traditions they come from.",
    to: "/blog",
    tint: "#14b8a6",
  },
];

const READER_FEATURES: { icon: Icon; title: string; description: string }[] = [
  { icon: SunMoon, title: "Four reading themes", description: "Parchment, Sepia, Mist and Night — easy on the eyes by day or in bed." },
  { icon: Type, title: "24 typefaces", description: "Classic serifs, clean sans, handwriting styles and monospace." },
  { icon: Accessibility, title: "Dyslexia-friendly", description: "OpenDyslexic is one tap away in the font picker." },
  { icon: ZoomIn, title: "Size & spacing", description: "Set the text size and line spacing, or pinch to zoom on touch screens." },
  { icon: Maximize2, title: "Full-screen reading", description: "Hide everything but the page when you want to sink in." },
  { icon: Cloud, title: "Picks up where you left off", description: "Your place is saved, so you can stop on your phone and carry on on your laptop." },
];

const DISCOVERY: { icon: Icon; title: string; description: string; to: string }[] = [
  { icon: Compass, title: "Discover", description: "Browse by genre, story type and language, and dig up stories most readers miss.", to: "/discover" },
  { icon: Dices, title: "Surprise Me", description: "Can't choose? Set how long you have and let us pick.", to: "/discover" },
  { icon: Smile, title: "Read by mood", description: "Pick a feeling — funny, magical, eerie — instead of a genre.", to: "/discover" },
  { icon: Map, title: "Story Map", description: "Explore the world one country at a time and find the stories that came from there.", to: "/story-map" },
  { icon: Route, title: "Story Journeys", description: "Curated paths through related stories, like Japanese folklore or ghost stories around the world.", to: "/journeys" },
  { icon: Search, title: "Search", description: "Find any title or author in the library.", to: "/search" },
];

const PERSONAL: { icon: Icon; title: string; description: string }[] = [
  { icon: BookOpen, title: "Continue reading & listening", description: "Your unfinished stories and audiobooks, waiting on the homepage." },
  { icon: Stamp, title: "Story Passport", description: "Collect a stamp for every country whose stories you've read." },
  { icon: Trophy, title: "Achievements & streaks", description: "Milestones for reading regularly and exploring widely." },
  { icon: Heart, title: "Favourites, ratings & reactions", description: "Save what you love, rate and review it, and share how a story made you feel." },
  { icon: Gauge, title: "Recommendations", description: "Suggestions that learn from what you finish." },
  { icon: Smartphone, title: "Install as an app", description: "Add WorldStories to your home screen for one-tap reading." },
];

const SectionHeading = ({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) => (
  <div className="mb-6 max-w-2xl">
    <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
    <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
    {intro && <p className="mt-2 text-muted-foreground">{intro}</p>}
  </div>
);

const FeatureItem = ({ icon: Icon, title, description }: { icon: Icon; title: string; description: string }) => (
  <div className="flex gap-3">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon className="h-4 w-4" />
    </span>
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

// The four reading themes as little page swatches (their actual colours).
const READING_THEME_SWATCHES = [
  { name: "Parchment", background: "#f4ede0", text: "#3b2f20" },
  { name: "Sepia", background: "#efe3cf", text: "#4a3826" },
  { name: "Mist", background: "#f1f5f9", text: "#1e293b" },
  { name: "Night", background: "#1b2230", text: "#cbd5e1" },
];

const About = () => {
  const identity = useSiteIdentity();

  return (
    <div className="min-h-screen bg-background">
      {/* Same banner as Library, Discover and the other section pages. */}
      <div className="relative overflow-hidden themed-banner [--banner-from:#7c3aed] [--banner-via:#db2777] [--banner-to:#1e293b]">
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <Globe2
          className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 animate-drift-slow text-white/10"
          style={{ animationDuration: "16s" }}
        />
        <BookOpen className="pointer-events-none absolute bottom-6 left-[18%] h-6 w-6 animate-float text-white/25" style={{ animationDuration: "4.5s" }} />
        <Headphones
          className="pointer-events-none absolute right-[28%] top-10 h-5 w-5 animate-float text-white/20"
          style={{ animationDelay: "1s", animationDuration: "5.5s" }}
        />

        <div className="container relative mx-auto px-3 py-10 sm:px-4 sm:py-16">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <Library className="h-3.5 w-3.5" />
            About WorldStories
          </div>
          <h1 className="max-w-3xl font-display text-3xl font-extrabold tracking-tight text-inherit sm:text-5xl">
            Stories from every corner of the world, free to read, hear and watch.
          </h1>
          <p className="mt-4 max-w-2xl text-sm opacity-85 sm:text-lg">
            WorldStories is a free library of public-domain classics and folk literature, alongside original fiction
            published under the WorldStories Originals imprint — in more than one language, and in whichever form suits
            your day.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full bg-white text-slate-900 hover:bg-white/90">
              <Link to="/library">
                Explore the Library <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link to="/discover">Discover something new</Link>
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto space-y-16 px-3 py-12 sm:px-4 sm:py-16">
        {/* Ways to enjoy a story */}
        <section>
          <SectionHeading
            eyebrow="One library, many ways in"
            title="Read it, hear it, follow along or watch it"
            intro="Many stories come in more than one form — switch between them whenever you like."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CONTENT_TYPES.map(({ icon: Icon, title, description, to, tint }) => (
              <Link
                key={title}
                to={to}
                className="tinted-panel group flex flex-col rounded-2xl border p-5 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{ ["--tint" as string]: tint }}
              >
                <span className="tinted-chip flex h-10 w-10 items-center justify-center rounded-xl border">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{description}</p>
                <span className="tinted-link mt-4 inline-flex items-center gap-1 text-sm font-medium">
                  Explore <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* The reader */}
        <section className="grid items-center gap-10 rounded-3xl border bg-card p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <SectionHeading
              eyebrow="The reader"
              title="A reading room you set up your way"
              intro="Long-form reading should be comfortable. Every chapter opens in a reader you can tune to your eyes, your screen and your light."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              {READER_FEATURES.map((feature) => (
                <FeatureItem key={feature.title} {...feature} />
              ))}
            </div>
          </div>

          {/* A taste of the four reading themes. */}
          <div aria-hidden="true" className="grid grid-cols-2 gap-3">
            {READING_THEME_SWATCHES.map((swatch, index) => (
              <div
                key={swatch.name}
                className={`rounded-xl border p-4 shadow-sm ${index % 2 === 1 ? "translate-y-4" : ""}`}
                style={{ backgroundColor: swatch.background, color: swatch.text }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">{swatch.name}</p>
                <p className="mt-2 font-serif text-sm font-semibold">Chapter One</p>
                <p className="mt-1 font-serif text-xs leading-relaxed opacity-80">
                  Once, in a village at the edge of the forest, there lived a girl who…
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Finding stories */}
        <section>
          <SectionHeading
            eyebrow="Finding your next story"
            title="Wander the world, or let it find you"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DISCOVERY.map(({ icon: Icon, title, description, to }) => (
              <Link
                key={title}
                to={to}
                className="group flex gap-3 rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold group-hover:text-primary">{title}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Personal features */}
        <section>
          <SectionHeading
            eyebrow="With a free account"
            title="Your reading life, kept for you"
            intro="Sign in to keep your place, track how far you've travelled and get suggestions that fit."
          />
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {PERSONAL.map((feature) => (
              <FeatureItem key={feature.title} {...feature} />
            ))}
          </div>
        </section>

        {/* Languages, writers */}
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="tinted-panel rounded-2xl border p-6 [--tint:#0ea5e9] [--tint-2:#10b981]">
            <span className="tinted-chip flex h-10 w-10 items-center justify-center rounded-xl border">
              <Languages className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-xl font-bold">Stories in many languages</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Stories are published in their own languages, and many come in more than one translation. Browse by
              language on the Discover page — and for Nepali readers, our companion site{" "}
              <a href="https://nepalikatha.worldstories.net" className="tinted-link font-medium hover:underline">
                नेपाली कथा
              </a>{" "}
              collects our Nepali stories in one place.
            </p>
          </div>
          <div className="tinted-panel rounded-2xl border p-6 [--tint:#f43f5e] [--tint-2:#f59e0b]">
            <span className="tinted-chip flex h-10 w-10 items-center justify-center rounded-xl border">
              <PenLine className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-xl font-bold">For writers</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Have a story to tell? Submit it to be considered for the library, and keep an eye on our writing contest.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link to="/publish">Submit a story</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/contest">The contest</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Publisher / contact — per the admin's Site Settings switch. */}
        <section className="rounded-2xl border border-primary/15 bg-primary/5 p-6 sm:p-8">
          <h2 className="text-xl font-semibold">{identity.showPublisher ? "About the Publisher" : "Get in Touch"}</h2>
          <div className="mt-3 space-y-3 text-sm sm:text-base">
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
            <p className="flex flex-wrap items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Questions, feedback or rights enquiries:{" "}
              <a href={`mailto:${identity.email}`} className="font-medium text-primary hover:underline">
                {identity.email}
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default About;
