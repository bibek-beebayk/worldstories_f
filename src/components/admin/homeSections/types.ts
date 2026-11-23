import type { AdminHomeSectionInput } from "@/api/types";

export type HomeSectionEditorDraft = AdminHomeSectionInput & {
  stories_detail: { id: number; title: string }[];
};
