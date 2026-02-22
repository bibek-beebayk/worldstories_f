const BASE_URL = import.meta.env.VITE_API_URL;

// ----------------------------
// TOKEN HELPERS
// ----------------------------
export function saveTokens(access: string, refresh: string) {
  localStorage.setItem("access", access);
  localStorage.setItem("refresh", refresh);
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
}

// ----------------------------
// API CLIENT
// ----------------------------
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // If request is OK → return directly
  if (res.ok) {
    return (await res.json()) as T;
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
  throw new Error(error?.message || "API request failed");
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
