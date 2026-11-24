import type { AdminAudiobookStatus } from "@/api/types";

interface StatusChipProps {
  status: AdminAudiobookStatus;
  className?: string;
}

const STATUS_STYLES: Record<AdminAudiobookStatus, { label: string; classes: string }> = {
  published: {
    label: "Published",
    classes:
      "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800",
  },
  draft: {
    label: "Draft",
    classes: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
  },
  scheduled: {
    label: "Scheduled",
    classes:
      "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800",
  },
};

export function StatusChip({ status, className = "" }: StatusChipProps) {
  const { label, classes } = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes} ${className}`}
    >
      {label}
    </span>
  );
}
