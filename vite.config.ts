import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
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
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
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
        // Precache the app shell (JS/CSS/HTML built by Vite + the icons
        // above) so the app can launch offline; everything dynamic (API
        // responses, story cover images) is handled by the runtime rules
        // below instead of being bundled into the precache.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        globIgnores: [
          "**/pdf.worker*",
          "**/PdfReader-*",
          "**/EpubReader-*",
          "**/AdminAnalytics-*",
        ],
        navigateFallbackDenylist: [/^\/admin/],
        runtimeCaching: [
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
            // network for images not seen before.
            urlPattern: ({ url }) => url.hostname.endsWith("r2.dev") || url.hostname.includes("r2.cloudflarestorage.com"),
            handler: "CacheFirst",
            options: {
              cacheName: "media-cache",
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
