import { apiClient } from "./client";

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
};
