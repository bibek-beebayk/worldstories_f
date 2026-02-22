import { useEffect, useRef } from "react";
import { apiClient, saveTokens } from "@/api/client";

declare global {
  interface Window {
    google: any;
  }
}

interface Props {
  onSuccess?: () => void;
}

export default function GoogleLoginButton({ onSuccess }: Props) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.google || !divRef.current) return;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (response: any) => {
        try {
          // Exchange Google credential → JWT tokens
          const res = await apiClient<{
            access: string;
            refresh: string;
          }>("/auth/google-login/", {
            method: "POST",
            body: JSON.stringify({
              token: response.credential,
            }),
          });

          // Save tokens
          saveTokens(res.access, res.refresh);

          if (onSuccess) onSuccess();
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
  }, []);

  return <div ref={divRef}></div>;
}
