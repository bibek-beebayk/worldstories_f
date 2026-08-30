/** `m:ss` clock formatting for audio timelines. Non-finite / negative input → `0:00`. */
export const formatTime = (rawSeconds: number) => {
  const safe = Number.isFinite(rawSeconds) ? Math.max(0, Math.floor(rawSeconds)) : 0;
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};
