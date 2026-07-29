export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
const BASE_URL = API_BASE_URL;
export const AUTH_CHANGE_EVENT = "worldstories-auth-change";

function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

// ----------------------------
// TOKEN HELPERS
// ----------------------------
export function saveTokens(access: string, refresh: string) {
  localStorage.setItem("access", access);
  localStorage.setItem("refresh", refresh);
  notifyAuthChanged();
}

export function getAccessToken() {
  return localStorage.getItem("access");
}

export function getRefreshToken() {
  return localStorage.getItem("refresh");
}

export function clearTokens() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  notifyAuthChanged();
}

// ----------------------------
// API CLIENT
// ----------------------------
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // If request is OK → return directly
  if (res.ok) {
    if (res.status === 204) {
      return undefined as T;
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(
        `Expected a JSON response from ${endpoint}, but received ${
          contentType || "an unknown content type"
        }. Check VITE_API_URL and restart the frontend server.`
      );
    }

    const text = await res.text();
    if (!text) {
      throw new Error(`The API returned an empty response for ${endpoint}.`);
    }

    return JSON.parse(text) as T;
  }

  // If access token expired → try refresh
  if (res.status === 401) {
    const refreshed = await tryRefreshTokens();

    if (refreshed) {
      // Retry original request
      return apiClient<T>(endpoint, options);
    }

    clearTokens();
    throw new Error("Session expired. Please log in again.");
  }

  const error = await res.json().catch(() => ({}));
  const message =
    (typeof error?.detail === "string" && error.detail) ||
    (typeof error?.message === "string" && error.message) ||
    formatValidationErrors(error) ||
    "API request failed";
  throw new Error(message);
}

// ----------------------------
// ERROR FORMATTING
// ----------------------------
// DRF validation errors come back as field-keyed objects, e.g.
// { "title": ["This field is required."], "slug": ["..."] }
// rather than a single top-level "detail"/"message" string.
function formatValidationErrors(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const messages: string[] = [];

  const collect = (key: string, value: unknown) => {
    if (typeof value === "string") {
      messages.push(key === "non_field_errors" ? value : `${key}: ${value}`);
    } else if (Array.isArray(value)) {
      value.forEach((item) => collect(key, item));
    } else if (value && typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(([nestedKey, nestedValue]) =>
        collect(`${key}.${nestedKey}`, nestedValue)
      );
    }
  };

  Object.entries(payload as Record<string, unknown>).forEach(([key, value]) => collect(key, value));

  return messages.length > 0 ? messages.join(" ") : null;
}

// ----------------------------
// REFRESH TOKEN HANDLER
// ----------------------------
let isRefreshing = false;
let queuedRequests: ((token: string | null) => void)[] = [];

async function tryRefreshTokens() {
  if (isRefreshing) {
    // queue the request
    return new Promise((resolve) => {
      queuedRequests.push(resolve);
    });
  }

  isRefreshing = true;

  const refresh = getRefreshToken();
  if (!refresh) {
    isRefreshing = false;
    return false;
  }

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) throw new Error();

    const data = await res.json();
    const newAccess = data.access;

    saveTokens(newAccess, refresh);

    queuedRequests.forEach((resolve) => resolve(newAccess));
    queuedRequests = [];
    isRefreshing = false;

    return true;
  } catch (err) {
    isRefreshing = false;
    queuedRequests.forEach((resolve) => resolve(null));
    queuedRequests = [];
    return false;
  }
}
