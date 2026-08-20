import type { Config } from "@react-router/dev/config";

export default {
  // Reuses the existing src/ tree instead of the framework's default app/
  // directory — this is an incremental migration of an established app, not
  // a fresh scaffold, so there's no reason to relocate everything.
  appDirectory: "src",
  ssr: true,
  // Prerenders "/" to a real build/client/index.html — framework mode has no
  // static index.html by default (it's server-rendered per request like
  // everything else). Kept as a static file for fast edge-cached delivery of
  // the homepage; no longer tied to PWA offline fallback (see vite.config.ts
  // — navigateFallback is disabled since it broke per-route SSR).
  async prerender() {
    return ["/"];
  },
} satisfies Config;
