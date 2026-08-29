// Loads the YouTube IFrame Player API script once per page and resolves when
// `window.YT.Player` is ready. Safe to call repeatedly — every caller gets the
// same promise. Used only for progress tracking; the <iframe> embed renders the
// video on its own without it.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let readyPromise: Promise<any> | null = null;

export function loadYouTubeApi(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API is browser-only"));
  }
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (readyPromise) return readyPromise;

  readyPromise = new Promise((resolve, reject) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      if (window.YT && window.YT.Player) {
        settled = true;
        clearInterval(poll);
        clearTimeout(timeout);
        resolve(window.YT);
      }
    };

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      finish();
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        if (!settled) {
          settled = true;
          clearInterval(poll);
          clearTimeout(timeout);
          readyPromise = null;
          reject(new Error("Failed to load YouTube IFrame API"));
        }
      };
      document.head.appendChild(script);
    }

    // Fallback: the ready callback can be missed if the script was already
    // in flight from a prior mount — poll for the global instead.
    const poll = setInterval(finish, 250);
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        clearInterval(poll);
        readyPromise = null;
        reject(new Error("YouTube IFrame API timed out"));
      }
    }, 10000);
  });

  return readyPromise;
}
