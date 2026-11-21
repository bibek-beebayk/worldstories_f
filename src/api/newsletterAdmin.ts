import { apiClient, fetchAuthenticatedFile } from "./client";
import type { NewsletterSource, NewsletterStatus } from "./types";

export type AdminSubscriberStatus = Exclude<NewsletterStatus, "none">;

export interface AdminNewsletterWeeklyGrowthPoint {
  week_start: string;
  confirmed: number;
  by_source: Record<string, number>;
}

export interface AdminNewsletterWeekdayLoadPoint {
  weekday: number;
  label: string;
  count: number;
}

export interface AdminNewsletterStats {
  confirmed: number;
  pending: number;
  unsubscribed: number;
  total: number;
  new_this_week: number;
  unsubscribe_rate: number;
  weekly_growth: AdminNewsletterWeeklyGrowthPoint[];
  weekday_load: AdminNewsletterWeekdayLoadPoint[];
  daily_send_limit: number;
}

export interface AdminNewsletterSubscriber {
  id: number;
  email: string;
  status: AdminSubscriberStatus;
  source: NewsletterSource;
  language: string;
  send_weekday: number | null;
  created_at: string;
  confirmed_at: string | null;
  last_digest_sent_at: string | null;
}

export interface AdminNewsletterSubscribersParams {
  q?: string;
  status?: AdminSubscriberStatus | "all";
  source?: NewsletterSource | "all";
  weekday?: number | "all";
  page?: number;
  page_size?: number;
}

export interface AdminNewsletterSubscribersResponse {
  count: number;
  page: number;
  page_size: number;
  results: AdminNewsletterSubscriber[];
}

export type AdminDigestIssueStatus = "started" | "finished" | "failed";

export interface AdminDigestIssue {
  id: number;
  issue_date: string;
  subject: string;
  featured_story_title: string | null;
  featured_story_slug: string | null;
  status: AdminDigestIssueStatus;
  sent_count: number;
  failed_count: number;
  started_at: string;
  finished_at: string | null;
}

export interface AdminNewsletterIssuesResponse {
  count: number;
  page: number;
  page_size: number;
  results: AdminDigestIssue[];
}

export interface AdminDigestDelivery {
  id: number;
  email: string;
  status: "sent" | "failed";
  error: string;
  sent_at: string | null;
}

export interface AdminNewsletterDeliveriesResponse {
  results: AdminDigestDelivery[];
}

export interface AdminNewsletterRetryResponse {
  attempted: number;
  sent: number;
  failed: number;
  remaining_failed: number;
}

export interface AdminNewsletterDetailResponse {
  detail: string;
}

export interface AdminNewsletterPreviewResponse {
  subject: string | null;
  html: string | null;
  reason?: string;
}

function buildSubscriberQuery(params: AdminNewsletterSubscribersParams): URLSearchParams {
  const qs = new URLSearchParams();
  if (params.q && params.q.trim()) qs.set("q", params.q.trim());
  if (params.status && params.status !== "all") qs.set("status", params.status);
  if (params.source && params.source !== "all") qs.set("source", params.source);
  if (params.weekday !== undefined && params.weekday !== "all") qs.set("weekday", String(params.weekday));
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.page_size !== undefined) qs.set("page_size", String(params.page_size));
  return qs;
}

export const newsletterAdminApi = {
  getStats: () => apiClient<AdminNewsletterStats>("/admin/newsletter/stats/"),

  getSubscribers: (params: AdminNewsletterSubscribersParams = {}) => {
    const qs = buildSubscriberQuery(params).toString();
    return apiClient<AdminNewsletterSubscribersResponse>(`/admin/newsletter/subscribers/${qs ? `?${qs}` : ""}`);
  },

  exportSubscribersCsv: async (
    params: Omit<AdminNewsletterSubscribersParams, "page" | "page_size"> = {},
  ): Promise<string> => {
    const qs = buildSubscriberQuery(params).toString();
    const today = new Date().toISOString().slice(0, 10);
    const { buffer, filename, contentType } = await fetchAuthenticatedFile(
      `/admin/newsletter/subscribers/export/${qs ? `?${qs}` : ""}`,
      `newsletter-subscribers-${today}.csv`,
    );
    const blob = new Blob([buffer], { type: contentType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return filename;
  },

  resendConfirmation: (id: number) =>
    apiClient<AdminNewsletterDetailResponse>(`/admin/newsletter/subscribers/${id}/resend-confirmation/`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  unsubscribeSubscriber: (id: number) =>
    apiClient<AdminNewsletterSubscriber>(`/admin/newsletter/subscribers/${id}/unsubscribe/`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  getIssues: (page: number = 1, pageSize: number = 20) =>
    apiClient<AdminNewsletterIssuesResponse>(`/admin/newsletter/issues/?page=${page}&page_size=${pageSize}`),

  getIssueDeliveries: (issueId: number, status: "failed" | "sent" | "all" = "failed") =>
    apiClient<AdminNewsletterDeliveriesResponse>(
      `/admin/newsletter/issues/${issueId}/deliveries/?status=${encodeURIComponent(status)}`,
    ),

  retryFailedDeliveries: (issueId: number) =>
    apiClient<AdminNewsletterRetryResponse>(`/admin/newsletter/issues/${issueId}/retry-failed/`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  sendTestDigest: (storySlug?: string) =>
    apiClient<AdminNewsletterDetailResponse>("/admin/newsletter/test-send/", {
      method: "POST",
      body: JSON.stringify(storySlug ? { story_slug: storySlug } : {}),
    }),

  getPreview: () => apiClient<AdminNewsletterPreviewResponse>("/admin/newsletter/preview/"),
};
