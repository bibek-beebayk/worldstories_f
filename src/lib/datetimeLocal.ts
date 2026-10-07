// <input type="datetime-local"> works in the editor's local time with no zone;
// the API stores UTC ISO strings. Convert at the edges.
export const isoToLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const localInputToIso = (value: string) => (value ? new Date(value).toISOString() : null);
