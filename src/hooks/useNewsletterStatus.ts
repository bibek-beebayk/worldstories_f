import { useQuery } from "@tanstack/react-query";
import { newsletterApi } from "@/api/newsletter";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";

export const NEWSLETTER_STATUS_QUERY_KEY = ["newsletter-status"] as const;

export function useNewsletterStatus() {
  const isLoggedIn = useIsLoggedIn();
  return useQuery({
    queryKey: NEWSLETTER_STATUS_QUERY_KEY,
    queryFn: newsletterApi.getMe,
    enabled: isLoggedIn,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
