import { type RouteConfig, route, layout, index } from "@react-router/dev/routes";

export default [
  layout("layouts/DefaultLayout.tsx", [
    index("pages/Index.tsx"),
    route("login", "components/OpenLoginModalRedirect.tsx", { id: "login-redirect" }),
    route("register", "components/OpenLoginModalRedirect.tsx", { id: "register-redirect" }),
    route("library", "pages/Library.tsx"),
    route("trending", "routes/trending-redirect.tsx"),
    route("discover", "pages/Discover.tsx"),
    route("audiobooks", "pages/Audiobooks.tsx"),
    route("quick-reads", "pages/QuickReads.tsx"),
    route("authors", "pages/Authors.tsx"),
    route("authors/:id", "pages/AuthorDetail.tsx"),
    route("contest", "pages/Contest.tsx"),
    route("search", "pages/Search.tsx"),
    route("publish", "pages/Publish.tsx"),
    route("profile", "pages/Profile.tsx"),
    route("downloads", "pages/Downloads.tsx"),
    route("about", "pages/About.tsx"),
    route("contact", "pages/Contact.tsx"),
    route("privacy", "pages/Privacy.tsx"),
    route("terms", "pages/Terms.tsx"),
    route("story/:slug", "pages/StoryDetail.tsx"),
    route("quick-read/:slug", "pages/StorySummary.tsx"),
    route("story/:slug/pdf", "pages/PdfReader.tsx"),
    route("story/:slug/epub", "pages/EpubReader.tsx"),
    route("read/:story_slug/:chapter_slug", "pages/StoryReader.tsx"),
    route("listen/:story_slug/:chapter_slug", "pages/AudiobookPlayer.tsx"),
    // Catch-all for unknown paths inside the default layout.
    route("*", "pages/NotFound.tsx", { id: "default-not-found" }),
  ]),

  route("admin", "layouts/AdminLayout.tsx", [
    route("login", "pages/AdminLogin.tsx"),
    layout("layouts/RequireAdminAuth.tsx", [
      layout("layouts/AdminShellLayout.tsx", [
        index("pages/AdminHome.tsx"),
        route("content", "pages/AdminContent.tsx"),
        route("submissions", "pages/AdminSubmissions.tsx"),
        route("analytics", "pages/AdminAnalytics.tsx"),
        route("categories", "pages/AdminCategories.tsx"),
        route("authors", "pages/AdminAuthors.tsx"),
        route("users", "pages/AdminUsers.tsx"),
      ]),
    ]),
    route("*", "pages/NotFound.tsx", { id: "admin-not-found" }),
  ]),
] satisfies RouteConfig;
