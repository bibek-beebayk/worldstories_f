import { getAccessToken } from "@/api/client";

interface JwtPayload {
  user_id?: string | number;
  sub?: string | number;
}

export function getOfflineOwnerId(): string {
  const token = getAccessToken();
  if (!token) return "anonymous";

  try {
    const encodedPayload = token.split(".")[1];
    if (!encodedPayload) return "anonymous";
    const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as JwtPayload;
    const userId = payload.user_id ?? payload.sub;
    return userId == null ? "anonymous" : String(userId);
  } catch {
    return "anonymous";
  }
}
