import { apiClient } from "./client";
import {
  ContinueListeningItem,
  ContinueReadingItem,
  FavoriteItem,
  MyReviewItem,
  PaginatedResponse,
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
  updateMe: (payload: ProfileUpdatePayload) =>
    apiClient<UserProfile>("/auth/me/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
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
  adminLogin: (email: string, password: string) =>
    apiClient<AuthResponse>("/auth/admin-login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};
