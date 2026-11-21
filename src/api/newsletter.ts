import { apiClient } from "./client";
import type {
  NewsletterConfirmResponse,
  NewsletterDetailResponse,
  NewsletterSource,
  NewsletterStatusResponse,
  NewsletterUnsubscribeResponse,
} from "./types";

export const newsletterApi = {
  subscribe: (email: string, source: NewsletterSource) =>
    apiClient<NewsletterDetailResponse>("/newsletter/subscribe/", {
      method: "POST",
      body: JSON.stringify({ email, source }),
    }),
  confirm: (token: string) =>
    apiClient<NewsletterConfirmResponse>("/newsletter/confirm/", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  unsubscribe: (token: string, reason = "") =>
    apiClient<NewsletterUnsubscribeResponse>(`/newsletter/unsubscribe/${encodeURIComponent(token)}/`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  resubscribe: (token: string) =>
    apiClient<NewsletterConfirmResponse>(`/newsletter/unsubscribe/${encodeURIComponent(token)}/resubscribe/`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  unsubscribeByEmail: (email: string) =>
    apiClient<NewsletterDetailResponse>("/newsletter/unsubscribe-by-email/", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  getMe: () => apiClient<NewsletterStatusResponse>("/newsletter/me/"),
  updateMe: (subscribed: boolean, source: NewsletterSource = "profile") =>
    apiClient<NewsletterStatusResponse>("/newsletter/me/", {
      method: "POST",
      body: JSON.stringify({ subscribed, source }),
    }),
};
