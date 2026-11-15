import { apiClient } from "./client";
import type { AdminFeedback, AdminFeedbackListResponse, FeedbackInput, FeedbackStatus } from "./types";

export const FEEDBACK_CATEGORIES = [
  { value: "bug", label: "Bug / problem" },
  { value: "idea", label: "Idea / suggestion" },
  { value: "content", label: "Stories & content" },
  { value: "praise", label: "Praise" },
  { value: "other", label: "Other" },
] as const;

export const FEEDBACK_STATUSES = [
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "resolved", label: "Resolved" },
] as const;

// Keep in sync with MAX_FEEDBACK_IMAGES / MAX_FEEDBACK_IMAGE_BYTES in apps/feedback/models.py.
export const MAX_FEEDBACK_IMAGES = 5;
export const MAX_FEEDBACK_IMAGE_BYTES = 5 * 1024 * 1024;
export const FEEDBACK_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export const feedbackApi = {
  // Multipart (one repeated `images` field per file) so screenshots can ride
  // along; apiClient leaves Content-Type to the browser for FormData bodies.
  submit: ({ images = [], ...fields }: FeedbackInput) => {
    const body = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") body.append(key, String(value));
    });
    images.forEach((file) => body.append("images", file));
    return apiClient<{ detail: string }>("/feedback/", { method: "POST", body });
  },
  getAdminFeedback: (page: number = 1, q: string = "", status: string = "all", category: string = "all") => {
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set("search", q);
    if (status !== "all") params.set("status", status);
    if (category !== "all") params.set("category", category);
    return apiClient<AdminFeedbackListResponse>(`/admin/feedback/?${params}`);
  },
  updateAdminFeedback: (id: number, payload: Partial<{ status: FeedbackStatus; admin_notes: string }>) =>
    apiClient<AdminFeedback>(`/admin/feedback/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAdminFeedback: (id: number) =>
    apiClient<void>(`/admin/feedback/${id}/`, { method: "DELETE" }),
};
