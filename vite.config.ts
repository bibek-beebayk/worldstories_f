import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
import netlifyReactRouter from "@netlify/vite-plugin-react-router";
import netlify from "@netlify/vite-plugin";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8080,
    allowedHosts: [
      "fetunnel.worldstories.net", // 👈 ADD THIS
    ],
  },
  plugins: [
    reactRouter(),
    netlifyReactRouter(),
    // Netlify platform emulation (context.geo, etc.) in the local dev
    // server — optional per the adapter's own docs, but this app doesn't
    // use those loader-context fields today, so it's low-stakes to include
    // for parity with production. `middleware: false` disables its
    // pre-request Netlify.handleAndIntrospectNodeRequest() check (redirects/
    // edge-functions/static matching) that runs on every single request
    // before handing off to the real SSR handler via next() — that extra
    // async work in front of every request widens the window for a request
    // to get superseded/aborted mid-navigation (e.g. React Router's
    // hover-prefetch getting cancelled), which is a strong suspect for the
    // "destination stream closed early" errors and intermittent CSS/asset
    // loss seen in dev after the streaming SSR fix. Nothing here uses
    // redirects/edge-functions/images locally, so nothing is lost.
    netlify({ middleware: false }),
    mode === "development" && componentTagger(),
    VitePWA({
      // Keep a newly-installed worker waiting until the user accepts the
      // in-app update prompt. Taking control of an already-open app would mix
      // old React code with new hashed route chunks and can leave a blank UI.
      registerType: "prompt",
      injectRegister: false,
      includeAssets: [
        "worldstories-logo-min.png",
        "worldstories-mark.svg",
        "icons/apple-touch-icon.png",
        "icons/favicon-32.png",
      ],
      manifest: {
        name: "WorldStories",
        short_name: "WorldStories",
        description:
          "WorldStories is the home for stories from around the world. Discover new tales, connect with authors, and immerse yourself in diverse narratives across genres.",
        // Matches the site's own light-mode background — shown as the
        // splash-screen background while the installed app is loading.
        background_color: "#ffffff",
        // The site's primary/accent brand color, used for the OS status bar
        // and browser toolbar when running standalone.
        theme_color: "#ED405A",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        skipWaiting: false,
        clientsClaim: false,
        // Drop precaches from previous builds when a new worker activates —
        // otherwise stale hashed chunks linger and can be served against a
        // newer SSR shell that references different hashes.
        cleanupOutdatedCaches: true,
        // vite-plugin-pwa defaults navigateFallback to "index.html", which
        // registers a Workbox NavigationRoute that unconditionally serves
        // the cached homepage shell for every navigation request (online or
        // not) — a leftover assumption from the pre-migration client-only
        // SPA, where every route rendered from that one shell. Now that each
        // route is server-rendered with its own loader data, that route
        // hijacks every hard-load/refresh of any non-"/" URL: the client
        // hydrates against the wrong page's data and crashes. Explicitly
        // disabled so navigations always hit the real SSR server.
        navigateFallback: undefined,
        // Precache the app shell (JS/CSS built by Vite + the icons above)
        // so installed/repeat visits load fast; everything dynamic (API
        // responses, story cover images) is handled by the runtime rules
        // below instead of being bundled into the precache.
        globPatterns: ["**/*.{js,css,svg,png,ico,woff2}"],
        globIgnores: [
          "**/pdf.worker*",
          "**/PdfReader-*",
          "**/EpubReader-*",
          "**/AdminAnalytics-*",
        ],
        runtimeCaching: [
          {
            // Exact Read Along pages are warmed when a compatible audio track
            // is downloaded. NetworkFirst preserves SSR freshness online and
            // uses that route-specific HTML only for an offline hard launch.
            urlPattern: ({ url, request }) =>
              request.mode === "navigate" &&
              url.origin === self.location.origin &&
              url.pathname.startsWith("/read-along/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "offline-reader-pages-v1",
              networkTimeoutSeconds: 4,
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Story/chapter/auth data etc — always prefer a fresh network
            // response so readers and admins never act on stale content;
            // the cached copy is only a fallback for brief offline blips.
            urlPattern: ({ url, request }) =>
              url.pathname.includes("/api/") && !request.headers.has("Authorization"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 8,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            // Large lazy route chunks are cached after their first online use
            // instead of being downloaded during every PWA installation.
            urlPattern: ({ url, request }) =>
              url.origin === self.location.origin &&
              (request.destination === "script" || url.pathname.includes("pdf.worker")) &&
              url.pathname.includes("/assets/"),
            handler: "CacheFirst",
            options: {
              cacheName: "lazy-route-chunks",
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Story cover images and other uploaded media (R2) rarely change
            // once published, so serve from cache first and only hit the
            // network for media not seen before. Bumped to v2 to invalidate
            // stale cached audio files from before a since-fixed encoding
            // issue — CacheFirst has no way to notice that content changed
            // at an existing URL within the expiration window, so renaming
            // the cache is what forces already-affected clients to refetch.
            urlPattern: ({ url }) => url.hostname.endsWith("r2.dev") || url.hostname.includes("r2.cloudflarestorage.com"),
            handler: "CacheFirst",
            options: {
              cacheName: "media-cache-v2",
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname === "fonts.googleapis.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: ({ url }) => url.hostname === "fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        // Service workers can mask real bugs behind a stale cache during
        // development, so only enable the SW in actual builds.
        enabled: false,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
