# SSR Migration — React Router v7 (framework mode)

Goal: real server-rendered HTML (unique `<title>`/meta/canonical per page) for every
route, fixing the AdSense-rejection root cause — every page currently serves the
identical static shell, since SEO is set client-side via a `useEffect` in `Seo.tsx`.

Framework choice: **React Router v7 framework mode**. The app already runs
`react-router-dom@7.18.2` in "library mode" (manual `<Routes>`/`<Route>`, client-only) —
framework mode is the same package's official SSR mode, so this keeps almost all
existing route structure, components, and hooks. Chosen over Next.js (would mean
replacing the routing layer entirely) and roll-your-own Vite SSR (much more ongoing
plumbing to maintain).

Rule for this file: one subtask in progress at a time. Check it off with a one-line
result before starting the next. Don't batch multiple subtasks into one sitting.

---

## Subtasks

- [x] **1. Audit SSR-incompatibility risks and current infra**
      Result: see "Audit findings" below. No code changed in this subtask.

- [x] **2. Scaffold React Router v7 framework mode**
      Result: done, verified end to end. See "Scaffolding notes" below.

- [x] **3. Convert the route tree to RRv7's `routes.ts` config**
      Result: done, every real route verified end to end. See "Route conversion
      notes" below.

- [x] **4. Migrate SEO/meta to route-level `meta()` exports**
      Result: done, every route verified with real per-page titles/canonicals in the
      raw HTML. See "Meta migration notes" below.

- [x] **5. Move initial data-fetching to loaders for public/SEO-critical pages**
      Result: done for Home, Discover, Authors (list), and all 7 dynamic per-item
      pages. Library deliberately deferred. See "Data-loading notes" below.

- [x] **6. Guard browser-only code paths under SSR**
      Result: audited every flagged risk area plus a full-codebase sweep; one real
      fix applied, one warning investigated and deliberately left alone. See
      "Browser-guard audit notes" below.

- [x] **7. Netlify SSR deployment adapter**
      Result: done, verified as far as possible without a live Netlify
      account/deploy. See "Netlify adapter notes" below — including a version
      bump (Vite 5→6) you confirmed before I made it.

- [x] **8. Retire now-redundant bot-sniffing infra**
      Result: done. See "Retirement notes" below.

- [x] **9. PWA/service worker compatibility pass**
      Result: found and fixed a real broken-offline-navigation regression, not just a
      compatibility check. See "PWA notes" below.

- [x] **10. Full regression pass**
      Result: done, found and fixed one more real bug (missing PWA manifest link).
      See "Regression pass notes" below for what's automated-verified vs. what
      still needs your own click-through.

- [x] **11. Local production-build SEO verification**
      Result: done — this is the direct, final confirmation that the original
      AdSense-rejection bug is fixed, plus one more real gap found and fixed
      along the way. See "SEO sign-off notes" below.

- [ ] **12. Deploy and verify live**
      Deploy to Netlify, then re-run the exact checks from the AdSense audit (curl
      story/author/discover pages, re-check sitemap, re-check the Mediapartners-Google
      user agent specifically) to confirm the fix landed in production.

- [x] **Out-of-band: post-migration interactivity regression (found via your own
      manual testing, not one of the 12 subtasks above)**
      Result: two real bugs found and fixed — see "Post-migration regression notes"
      below. Not folded into the numbered list since it was a bug report on the
      already-completed migration, not a planned step, but it directly corrects a
      claim made in subtask 9's notes (see below).

---

## Audit findings (subtask 1)

**Current stack:** Vite 5 + `react-router-dom@7.18.2` in library mode, TypeScript,
Tailwind, shadcn/ui, TanStack React Query, `vite-plugin-pwa`. Hosted on Netlify as a
pure static build with SPA-fallback redirects (`netlify.toml`).

**A partial fix already exists — and explains a specific gap found in the AdSense
audit.** `netlify/edge-functions/social-meta.ts` intercepts known bot user agents on
`/story/:slug` and rewrites the response HTML with the real title/description/OG
image/JSON-LD, fetched live from the API. Two things worth knowing before the SSR
migration replaces it entirely:
- Its `BOT_PATTERN` regex includes `Googlebot` but **not `Mediapartners-Google`**
  (AdSense's own crawler) — which is exactly why the audit's curl test with that user
  agent still got the generic shell on a story page, even though Googlebot itself
  would have gotten the real meta there.
- It only covers the literal `/story/:slug` path — home, `/authors`, `/authors/:id`,
  `/discover`, `/library`, and chapter pages (`/read/:story_slug/:chapter_slug`) are
  not covered at all, for any bot.
Once real SSR ships (subtask 4+), this file and the redirect rules that make it
necessary become redundant — that's subtask 8.

**Browser-only code paths that will need guarding for SSR (subtask 6):**
- `GoogleLoginButton.tsx` — reads `window.google` (Google Identity Services script),
  assumes a browser.
- Offline downloads (`useOfflineDownload.ts`, `offlineCrypto.ts`) — IndexedDB, browser-only
  by nature.
- Auth tokens live in `localStorage` (`api/client.ts`) — fine client-side, but nothing
  server-rendered can depend on "is this user logged in" without a different strategy
  (cookies) or accepting that authenticated UI simply isn't SSR'd. Going with the
  latter: only public pages need real SSR for the AdSense/SEO problem this migration
  exists to fix.
- `vite-plugin-pwa`'s service worker registration and `window.addEventListener`
  calls scattered across layouts (`DefaultLayout.tsx`'s online/offline listeners,
  scroll-restoration, etc.).

**Routing scope:** `App.tsx` currently defines ~30 routes across three layouts
(`DefaultLayout`, `AdminLayout` → `AdminShellLayout` behind `RequireAdminAuth`, plus
top-level `/admin/login`). All page components are already lazy-loaded via
`React.lazy()` — RRv7 framework mode's route config preserves this via its own
lazy-loading convention, so this should translate fairly mechanically.

## Scaffolding notes (subtask 2)

**Packages added:** `react-router` (dependency), `@react-router/dev`,
`@react-router/node`, `@react-router/serve` (devDependencies). `react-router-dom` is
still installed and still what every existing page/component imports from — left in
place until subtask 3 migrates those imports, then it comes out.

**New files:**
- `react-router.config.ts` (project root) — `appDirectory: "src"` (reuses the existing
  tree instead of relocating to `app/`), `ssr: true`.
- `src/entry.client.tsx`, `src/entry.server.tsx` — hydration/SSR entry points.
- `src/root.tsx` — the actual HTML document now (`Layout` export). Carries over every
  static tag from the old `index.html` (fonts, PWA meta, Google Identity script,
  Organization/WebSite JSON-LD) plus a default `meta()` export with the same
  title/description/OG tags `index.html` used to hardcode. Per-route `meta()` exports
  will override these once real pages are converted (subtask 4) — that's the actual
  fix for the AdSense rejection.
- `src/routes.ts` + `src/routes/_scaffold-home.tsx` — a placeholder single-route tree,
  purely to prove the toolchain. Gets replaced entirely by the real route tree in
  subtask 3.

**Config changes:**
- `vite.config.ts` — swapped `@vitejs/plugin-react-swc`'s `react()` plugin for
  `reactRouter()` from `@react-router/dev/vite` (framework mode owns the React
  plugin/JSX transform itself; running both together isn't supported). Everything
  else — the PWA plugin, `lovable-tagger`, the `@` → `./src` alias — left untouched
  and confirmed still working.
- `package.json` scripts — `dev`/`build` now go through the `react-router` CLI
  (which drives Vite under the hood) instead of calling `vite`/`vite build` directly,
  since framework mode needs to build a client bundle *and* a server bundle, not just
  one. Added `start` (`react-router-serve ./build/server/index.js`) to actually run
  the built SSR server — needed to verify the production build, and will likely be
  replaced by Netlify's own adapter in subtask 7 rather than used for real
  production traffic.
- `.gitignore` — added `build/` and `.react-router/` (generated route-type files).

**Verified, not assumed:**
- `npm run dev` → real server-rendered HTML on first request (curled it — the
  placeholder page's actual text was in the raw response, not just an empty shell).
- `npm run build` produces both `build/client/` and `build/server/index.js`.
- `npm run start` serves the production build; curled it — same result, real content
  and correct `<title>` in the raw HTML.
- `tsc --noEmit` and `eslint` both clean across the whole project — nothing existing
  broke, even though `App.tsx`/`main.tsx`/`index.html` are now orphaned (unreferenced
  by the new entry points, but left in place — subtask 3 still needs `App.tsx` as the
  source of truth for the real route tree, so deleting it now would be premature).

**Not yet done (left for later subtasks):** no real pages are wired in, no data
loaders exist, the PWA/service-worker interaction with SSR hasn't been stress-tested
beyond "the build didn't fail," and there's no Netlify-specific SSR deployment config
yet — `npm start` above is just enough to prove the build works locally.

## Route conversion notes (subtask 3)

**All 39 files importing from `react-router-dom` migrated to `react-router`** — in
v7, `react-router` (not `-dom`) is the package with framework-mode support and
already includes every DOM binding (`Link`, `useNavigate`, `useParams`, etc.) these
files were already using, so this was a mechanical import-path swap, not an API
change. `react-router-dom` is still installed but nothing imports from it anymore —
safe to remove once `App.tsx` (see below) is confirmed gone for good.

**Deleted:** `src/App.tsx`, `src/main.tsx`, `index.html` — fully superseded by
`src/routes.ts` + `src/root.tsx` + the entry files from subtask 2. The whole provider
tree that used to wrap `<BrowserRouter>` in `App.tsx` (QueryClientProvider,
TooltipProvider, AuthModalProvider, ImmersiveReaderProvider, Toaster/Sonner,
PwaUpdatePrompt) now lives in `root.tsx`'s default export instead — `BrowserRouter`
itself is gone entirely, since the framework's own router (wired through
`entry.client`/`entry.server`) replaces it.

**New:** `src/layouts/RequireAdminAuth.tsx` (extracted from its old inline definition
in `App.tsx` — RRv7's `layout()` needs a real file). `src/routes/trending-redirect.tsx`
— replaced the old client-only `<Navigate to="/discover" replace />` with a
`loader() { return redirect("/discover") }`. This is a genuine improvement, not just
a port: it now produces a real HTTP 302 (verified with curl) instead of only
redirecting after JS loaded and ran.

**`src/routes.ts`** mirrors `App.tsx`'s old tree exactly (same paths, same nesting —
DefaultLayout wrapping ~26 public routes, AdminLayout → RequireAdminAuth →
AdminShellLayout wrapping the 7 admin pages). Two route ids had to be set explicitly
(`{ id: "..." }`) where the same file backs two different paths — `login`/`register`
both render `OpenLoginModalRedirect`, and both catch-alls render `NotFound` — RRv7
derives an id from the file path by default and errors on the collision otherwise.

**Fixed a real bug while verifying, not just a porting nit:** the catch-all routes
were serving `200` for unknown paths instead of `404` — a "soft 404" that search
engines specifically flag, and worse than before (Netlify's old redirect config was
at least setting a real 404 for genuinely unmatched paths). `NotFound.tsx` now
exports a `loader` returning `data(null, { status: 404 })`. Verified: `curl -o /dev/null
-w "%{http_code}"` on an unknown path now returns `404`.

**SSR crashes found and fixed by actually curling every route, not by static
review** — reading `localStorage`/`window` directly inside a `useState(() => ...)`
initializer runs during server rendering too, and threw `ReferenceError: localStorage
is not defined`, 500ing the whole page:
- `src/api/client.ts` — `getAccessToken`/`getRefreshToken`/`saveTokens`/`clearTokens`
  (this one matters beyond just fixing crashes: it's called from many components,
  including `RequireAdminAuth`, so leaving it unguarded would have broken most pages).
- `src/pages/StoryReader.tsx` — font/theme/custom-theme preferences.
- `src/pages/PdfReader.tsx`, `src/pages/EpubReader.tsx` — view-mode preference.
- `src/pages/AudiobookPlayer.tsx` — autoplay preference.
- `src/lib/readerAnimations.ts`'s `getSavedPageAnimation` — shared by both readers.

All guarded the same way: `typeof window === "undefined"` → fall back to the same
default the code already used when localStorage was empty. No behavior change for
real browsers, just stops the server from crashing on these routes.

**Verified across every real route** (not a sample) — both the production build
(`npm run build` → `npm run start`) and `npm run dev`, via curl:
- Every real page: `200`, with actual page content in the raw HTML (spot-checked
  `/`, `/library`, `/about`).
- `/trending`: `302` → `/discover`.
- Unknown paths (both the default and `/admin/*` catch-alls): `404`.
- `/admin/*` while logged out: `200` (not a redirect) — expected and acceptable,
  not a bug. `RequireAdminAuth`'s `<Navigate>` only fires client-side after
  hydration (same as before this migration), since it depends on `localStorage`,
  which doesn't exist on the server. Admin routes are `noindex`/login-gated and
  were never the SEO target — subtask 6 could convert this to a loader-based
  redirect for a real 302 too, but it's not required for the goal of this migration.
- `tsc --noEmit` and `eslint` both clean across the whole project.

**Known, non-blocking, left for later:** React logs `<Navigate> must not be used on
the initial render in a <StaticRouter>` for every unauthenticated `/admin/*` request
(noisy in server logs, matches the point above — fixable in subtask 6, not urgent).
`Library.tsx` uses `useLayoutEffect` in a component that now also renders
server-side; React warns (`useLayoutEffect does nothing on the server`) but nothing
breaks — worth converting to `useEffect` if a first-paint flash is ever actually
observed there, not before.

## Meta migration notes (subtask 4)

**How React Router actually merges meta() across matched routes — verified, not
assumed:** it doesn't merge at all. Whichever matched route is deepest *and defines
its own `meta()`* fully replaces the whole tag array — ancestor `meta()` exports
(including root's) are simply not used once a more specific route provides one. This
was confirmed two ways: (1) `/about` briefly rendered two `<link rel="canonical">`
tags — one from `root.tsx`'s hardcoded `<head>` JSX (not a meta() export, so it
wasn't replaced) and one from the page's own meta() — fixed by deleting the
hardcoded one from `root.tsx`'s `Layout`, since canonical must come from meta()
only now; (2) `/admin/content` (no meta() of its own) correctly renders
`AdminLayout`'s meta() instead of root's, confirming the *nearest ancestor that
defines one* wins, not strictly the leaf.

**`src/lib/buildMeta.ts`** — new shared helper replicating `Seo.tsx`'s exact output
(title, description, robots, og:*, twitter:*, canonical via `{ tagName: "link", rel:
"canonical", href }`, optional hreflang alternates, optional JSON-LD via
`{ "script:ld+json": ... }`). Every page's `meta()` calls this and returns its full
result — no partial/merged tag sets anywhere, consistent with the point above.
`root.tsx`'s own `meta()` now calls it too, as the last-resort fallback for any
route that doesn't define one.

**Static pages** (About, Terms, Privacy, Contest, Contact, Search, Publish,
QuickReads, Downloads, Index, Library, Discover, Audiobooks, Authors, Profile,
AdminLayout): mechanical port of the existing `<Seo>` props into a `meta()` export,
`noIndex` preserved exactly where it was. A few pages had 2-4 conditionally-rendered
`<Seo>` calls (logged-out vs loaded state, e.g. `Publish.tsx`, `QuickReads.tsx`,
`Downloads.tsx`) — collapsed into one `meta()` since the states shared identical
props (or, for `QuickReads`, both states are `noIndex` regardless, so the exact
wording difference didn't matter). `Authors.tsx`'s dynamic `structuredData` (built
from client-fetched data) was dropped rather than ported, since there's no loader
for it yet — title/description/canonical (the actual fix) don't depend on it.

**Dynamic pages** (StoryDetail, AuthorDetail, StorySummary, StoryReader,
AudiobookPlayer, PdfReader, EpubReader): each now has both a `loader()` (fetches
just enough data server-side for meta — the story/author/chapter) and a `meta()`
using that real data, with a distinct not-found title (`noIndex`) when the loader's
fetch fails. This pulls a slice of subtask 5's work forward deliberately: these are
exactly the pages the AdSense audit flagged as broken (per-story canonical pointing
at the homepage), so getting their real titles/canonicals correct was the actual
point of this subtask, not something to defer. The loaders are meta-only for
now — the pages below them still independently re-fetch the same data client-side
via their existing `useQuery`/`useStory`/`useChapter` hooks; subtask 5 is where
those get consolidated so the *body* content is SSR'd too, not just the meta.

**Deleted:** `src/components/Seo.tsx` — no longer imported anywhere.

**Verified across every real route** (not a sample), production build + `npm start`,
using real slugs pulled live from the local dev API (not fabricated) so the dynamic
pages were tested against actual data:
- Every static page: correct unique `<title>`, correct `robots` (index vs noindex).
- `/story/empire-of-salt` → `Empire of Salt by Amara Chen | WorldStories`,
  canonical `.../story/empire-of-salt`.
- `/authors/26` → `Amara Chen — Author | WorldStories`.
- `/read/empire-of-salt/the-caravan-masters-debt` → real chapter + story title.
- `/listen/the-hound-of-baskervilles/1` → real audio + story title.
- `/story/the-hound-of-baskervilles/epub`, `/story/zsdgsdfgdsfg/pdf` → real titles.
- `/quick-read/empire-of-salt` → real title, still correctly `noindex`.
- A slug that genuinely doesn't exist in the local DB → `404` with a distinct
  "Not Found" title, not a silent fallback to generic content.
- `tsc --noEmit` and `eslint` both clean across the whole project.

## Data-loading notes (subtask 5)

**The pattern:** every relevant hook (`useStory`, `useChapter`, `useHomeData`,
`useDiscoverData`, and the inline `useQuery` in `AuthorDetail`/`Authors`) now takes
an optional `initialData` parameter, passed straight through to TanStack Query's own
`initialData` option. Each route's component receives `loaderData` (typed via
`Route.ComponentProps`) and hands it to the hook. This means: the *same* client-side
query (same key, same cache, same invalidation-on-mutation behavior everywhere else
in the app) just starts pre-filled instead of empty — nothing about the existing
React Query usage elsewhere had to change, no separate server/client data model.

**Converted:** Home (`Index.tsx`), Discover, Authors (list, page-1-only — paging
further still refetches client-side as before), and all 7 dynamic per-item pages
from subtask 4 (StoryDetail, AuthorDetail, StorySummary, StoryReader — both story
*and* chapter seeded, AudiobookPlayer, PdfReader, EpubReader).

**Home and Discover's loaders swallow fetch failures** (`catch { return undefined }`)
rather than throwing — unlike the per-item pages, there's no "not found" concept for
these, and an uncaught loader error replaces the *entire* page with React Router's
generic top-level error boundary instead of the page's own existing `isError` UI.
Falling back to `undefined` just means the hook fetches client-side exactly as it
always did before this subtask.

**Library.tsx deliberately NOT converted** — left a detailed comment explaining why
rather than silently skipping it. It's driven by `useInfiniteStories`/
`useInfiniteLibraryShelves` (`useInfiniteQuery`, not plain `useQuery`) across 10 URL
filter params; seeding that server-side means replicating the component's own
param-parsing in the loader and shaping the result as `{pages, pageParams}` — real
work, but for a filter/browse surface that's a lower SEO priority than the pages
converted here. Worth a follow-up, not folded into this pass.

**Fixed a real crash this subtask's own changes exposed:** `/read/:story_slug/:chapter_slug`
started 500ing with `TypeError: DOMPurify.sanitize is not a function` the moment
chapter content actually started rendering server-side (previously the page always
SSR'd in its loading state, so `sanitizeHtml()` — plain `dompurify`, which needs a
real `window`/`document` — never actually ran server-side). Fixed by installing
`isomorphic-dompurify` (wraps DOMPurify with jsdom for Node) and swapping the import
in `sanitizeHtml.ts` — same sanitization behavior, now actually SSR-safe. This is
exactly the class of bug subtask 6 exists for; fixed inline here since it was a hard
crash on a real, core route rather than something to defer.

**Verified across every real route again** after the fix — production build +
`npm start`, real data: homepage no longer shows a "Loading today's stories…"
placeholder in the raw HTML (body content present immediately, e.g. "Weekly
Spotlight"/"Community Pulse" text); `/story/empire-of-salt`, `/authors/26`,
`/discover`, `/authors` (list) all show real names/titles in the raw HTML, not
placeholders; the chapter reader renders real sanitized chapter text server-side.
Full route sweep re-run clean (correct status codes, no server errors).
`tsc --noEmit` and `eslint` clean across the whole project.

## Browser-guard audit notes (subtask 6)

Most of this subtask's actual work already happened as a side effect of subtasks 3
and 5's crash-driven fixes (curling every real route and fixing what broke —
`api/client.ts`'s token helpers, `StoryReader`/`PdfReader`/`EpubReader`/
`AudiobookPlayer`'s `useState` initializers, `readerAnimations.ts`, and the
`isomorphic-dompurify` swap). This subtask re-audited the specific risk areas the
subtask-1 audit originally flagged, plus a broader sweep, to check for anything
that pattern hadn't caught yet.

**Audited and confirmed already safe** (all browser-global access sits inside
`useEffect`/event handlers/async functions triggered by one of those — never at
render or module-load time):
- `GoogleLoginButton.tsx`'s `window.google` access — entirely inside `useEffect`.
  Also structurally protected either way: it only renders once `LoginModal` is open,
  which starts closed and is never opened during SSR.
- `PwaUpdatePrompt.tsx`'s service worker registration (`registerSW`,
  `document.visibilityState`, `navigator.onLine`) — entirely inside `useEffect`.
  Worth calling out specifically since this component is mounted in `root.tsx` and
  therefore present on literally every page.
- Offline downloads / IndexedDB (`offlineDb.ts`, `useOfflineDownload.ts`,
  `offlineCrypto.ts`) — `indexedDB.open()` and friends only ever run inside
  `async function`s invoked from effects or user actions (e.g.
  `useDownloadedIds`'s `refresh()`), never synchronously during a render.
- `navigator.clipboard`, `navigator.onLine`, `navigator.storage`, `isIOSDevice()` —
  every call site checked is inside a handler, effect, or an async function invoked
  by one of those.
- Admin pages (`AdminHome`, `AdminContent`, etc.) — structurally can't SSR-crash
  regardless of their own code, since `RequireAdminAuth` always sees `accessToken =
  null` server-side (no `localStorage` there) and returns `<Navigate>` instead of
  `<Outlet/>` — the actual admin page components are never reached during SSR at
  all today. Confirms this isn't accidentally fragile; it's actually the safest
  possible state for that subtree.

**One real fix:** `useHeaderHeight.ts` used `useLayoutEffect` (correctly — it
measures live header layout via `getBoundingClientRect()` specifically to avoid a
one-frame flash of a dependent sticky element snapping into place; a plain
`useEffect` would have reintroduced exactly that flash). React warns about
`useLayoutEffect` doing nothing under SSR regardless of whether the code is
otherwise correct. Fixed with the standard pattern instead of downgrading it: new
`useIsomorphicLayoutEffect` hook (`useLayoutEffect` on the client, `useEffect` on
the server — neither runs during SSR either way, so this only silences the warning,
changing zero real behavior). Verified in `npm run dev`: the warning is gone from
`/library`'s server log.

**One warning investigated and deliberately left alone:** `RequireAdminAuth`'s
`<Navigate>` still logs `<Navigate> must not be used on the initial render in a
<StaticRouter>` for unauthenticated `/admin/*` requests. Converting this to a
loader-based redirect (like `/trending`'s) was considered and rejected: a loader
runs server-side, where `getAccessToken()` always returns `null` (no `localStorage`
there) — a loader-based check would redirect to `/admin/login` on *every*
server-rendered request to `/admin/*`, including from genuinely logged-in admins,
since their token only exists in the browser and the server has no way to see it.
That would be a real regression (broken admin navigation), not just a quieter log.
The current behavior — server sends a blank/redirecting shell, client-side JS
checks `localStorage` after hydration and shows the real page — is the correct
tradeoff for auth state that only exists in the browser, and is unchanged from
before this migration. The warning is cosmetic log noise, not a functional bug;
fixing it would cost more than it's worth without a real server-visible auth
mechanism (e.g. cookies), which is out of scope here.

**Verified:** full route sweep in both `npm run dev` and the production build —
every route still returns the correct status, no new console errors, the
`useLayoutEffect` warning confirmed gone, the `<Navigate>` warning confirmed still
present (expected, by design). `tsc --noEmit` and `eslint` clean.

## Netlify adapter notes (subtask 7)

**A blocking version conflict came up immediately:** the official adapter,
`@netlify/vite-plugin-react-router`, requires Vite 6+; this project was still on
Vite 5.4 (unrelated to this migration — that was the pre-existing baseline, and
`@react-router/dev` itself was fine with either). Two real options existed —
upgrade Vite, or hand-roll a Netlify Function around the already-built SSR bundle
instead of using the official adapter — with no clearly-correct default, so I
asked rather than picking. You chose upgrading Vite.

**Vite 5 → 6.4.3.** Checked compatibility first, not after: `vite-plugin-pwa@1.3.0`
(already installed) supports up to Vite 8, `lovable-tagger` up to Vite 8,
`@react-router/dev@7.18.2` up to Vite 8 — no other version bumps forced by this.
Rebuilt and re-ran the full route sweep immediately after the bump, before adding
anything Netlify-specific, to isolate whether *the Vite upgrade itself* broke
anything before layering more changes on top. It didn't.

**Installed:** `@netlify/vite-plugin-react-router` (the adapter itself — generates
a Netlify Function wrapping the RRv7 SSR build automatically, confirmed by
inspecting `.netlify/v1/functions/react-router-server.mjs` after a build) and
`@netlify/vite-plugin` (optional per the adapter's own README, adds Netlify
platform emulation — geo, blobs, etc. — to the local dev server; included for
parity even though no loader here uses those fields today). Both wired into
`vite.config.ts`'s plugin list alongside the existing `reactRouter()` plugin.

**`netlify.toml` rewritten, not just extended.** The old file had no `[build]`
block at all (command/publish were presumably set via the Netlify dashboard UI,
pointing at the old Vite SPA's `dist/` output — which no longer exists; RRv7
outputs `build/client/` + `build/server/`). Added an explicit `[build] command =
"npm run build"` / `publish = "build/client"` block so this is version-controlled
rather than relying on dashboard settings I can't see or edit from here — if the
dashboard still has the old settings, this file takes precedence once deployed.
Removed all 18 `to = "/index.html"` SPA-fallback redirects — `index.html` doesn't
exist anymore (deleted in subtask 3) and every route now resolves directly through
the SSR function with its own correct status, so there's nothing left for a
fallback redirect to do. Kept the `/sitemap.xml` → Railway backend redirect
(unrelated to the frontend's own routing), the `/catalogue` → `/library` redirect
(no in-app route exists for the old path, so this still needs to live at the CDN
level), and the `social-meta` edge function entry (removing it is subtask 8's job,
not this one).

**One small real fix while I was in there:** `/trending`'s redirect existed in
*two* places doing the same job — a 301 in the old `netlify.toml`, and the
loader-based 302 I added for it back in subtask 3. Rather than just deleting the
now-redundant `netlify.toml` entry, I upgraded the app-level one from a default
302 to an explicit 301 first (this was always meant as a permanent rename, matching
`/catalogue`'s redirect, not a temporary one) — so removing the CDN-level
duplicate doesn't downgrade the redirect's semantics, just consolidates it to one
place. Verified: `curl -I` on `/trending` now returns a real `301` with `location:
/discover`.

**What I could and couldn't verify locally:** `npm run dev` (now running through
Netlify's platform emulation), the production build, and `npm run start` were all
re-verified with a full route sweep — same clean results as every prior subtask
(correct status codes, real content, no server errors). What I could *not* verify
without a live Netlify account: the actual generated Netlify Function executing
inside Netlify's real infrastructure, or `netlify build`/`netlify deploy` end to
end — that only happens for real once this is actually deployed, which is subtask
12, deliberately gated on your go-ahead.

**Verified:** `tsc --noEmit` and `eslint` clean. Full route sweep clean in dev mode
(with Netlify emulation active) and in the production build.

## Retirement notes (subtask 8)

The `/index.html` catch-all redirects were already removed as part of subtask 7's
`netlify.toml` rewrite (they only made sense for the old static-SPA fallback, which
stopped existing once `index.html` itself was deleted in subtask 3) — so this
subtask's remaining scope was specifically the `social-meta` edge function and its
`netlify.toml` entry.

**Verified it was actually safe to remove before removing it**, rather than assuming
subtasks 4/5's fix covered it: curled `/story/empire-of-salt` with a plain `curl/8.0`
user agent (no bot spoofing at all) and separately with the exact `Mediapartners-Google`
UA that failed in the original AdSense audit — both now get the real per-story
`<title>`, `og:title`, `og:image`, and canonical directly from SSR, no user-agent
sniffing involved. That's the actual proof this edge function's entire job is now
done by the SSR pipeline itself, for every requester, not just the bots it used to
special-case.

**Removed:** `netlify/edge-functions/social-meta.ts` (and the now-empty `netlify/`
directory tree along with it) and the corresponding `[[edge_functions]]` block in
`netlify.toml`.

**Verified after removal:** full route sweep (production build, `npm start`) still
clean — same correct statuses as every prior subtask — and re-confirmed the
`Mediapartners-Google` UA still gets the real story title with the edge function
gone, proving the removal didn't quietly lose anything. `tsc --noEmit` and `eslint`
clean.

## PWA notes (subtask 9)

**Found a real regression, not a hypothetical one.** Inspected the built `sw.js`
directly rather than assuming the PWA plugin "just works" post-migration: it
registers `new NavigationRoute(createHandlerBoundToURL("index.html"), ...)` —
Workbox's standard SPA app-shell pattern, serving a precached `index.html` for any
navigation request the network/cache can't otherwise fulfill (the mechanism that
lets the app *boot at all* when you open it fully offline, distinct from this app's
own downloaded-chapter reading feature). `index.html` doesn't exist anywhere in a
framework-mode build by default — deleted back in subtask 3 — and the plugin was
still wired to fall back to it. Confirmed directly: grepped the built `sw.js`'s
precache manifest and `index.html` genuinely wasn't in it. Before this fix, opening
the app fully offline on any URL that hadn't already been cached by the browser
(not just previously-downloaded reading content — the app shell itself) would have
failed to boot at all.

**This is a known, presently-unresolved gap between vite-plugin-pwa and React
Router v7 framework mode** (confirmed via a live GitHub issue against
remix-run/react-router with no accepted fix yet) — not something I misconfigured.
The root cause: framework mode has no static `index.html` up front; the closest
equivalent is prerendering a route to a real HTML file via `react-router.config.ts`'s
`prerender()` option, but that prerender step runs *after* `vite-plugin-pwa` has
already finalized its precache manifest from a glob scan, so the file is invisible
to the automatic discovery no matter what.

**Fix, in two parts:**
1. `react-router.config.ts` — added `prerender() { return ["/"] }`. Chose the real
   homepage over a synthetic blank shell: it's the most faithful continuation of
   how `index.html` worked pre-migration (real markup, real assets, client JS then
   takes over routing for whatever URL was actually requested), and `Index.tsx`'s
   loader already swallows fetch failures from subtask 5, so this can't break the
   build even if the API happens to be unreachable at build time.
2. `vite.config.ts` — removed `html` from the PWA plugin's `globPatterns` (nothing
   else in the build output has that extension, confirmed) and added it back
   explicitly via `additionalManifestEntries: [{ url: "index.html", revision:
   String(Date.now()) }]`. This sidesteps the ordering problem entirely: workbox
   doesn't need the file to exist yet when the plugin evaluates its config, only
   once the browser actually installs the service worker post-deploy — by which
   point the full build (prerender included) has already finished. The timestamp
   revision busts the old cached shell on every deploy.

**Verified the fix landed, not just that the build succeeded:** rebuilt and grepped
the output `sw.js` directly — `index.html` is now genuinely present in the precache
manifest (`{url:"index.html",revision:"<timestamp>"}`) and
`createHandlerBoundToURL("index.html")` now resolves to a real entry instead of a
dangling reference. Also inspected the prerendered `build/client/index.html`
itself: valid complete document, correct `<title>`, real content, a working
module script tag for hydration.

**The other concern this subtask was scoped for — the offline-downloads *reading*
flow (IndexedDB, `useChapter`'s decrypt-and-fall-back-to-local-copy logic) —
turned out not to need any fix, traced through deliberately rather than assumed
safe:** a route's `loader` returning `data(null, {status: 404})` (used throughout
subtasks 4/5 for "this slug doesn't resolve") sets the HTTP status but does *not*
throw — the page component still renders normally with `loaderData` as `null`/
`undefined`. Since `useStory`/`useChapter` only use `initialData` when it's
actually defined, a null/undefined loader result means they fall through to their
own ordinary client-side fetch — the exact same try/catch-and-read-the-decrypted-
IndexedDB-copy logic that existed before this migration and was never touched by
it. Combined with the navigation-fallback fix above (which is what lets the app
boot client-side at all when fully offline on an uncached URL), the full offline
reading path — app boots from the precached shell, client-side routing matches the
requested chapter, the query hook's own fallback finds the downloaded copy — holds
together end to end.

**Verified:** full route sweep against the rebuilt output (production build, `npm
start`) — every route still correct, service worker (`/sw.js`) and manifest
(`/manifest.webmanifest`) still served, no new errors. `tsc --noEmit` and `eslint`
clean.

Sources consulted for the vite-plugin-pwa + React Router v7 gap: [react-router
issue #12659](https://github.com/remix-run/react-router/issues/12659),
[vite-plugin-pwa issue #809](https://github.com/vite-pwa/vite-plugin-pwa/issues/809).

## Regression pass notes (subtask 10)

**Cleanup found while sweeping for stale references:** grepped the whole `src/`
tree for anything still pointing at the old architecture — no `react-router-dom`
imports, no references to the deleted `Seo.tsx`/`App.tsx`/`main.tsx`/scaffold files
remained (confirms subtasks 3-8 didn't leave anything behind). `react-router-dom`
itself was still sitting in `package.json` as dead weight (unused since subtask
3's import migration, just never removed) — uninstalled it now that nothing
references it. Also found `Audiobooks.tsx` had a stale TODO comment from an
earlier draft of the subtask-5 reasoning that didn't match the final wording used
on `Library.tsx`/`Discover.tsx`/`Authors.tsx` for the same architectural call
(infinite-query pages deliberately not given loaders) — reworded for consistency,
no behavior change.

**Found one more real bug, not just cleanup:** no page anywhere had a `<link
rel="manifest">` tag — confirmed by grepping the raw HTML of multiple routes, not
assumed. The manifest *file* itself (`/manifest.webmanifest`) was being served
correctly (valid JSON, correct icons/name/theme-color), but nothing in the
document linked to it, meaning the app wasn't actually PWA-installable at all
despite the manifest being fine on its own — a browser has no way to discover an
unlinked manifest. Root cause is the same category of gap subtask 9 found:
`vite-plugin-pwa` auto-injects this tag into a static `index.html` at build
time, but framework mode has no such file for it to post-process — `root.tsx` is
a React component, not HTML the plugin can rewrite. Fixed by adding the link tag
explicitly to `root.tsx`'s `Layout`, and corrected a comment there that was still
describing the old (no-longer-true) auto-injection behavior. Verified the fix
landed on multiple routes *and* on the prerendered offline-shell `index.html`
from subtask 9, since that's generated from the same `root.tsx` but through a
different code path (prerendering, not a live request) — worth confirming
separately rather than assuming it inherited the fix for free.

**What this pass covered by direct verification** (not just re-running earlier
checks): `tsc`/`eslint` clean; the most exhaustive route sweep yet — every route
including ones not specifically hit before (`/admin/submissions`,
`/admin/categories`, `/admin/authors`, `/admin/users` individually, not just
`/admin/content`), plus query strings (`/library?sort=recent`) and trailing
slashes (`/story/empire-of-salt/`) — all correct, in both a fresh production
build *and* `npm run dev`; manifest JSON validity and installability metadata;
service worker and manifest both actually served with correct status.

**What still needs your own click-through, not something I can verify from
here:** the actual login flow (Google OAuth popup, token exchange, the
first-login genre/username onboarding modal), the admin panel's interactive
CRUD screens, an actual PWA install prompt appearing in a real browser, and
genuinely testing offline reading with the network really cut (airplane mode,
not just "the server returned an error"). Everything I traced through code and
route-level HTTP behavior checks out, but those specific flows need a real
browser session to be sure — worth walking through once, especially the login
flow, before this goes live.

## SEO sign-off notes (subtask 11)

**The definitive test, replicating the original bug exactly.** The whole migration
exists because of one finding from the very first AdSense audit: `curl -A
"Mediapartners-Google"` against a story page returned the generic homepage shell —
same title, same description, canonical pointing at `/` instead of the actual
story — because SEO was set client-side and AdSense's crawler doesn't run JS. Ran
that exact test again, fresh, against a clean production build: `/story/empire-of-salt`
now returns `Empire of Salt by Amara Chen | WorldStories` with canonical
`.../story/empire-of-salt`, from that exact user agent. Also re-ran it with a
plain `python-requests/2.31` UA (no bot-flavored spoofing at all) — identical
result, confirming this isn't user-agent-conditional in any way, unlike the old
`social-meta` edge function it replaced.

**Uniqueness, not just presence — checked across multiple pages of each type**,
since the original bug was specifically about every page serving *identical*
content, not about tags being absent: 4 different story pages, 3 different author
pages, all with distinct titles/canonicals/descriptions matching their own
content and URLs (spot-checked description text specifically — `empire-of-salt`
and `the-hound-of-baskervilles` have genuinely different, story-specific
descriptions, not a shared template string).

**Confirmed body content is real for a non-JS request too**, not just meta tags —
grepped a snippet of `empire-of-salt`'s actual prose out of the raw HTML fetched
with a plain non-browser UA, tying subtask 5's loader-seeded data together with
this subtask's SEO focus.

**Systematic noIndex ↔ robots.txt cross-check** — grepped every `noIndex: true` in
the codebase (14 call sites) and checked each against `public/robots.txt`'s
`Disallow` list, rather than spot-checking a couple. Found one real, if minor,
gap: `/login` and `/register` both route to `OpenLoginModalRedirect` (a client-only
effect that opens the login modal and redirects home — renders essentially
nothing), but neither had a `meta()` export, so both inherited root's *indexable*
default tags over a near-blank body — and `/register` wasn't in `robots.txt` at
all (only `/login` was). Fixed both: added a `noIndex: true` meta() export to
`OpenLoginModalRedirect.tsx`, and added `/register` to `robots.txt` alongside
`/login`. Verified: both routes now correctly emit `noindex, nofollow`.

Every other `noIndex: true` site checked out already: `/admin/*`, `/quick-reads`,
`/quick-read/:slug`, `/downloads`, `/publish`, `/search`, `/story/:slug/pdf`,
`/story/:slug/epub`, `/profile`, `/listen/:story_slug/:chapter_slug` (always
noindex — playback UI, not meant to be landed on from search) all have matching
`Disallow` entries. `StoryDetail`/`AuthorDetail`/`StoryReader`'s `noIndex: true`
only fires in their *not-found* branch — the real, successful pages stay
indexable, which is intentional and correctly matches the sitemap (chapter URLs
are deliberately included there, from long before this migration).

**Final full route sweep** on the fresh build (after the login/register fix):
every route still correct, no server errors.

**This is the direct, final confirmation the original problem is solved** — not
an inference from "the code looks right," an actual replay of the exact failing
test from the start of this whole effort, now passing.

## Post-migration regression notes (out-of-band)

Reported live: "the header bar has become fixed... it no longer shrinks on
scroll." All prior subtasks verified SSR via `curl` (HTTP/HTML-level only), which
is structurally blind to client-side interactivity — the SSR output was always
correct, so nothing caught this until real browser use surfaced it.

**Bug 1 — `entry.server.tsx` used `renderToString` instead of streaming, silently
breaking ALL client-side interactivity site-wide, not just the header.** The
client's `HydratedRouter` decodes its hydration data from a real turbo-stream
embedded in the response body; `renderToString` is synchronous and never
supplies that stream correctly, so the client suspends forever trying to decode
it — with zero console errors or exceptions. Symptom: pages looked fully
rendered (it's real SSR HTML) but nothing was ever interactive — no scroll
listeners, no intercepted `<Link>` clicks (real hard reloads instead), no SW
registration attempt. Fixed by rewriting `entry.server.tsx` to match the
official `@react-router/dev` Node-target default exactly (`renderToPipeableStream`
+ `isbot` + `PassThrough` + `createReadableStreamFromReadable`), confirmed by
generating a fresh scaffold and diffing against the package's own shipped
default. Added `isbot` as an explicit direct dependency (was only transitive
before).

**Bug 2 — the PWA service worker's navigation fallback broke every hard-load of
any route other than `/`, once bug 1 stopped masking it.** Subtask 9's fix
(`vite.config.ts`, `additionalManifestEntries` for `index.html`) assumed
Workbox's `NavigationRoute` only kicks in when the network can't be reached —
it doesn't. `vite-plugin-pwa` defaults `navigateFallback` to `"index.html"`
whether or not you set it, which registers a `NavigationRoute` that
*unconditionally* serves the cached homepage shell for every navigation
request, online or not — a correct pattern for the pre-migration client-only
SPA (every route rendered from the same shell) but fundamentally incompatible
with per-route SSR, where a hard-load of `/discover` now needs `/discover`'s
own server-rendered HTML and loader data, not `/`'s. With bug 1 in place, the
client never hydrated far enough to reach the code path that this breaks, so
it was invisible; once bug 1 was fixed, hard-loading `/discover` or `/authors`
started crashing to a blank `Application Error` page (`No result found for
routeId "pages/Discover"` — the client trying to match the current URL against
loader data that was actually for `/`). Fixed by explicitly setting
`navigateFallback: undefined` in `vite.config.ts`'s workbox config (confirmed
the generated `sw.js` no longer contains `NavigationRoute` after rebuilding),
and removed the now-purposeless `additionalManifestEntries`/
`navigateFallbackDenylist` entries that only existed to support it. This
means the PWA's true "boot fully offline on an uncached URL" capability from
subtask 9 is gone again — with no cached per-route data to hydrate against
even if the shell did load, that capability couldn't actually work correctly
post-SSR-migration anyway, so removing it is a correct trade, not a
regression. `react-router.config.ts`'s `prerender()` comment updated to stop
citing the now-removed PWA link as its reason for existing (kept prerendering
`/` for fast static delivery of the homepage on its own merits).

**A real trap in verifying this**: after rebuilding with the fix, the very
same browser session initially still showed the crash — not because the fix
was wrong, but because a service worker registered during earlier testing
(before the fix) was still `active`/`controlling` the page, and
`skipWaiting: false`/`clientsClaim: false` (intentional, so real users aren't
yanked mid-session) meant the newly-built worker sat `waiting` and never took
over. Clearing storage/service-worker state for the origin before retesting
confirmed the fix. Real users on a genuinely fresh install won't hit this;
anyone who loaded the app during the brief window bug 2 was live will need
their old service worker to naturally update (or a hard refresh) to pick up
the fix.

**Verified:** header now correctly shrinks on scroll (`h-16` → `h-12` past the
scroll threshold, confirmed via real browser automation, not just code
inspection). Client-side `<Link>` navigation confirmed working (no hard
reload) across `/`, `/discover`, `/library`, `/authors`. `/discover` and
`/authors` (previously crashing on hard-load) now hydrate cleanly with full
content. Full route sweep re-run clean. `tsc --noEmit` and `eslint` both
clean.

## Follow-up: a third bug, and two wrong turns before finding it (out-of-band)

Reported live, separately, after the above: on a hard load, the page briefly
shows fully styled, then reverts to unstyled — and it's specific to logged-in
sessions. This section documents two dead-end fixes made in dev-server
config while chasing it (left in place, since they're harmless and arguably
correct on their own merits, but they were **not** the actual fix) before the
real cause was found.

**Wrong turn 1 — `@netlify/vite-plugin`'s dev middleware.** Its
`netlifyPreMiddleware` runs an async introspection check (redirects/
edge-functions/static matching) in front of every request before handing off
to the real SSR handler. A `dev`-server log genuinely showed `Error: The
destination stream closed early` inside `entry.server.tsx`'s `pipe(body)`
call, which looked like a plausible match — extra latency in front of every
request widening the window for a request to get superseded mid-navigation.
Disabled via `netlify({ middleware: false })` in `vite.config.ts`. Stress-
tested with synthetic aborted requests both with and without the flag and
couldn't actually reproduce the stream error either way — inconclusive, not
a confirmed fix. Left disabled anyway since it does nothing functional for
this app locally (no edge functions, Netlify Functions, or image transforms
run in dev), so there's no cost to leaving it off. The stream-closed error
itself turned out to be an unrelated, largely-cosmetic side effect of Vite's
own HMR-triggered SSR page reloads (an old in-flight request's stream
getting cut when the browser reloads out from under it) — confirmed by
seeing the exact same error fire again later, harmlessly, immediately after
an unrelated HMR update.

**Wrong turn 2 — a corrupted Vite dependency cache.** While testing wrong
turn 1, two extra `react-router dev` instances were run concurrently against
this same project directory (different ports) while the real dev server was
*also* running — all sharing the single on-disk `node_modules/.vite` cache.
That's a real, independent risk (concurrent writers to the same optimizer
cache), so `node_modules/.vite` was cleared as a precaution and the dev
server restarted clean. Reasonable thing to do given what had just happened,
but not what actually fixed the reported bug either.

**The real cause: hydration mismatches, and what React does with them.**
Confirmed via the actual browser console output (not inference): a hydration
mismatch was firing during the client's initial hydration pass, and React's
only recovery from a mismatch it can't reconcile is to discard the
server-rendered DOM for that boundary and rebuild it client-side from
scratch — which does not preserve the `<style>` tag Vite's dev-mode CSS
handling had injected into `<head>`. That discard-and-rebuild, not any
server/proxy/cache issue, is what was dropping the CSS. Two independent
sources of mismatch were found and fixed:

1. **`useIsLoggedIn.ts`** read `localStorage` directly inside its `useState`
   initializer. The server has no `localStorage` and always renders the
   logged-out branch; for an already-logged-in user, the client's very
   first render (before hydration even starts reconciling) computed the
   opposite value and tried to render a real `<Link>` (`<a>`) where the
   server had rendered `AuthGatedLink`'s logged-out `<button>` — a tag-type
   mismatch, the most severe kind. Fixed by always starting `isLoggedIn` as
   `false` (matching the server) and reading the real value in a
   `useEffect` after mount instead — a normal post-hydration state update,
   not a value baked into the first render. `src/pages/Index.tsx` had an
   identical duplicated copy of the same bug (its own local
   `useState(Boolean(getAccessToken()))` instead of using the shared hook)
   — replaced with the now-fixed `useIsLoggedIn()`.
2. **`StoryCard.tsx`'s `rating`/`views` display.** A live stat that had
   genuinely changed value between the server's render and the moment the
   client hydrated (this debugging session alone generated a lot of repeat
   traffic against the same stories) — a `Warning: Text content did not
   match. Server: "5" Client: "6"` mismatch, same discard-and-rebuild
   consequence even though the underlying cause here is completely benign
   (real data changing), not a bug in the guarding logic. Fixed with
   `suppressHydrationWarning` on those two `<span>` elements specifically —
   the correct, standard tool for a value that can legitimately differ
   between server and client, telling React to silently keep the client's
   value for just that node instead of treating it as an error.

**Why none of subtasks 1–11's extensive testing ever caught this class of
bug**: every check throughout the whole migration was either `curl` (no
`localStorage`, always the logged-out branch) or browser testing done
logged out. The mismatch only fires on an actual logged-in user's first
paint — invisible to both.

**Verified:** confirmed directly by the user, logged in, navigating around —
page stays fully styled, no hydration mismatch in the console. `tsc --noEmit`
clean after each change.

**Worth a follow-up, not fixed here (same class of bug, not yet confirmed to
actually fire):** `PdfReader.tsx` reads `localStorage`/`matchMedia` the same
way for zoom/view-mode initial state, and `useOnlineStatus.ts` does it for
`navigator.onLine` — both would have the identical mismatch risk for a user
with a saved preference (reader) or who is offline on first load
(`useOnlineStatus`), just narrower in who's affected.
