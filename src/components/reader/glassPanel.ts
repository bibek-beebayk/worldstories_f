// Shared reader "glass" surface treatment for floating reader chrome (top bar,
// settings). The same string is currently also inlined in StoryReader.tsx and
// EpubReader.tsx — those copies are left in place for now; new reader UI imports
// from here. De-duplicating the legacy copies is a separate cleanup.
export const READER_GLASS_PANEL_CLASS =
  "border-border bg-gradient-to-br from-primary/10 to-background/100 backdrop-blur supports-[backdrop-filter]:from-primary/10 supports-[backdrop-filter]:to-background/45";
