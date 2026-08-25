import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthModalProvider } from "@/context/AuthModalContext";
import { ImmersiveReaderProvider } from "@/context/ImmersiveReaderContext";
import { queryClient } from "@/lib/queryClient";
import PwaUpdatePrompt from "@/components/PwaUpdatePrompt";
import NavigationProgress from "@/components/NavigationProgress";
import { buildMeta } from "@/lib/buildMeta";
import "./index.css";

// Last-resort fallback only — every real page defines its own meta() (see
// buildMeta.ts), and React Router fully replaces rather than merges meta
// arrays across matched routes, so this is never rendered alongside a page's
// own tags. This used to be the ONLY meta any route ever got, client-side
// only via a useEffect in Seo.tsx — every crawler that didn't run JS saw the
// exact same title/description/canonical no matter which page it fetched.
// That's the actual fix subtask 4 is for.
export function meta() {
  return buildMeta({
    title: "WorldStories - Home of Stories",
    description:
      "WorldStories is the home for stories from around the world. Discover new tales, connect with authors, and immerse yourself in diverse narratives across genres.",
    path: "/",
  });
}

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "WorldStories",
      url: "https://worldstories.net",
      logo: "https://worldstories.net/worldstories-mark.svg",
    },
    {
      "@type": "WebSite",
      name: "WorldStories",
      url: "https://worldstories.net",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://worldstories.net/search?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
const GA_BOOTSTRAP_SCRIPT = GA_MEASUREMENT_ID
  ? `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', ${JSON.stringify(GA_MEASUREMENT_ID)});`
  : null;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* No hardcoded canonical link here — every route's meta() export
            (or the fallback above) supplies its own via buildMeta(), and
            React Router fully replaces rather than merges meta arrays
            across matched routes, so this must be the only source. */}
        <link rel="icon" href="/worldstories-logo-min.png" type="image/png" />

        {/* PWA: vite-plugin-pwa only auto-injects this link tag into a
            static index.html at build time — framework mode has no such
            file for it to post-process (root.tsx is a React component, not
            HTML the plugin can rewrite), so it has to be written here
            explicitly instead. iOS Safari doesn't read the manifest at all
            for install metadata, hence the explicit apple-* tags below too. */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#ED405A" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="WorldStories" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Open-source metric equivalents for the reader's font picker (Georgia/Times/Garamond/Helvetica
            aren't installed on most non-Mac/Windows systems, so without these the font choices silently
            collapse to whatever generic serif/sans-serif the browser falls back to). */}
        <link
          href="https://fonts.googleapis.com/css2?family=Literata:ital,wght@0,400;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=Gelasio:ital,wght@0,400;0,700;1,400&family=Tinos:ital,wght@0,400;0,700;1,400&family=Arimo:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://pub-17e5aea668624aa283be17aed25d6471.r2.dev" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="" />

        {GA_MEASUREMENT_ID && GA_BOOTSTRAP_SCRIPT ? (
          <>
            <link rel="preconnect" href="https://www.googletagmanager.com" />
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`}
            />
            <script dangerouslySetInnerHTML={{ __html: GA_BOOTSTRAP_SCRIPT }} />
          </>
        ) : null}

        <script src="https://accounts.google.com/gsi/client" async defer />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
        />

        <Meta />
        <Links />
      </head>
      <body>
        <div id="root">{children}</div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthModalProvider>
          <ImmersiveReaderProvider>
            <NavigationProgress />
            <Toaster />
            <Sonner />
            <PwaUpdatePrompt />
            <Outlet />
          </ImmersiveReaderProvider>
        </AuthModalProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
