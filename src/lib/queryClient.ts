import { QueryClient } from "@tanstack/react-query";

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
      },
    },
  });

let browserQueryClient: QueryClient | undefined;

/**
 * The browser keeps one client for the whole session. The server must not:
 * a module-level client there is shared by every request, so a query seeded
 * from one request's loader (useHomeData's `initialData`) would be served
 * from that cache to later requests for up to staleTime — stale HTML that
 * then mismatches the fresh data the browser hydrates with, and one
 * visitor's cached data rendered for another. So: a fresh one per render.
 */
export function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
