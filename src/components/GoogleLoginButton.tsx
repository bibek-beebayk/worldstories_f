import { useEffect, useRef } from "react";
import { apiClient, saveTokens } from "@/api/client";
import { adoptGuestProgress } from "@/lib/progressSync";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void | Promise<void>;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: { theme: string; size: string; shape: string; width: string }
          ) => void;
        };
      };
    };
  }
}

interface Props {
  onSuccess?: (isFirstLogin: boolean) => void;
}

export default function GoogleLoginButton({ onSuccess }: Props) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.google || !divRef.current) return;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (response: { credential: string }) => {
        try {
          // Exchange Google credential → JWT tokens
          const res = await apiClient<{
            access: string;
            refresh: string;
            user: { id: string; email: string; name: string; is_first_login: boolean };
          }>("/auth/google-login/", {
            method: "POST",
            body: JSON.stringify({
              token: response.credential,
            }),
          });

          // Save tokens
          saveTokens(res.access, res.refresh);
          await adoptGuestProgress();

          if (onSuccess) onSuccess(res.user.is_first_login);
        } catch (err) {
          console.error("Google login failed:", err);
        }
      },
    });

    window.google.accounts.id.renderButton(divRef.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      width: "250",
    });
  }, [onSuccess]);

  return <div ref={divRef}></div>;
}
