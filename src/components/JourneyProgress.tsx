interface JourneyProgressProps {
  completed: number;
  total: number;
  label: string;
  className?: string;
}

const JourneyProgress = ({ completed, total, label, className = "" }: JourneyProgressProps) => {
  const safeTotal = Math.max(total, 0);
  const safeCompleted = Math.min(Math.max(completed, 0), safeTotal);
  const percent = safeTotal ? (safeCompleted / safeTotal) * 100 : 0;
  const shared = {
    role: "progressbar" as const,
    "aria-valuemin": 0,
    "aria-valuemax": safeTotal,
    "aria-valuenow": safeCompleted,
    "aria-label": label,
  };

  if (safeTotal <= 12) {
    return (
      <div {...shared} data-journey-progress="segments" className={`flex h-2 gap-1 ${className}`}>
        {Array.from({ length: safeTotal }, (_, index) => (
          <span
            key={index}
            className={`min-w-0 flex-1 rounded-full ${index < safeCompleted ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      {...shared}
      data-journey-progress="bar"
      className={`h-2 overflow-hidden rounded-full bg-muted ${className}`}
    >
      <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
    </div>
  );
};

export default JourneyProgress;
