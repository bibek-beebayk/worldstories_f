// Set to true to restore Name That Story for readers.
export const NAME_THAT_STORY_ENABLED = false;

export const GAMES_VISITED_STORAGE_KEY = "ws_games_visited";

export function hasVisitedGames(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(GAMES_VISITED_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markGamesVisited(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GAMES_VISITED_STORAGE_KEY, "1");
  } catch {
    // ignore storage errors (e.g. private browsing)
  }
}
