import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { storyApi } from "@/api/story";
import type {
  AdminAnalyticsExportFileFormat,
  AdminAnalyticsExportSection,
  AdminAnalyticsRangeDays,
} from "@/api/types";

const SECTION_OPTIONS: Array<{ value: AdminAnalyticsExportSection; label: string; hint: string }> = [
  { value: "content", label: "Content", hint: "Views, publishing velocity, genre performance" },
  { value: "engagement", label: "Engagement", hint: "Reading progress, drop-off, ratings" },
  { value: "audience", label: "Audience", hint: "Visitors, sessions, page views, downloads" },
  { value: "users", label: "Users", hint: "Signups, active users, login frequency" },
  { value: "geography", label: "Geography", hint: "Sign-ins by country and city" },
  { value: "submissions", label: "Submissions", hint: "Funnel, review time, by genre" },
];

const RANGE_LABELS: Record<AdminAnalyticsRangeDays, string> = {
  1: "the last 24 hours",
  7: "the last 7 days",
  30: "the last 30 days",
  90: "the last 90 days",
  365: "the last year",
};

interface AnalyticsExportDialogProps {
  days: AdminAnalyticsRangeDays;
}

export function AnalyticsExportDialog({ days }: AnalyticsExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<AdminAnalyticsExportSection>>(new Set());
  const [fileFormat, setFileFormat] = useState<AdminAnalyticsExportFileFormat>("xlsx");
  const [isExporting, setIsExporting] = useState(false);

  const toggleSection = (section: AdminAnalyticsExportSection) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleExport = async () => {
    if (selected.size === 0) return;
    setIsExporting(true);
    try {
      const { buffer, filename, contentType } = await storyApi.exportAdminAnalytics(
        Array.from(selected),
        days,
        fileFormat
      );
      const blob = new Blob([buffer], { type: contentType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export analytics data.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSelected(new Set());
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export data
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export analytics data</DialogTitle>
          <DialogDescription>
            Choose which sections to include — covering {RANGE_LABELS[days]}, matching the range currently
            selected on the page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {SECTION_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/40"
            >
              <Checkbox
                checked={selected.has(option.value)}
                onCheckedChange={() => toggleSection(option.value)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">File format</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={fileFormat === "xlsx" ? "default" : "outline"}
              size="sm"
              onClick={() => setFileFormat("xlsx")}
            >
              Excel (.xlsx)
            </Button>
            <Button
              type="button"
              variant={fileFormat === "csv" ? "default" : "outline"}
              size="sm"
              onClick={() => setFileFormat("csv")}
            >
              CSV (.csv)
            </Button>
          </div>
          {fileFormat === "csv" && (
            <p className="mt-2 text-xs text-muted-foreground">
              CSV holds one table per file — selecting multiple sections (or any section with more than one
              table) downloads a .zip of .csv files instead of a single file.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={selected.size === 0 || isExporting} className="gap-2">
            {isExporting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isExporting ? "Exporting…" : `Export ${selected.size || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
