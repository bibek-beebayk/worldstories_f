import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { registerSW } from "virtual:pwa-register";
import { Button } from "@/components/ui/button";
import { reloadAfterServiceWorkerUpdate } from "@/lib/pwaRecovery";

const PwaUpdatePrompt = () => {
  const updateServiceWorkerRef = useRef<(() => Promise<void>) | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration>();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    updateServiceWorkerRef.current = registerSW({
      immediate: true,
      onNeedRefresh: () => setUpdateAvailable(true),
      onNeedReload: reloadAfterServiceWorkerUpdate,
      onRegisteredSW: (_url, registration) => {
        registrationRef.current = registration;
      },
    });

    const checkForUpdate = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void registrationRef.current?.update();
      }
    };
    const interval = window.setInterval(checkForUpdate, 60 * 60 * 1_000);
    document.addEventListener("visibilitychange", checkForUpdate);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", checkForUpdate);
    };
  }, []);

  const applyUpdate = async () => {
    if (!updateServiceWorkerRef.current) return;
    setIsUpdating(true);
    try {
      await updateServiceWorkerRef.current();
    } catch {
      setIsUpdating(false);
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[100] mx-auto flex max-w-md items-center gap-3 rounded-xl border bg-card p-3 text-card-foreground shadow-xl">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">A WorldStories update is ready</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Update now to keep the app stable and current.</p>
      </div>
      <Button size="sm" className="shrink-0 gap-1.5" onClick={applyUpdate} disabled={isUpdating}>
        <RefreshCw className={`h-3.5 w-3.5 ${isUpdating ? "animate-spin" : ""}`} />
        {isUpdating ? "Updating" : "Update"}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => setUpdateAvailable(false)}
        disabled={isUpdating}
        aria-label="Update later"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default PwaUpdatePrompt;
