import type { Config } from "@react-router/dev/config";

export default {
  // Reuses the existing src/ tree instead of the framework's default app/
  // directory — this is an incremental migration of an established app, not
  // a fresh scaffold, so there's no reason to relocate everything.
  appDirectory: "src",
  ssr: true,
  // The homepage is request-time SSR. It used to be pre-rendered at build
  // time, but that would freeze the UTC-dated Daily Story until the next
  // deployment. The home API still carries its short public cache, so this
  // preserves the fast path without serving yesterday's editorial choice.
} satisfies Config;
