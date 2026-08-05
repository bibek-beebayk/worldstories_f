const CHUNK_RECOVERY_KEY = "worldstories-chunk-recovery-attempt";
const SERVICE_WORKER_RELOAD_KEY = "worldstories-service-worker-reload";
const RECOVERY_COOLDOWN_MS = 60_000;

let recoveryInProgress = false;
let reloadInProgress = false;

const recentSessionAttempt = (key: string) => {
  const attemptedAt = Number(sessionStorage.getItem(key) || 0);
  return Date.now() - attemptedAt < RECOVERY_COOLDOWN_MS;
};

export const isChunkLoadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || "");
  return /ChunkLoadError|Loading chunk|dynamically imported module|module script/i.test(message);
};

export const canRecoverStaleBuild = () =>
  navigator.onLine && !recoveryInProgress && !recentSessionAttempt(CHUNK_RECOVERY_KEY);

export const reloadAfterServiceWorkerUpdate = () => {
  if (reloadInProgress || recentSessionAttempt(SERVICE_WORKER_RELOAD_KEY)) return;
  reloadInProgress = true;
  sessionStorage.setItem(SERVICE_WORKER_RELOAD_KEY, String(Date.now()));
  window.location.reload();
};

const waitForWaitingWorker = async (registration: ServiceWorkerRegistration) => {
  if (registration.waiting) return registration.waiting;

  return new Promise<ServiceWorker | null>((resolve) => {
    let settled = false;
    let timeout = 0;
    const finish = (worker: ServiceWorker | null) => {
      if (settled) return;
      settled = true;
      registration.removeEventListener("updatefound", watchInstallingWorker);
      window.clearTimeout(timeout);
      resolve(worker);
    };
    const watchWorker = (worker: ServiceWorker | null) => {
      if (!worker) return;
      const stateChanged = () => {
        if (worker.state === "installed") finish(registration.waiting || worker);
        else if (worker.state === "redundant") finish(null);
      };
      worker.addEventListener("statechange", stateChanged);
      stateChanged();
    };
    function watchInstallingWorker() {
      watchWorker(registration.installing);
    }

    registration.addEventListener("updatefound", watchInstallingWorker);
    watchWorker(registration.installing);
    if (settled) return;
    timeout = window.setTimeout(() => finish(registration.waiting), 10_000);
    void registration.update().catch(() => finish(null));
  });
};

// A route chunk can disappear when a deployment replaces hashed assets while
// an older application tab is still open. Activate a waiting worker first so
// the subsequent reload receives a matching HTML/chunk set. If there is no
// waiting worker, a normal reload still moves the page onto the current build.
export const recoverFromStaleBuild = async () => {
  if (!canRecoverStaleBuild()) return false;
  recoveryInProgress = true;
  sessionStorage.setItem(CHUNK_RECOVERY_KEY, String(Date.now()));

  let didReload = false;
  const reload = () => {
    if (didReload) return;
    didReload = true;
    window.location.reload();
  };

  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    const waitingWorker = registration ? await waitForWaitingWorker(registration) : null;

    if (waitingWorker) {
      navigator.serviceWorker.addEventListener("controllerchange", reload, { once: true });
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      window.setTimeout(reload, 1_500);
    } else {
      // If an obsolete worker cannot update, unregister it before reloading so
      // it cannot keep returning its old precached index.html indefinitely.
      await registration?.unregister();
      reload();
    }
  } catch {
    reload();
  }

  return true;
};

export const installChunkLoadRecovery = () => {
  window.addEventListener("vite:preloadError", (event) => {
    if (!canRecoverStaleBuild()) return;
    // Vite would otherwise rethrow the failed import and unmount the React
    // tree. Keep the current UI alive while the controlled recovery reloads.
    event.preventDefault();
    void recoverFromStaleBuild();
  });
};
