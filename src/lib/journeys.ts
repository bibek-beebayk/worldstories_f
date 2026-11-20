import type { JourneySummary } from "@/api/types";

export type JourneyState = "start" | "continue" | "review";

export function journeyState(journey: Pick<JourneySummary, "completed" | "total" | "is_complete">): JourneyState {
  if (journey.is_complete || (journey.total > 0 && journey.completed >= journey.total)) return "review";
  return journey.completed > 0 ? "continue" : "start";
}

export function journeyActionLabel(journey: Pick<JourneySummary, "completed" | "total" | "is_complete">) {
  const state = journeyState(journey);
  return state === "start" ? "Start journey" : state === "continue" ? "Continue" : "Review";
}

export function orderJourneys(journeys: JourneySummary[]) {
  const rank: Record<JourneyState, number> = { start: 0, continue: 1, review: 2 };
  return journeys
    .map((journey, index) => ({ journey, index }))
    .sort((a, b) => rank[journeyState(a.journey)] - rank[journeyState(b.journey)] || a.index - b.index)
    .map(({ journey }) => journey);
}

export function bestJourneyToContinue(journeys: JourneySummary[]) {
  return journeys.reduce<JourneySummary | null>((best, journey) => {
    if (journey.completed <= 0 || journey.completed >= journey.total || journey.total <= 0) return best;
    if (!best) return journey;
    return journey.completed / journey.total > best.completed / best.total ? journey : best;
  }, null);
}
