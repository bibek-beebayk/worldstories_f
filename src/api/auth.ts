import { apiClient, getRefreshToken } from "./client";
import {
  ContinueListeningItem,
  ContinueReadingItem,
  FavoriteItem,
  MyReviewItem,
  PaginatedResponse,
  ProfileInsightsResponse,
  ReadingStreakResponse,
  Story,
  UserProfile,
} from "./types";

interface AuthResponse {
  access: string;
  refresh: string;
  user: {
    id: string;
    email: string;
    username?: string;
    name?: string;
  };
}

interface RegisterResponse {
  otp_required: boolean;
  email: string;
  message: string;
}

interface ProfileUpdatePayload {
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  preferred_genres?: number[];
}

export const authApi = {
  register: (email: string, password: string) =>
    apiClient<RegisterResponse>("/auth/register/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    apiClient<AuthResponse>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  verifyOtp: (email: string, otp: string) =>
    apiClient<AuthResponse>("/auth/validate-otp/", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    }),

  resendOtp: (email: string) =>
    apiClient<{ message: string }>("/auth/resend-otp/", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  getMe: () => apiClient<UserProfile>("/auth/me/"),
  getProfileInsights: () =>
    apiClient<ProfileInsightsResponse>("/auth/profile-insights/"),
  getReadingStreak: () =>
    apiClient<ReadingStreakResponse>("/auth/reading-streak/"),
  updateMe: (payload: ProfileUpdatePayload) =>
    apiClient<UserProfile>("/auth/me/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  checkUsername: (username: string) =>
    apiClient<{ available: boolean }>(
      `/auth/username-available/?username=${encodeURIComponent(username)}`
    ),
  getContinueReading: (page: number = 1) =>
    apiClient<PaginatedResponse<ContinueReadingItem>>(
      `/auth/library/continue-reading/?page=${page}`
    ),
  getCompletedReading: (page: number = 1) =>
    apiClient<PaginatedResponse<ContinueReadingItem>>(
      `/auth/library/completed-reading/?page=${page}`
    ),
  getContinueListening: (page: number = 1) =>
    apiClient<PaginatedResponse<ContinueListeningItem>>(
      `/auth/library/continue-listening/?page=${page}`
    ),
  getFavorites: (page: number = 1) =>
    apiClient<PaginatedResponse<FavoriteItem>>(`/auth/library/favorites/?page=${page}`),
  getMyReviews: (page: number = 1) =>
    apiClient<PaginatedResponse<MyReviewItem>>(`/auth/library/reviews/?page=${page}`),
  getRecommendations: () =>
    apiClient<Story[]>("/auth/library/recommendations/"),
  getQuickReadRecommendations: (excludeSlug?: string) =>
    apiClient<Story[]>(
      `/auth/library/recommendations/?quick_read=true${
        excludeSlug ? `&exclude=${encodeURIComponent(excludeSlug)}` : ""
      }`
    ),
  adminLogin: (email: string, password: string) =>
    apiClient<AuthResponse>("/auth/admin-login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  // Blacklists the current refresh token server-side so it can't be used
  // again after logout — without this, "logging out" only ever cleared the
  // tokens locally, and the refresh token itself stayed valid on the server
  // for its full lifetime. Best-effort: if it fails (e.g. already offline),
  // the caller should still clear local tokens regardless.
  logout: () =>
    apiClient<{ detail: string }>("/auth/logout/", {
      method: "POST",
      body: JSON.stringify({ refresh: getRefreshToken() }),
    }),
};
