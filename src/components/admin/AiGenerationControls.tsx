import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AiGenerationSource, AiGenerationStatus } from "@/api/types";

export const AiGenerationHeaderControls = ({
  label,
  status,
  inputMode,
  onModeChange,
  onGenerate,
}: {
  label: string;
  status: AiGenerationStatus | null;
  inputMode: "metadata" | "content";
  onModeChange: (mode: "metadata" | "content") => void;
  onGenerate: (mode: "metadata" | "content") => void;
}) => {
  const busy = status === "pending" || status === "processing";
  return (
    <div className="flex items-center gap-2">
      <Select value={inputMode} onValueChange={(value) => onModeChange(value as "metadata" | "content")}>
        <SelectTrigger className="h-8 w-[190px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="content">Title + Author + Content</SelectItem>
          <SelectItem value="metadata">Title + Author only</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => onGenerate(inputMode)}>
        {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
        {busy ? "Generating..." : `Generate ${label}`}
      </Button>
    </div>
  );
};

// Result banner shown below the generated text — surfaces the transparency
// flag (metadata vs content source) distinctly, and for a metadata-mode
// result presents it as an explicit decision (keep it, or retry grounded in
// the actual content) rather than a passive badge, per how confident Claude
// reported being.
export const AiGenerationResultBanner = ({
  label,
  status,
  source,
  confident,
  confidenceNote,
  error,
  dismissed,
  onDismiss,
  onRetryWithContent,
  onTryAgain,
}: {
  label: string;
  status: AiGenerationStatus | null;
  source: AiGenerationSource | null;
  confident: boolean | null;
  confidenceNote: string | null;
  error: string | null;
  dismissed: boolean;
  onDismiss: () => void;
  onRetryWithContent: () => void;
  onTryAgain: () => void;
}) => {
  if (status === "failed") {
    return (
      <div
        className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        title={error || undefined}
      >
        <span>{label} generation failed{error ? `: ${error}` : "."}</span>
        <Button size="sm" variant="outline" onClick={onTryAgain}>
          Try again
        </Button>
      </div>
    );
  }

  if (status !== "completed" || !source) return null;

  if (source === "content") {
    return (
      <div className="mb-3 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        AI-generated from this content.
      </div>
    );
  }

  if (dismissed) {
    return (
      <div className="mb-3 rounded-md border bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        Generated from general knowledge, not this content's actual text.
      </div>
    );
  }

  return (
    <div className="mb-3 space-y-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
      <p>
        Generated from general knowledge, not this content's actual text.{" "}
        {confident === false
          ? "Claude reported not being confident about this."
          : confident === true
            ? "Claude reported being confident about this."
            : ""}
      </p>
      {confidenceNote && <p className="italic">&ldquo;{confidenceNote}&rdquo;</p>}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onDismiss}>
          Keep this
        </Button>
        <Button size="sm" variant="outline" onClick={onRetryWithContent}>
          Retry with full content
        </Button>
      </div>
    </div>
  );
};
