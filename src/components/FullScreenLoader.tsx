const FullScreenLoader = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-background">
      <div className="relative h-16 w-24 [perspective:600px]">
        <div className="absolute inset-y-0 left-0 w-1/2 rounded-l-md border border-border bg-card shadow-sm" />
        <div className="absolute inset-y-0 right-0 w-1/2 rounded-r-md border border-border bg-card shadow-sm" />
        <div className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-border" />

        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute inset-y-0 left-1/2 w-1/2 origin-left rounded-r-md border border-primary/40 [backface-visibility:hidden] animate-page-turn"
            style={{
              animationDelay: `${i * 0.25}s`,
              backgroundColor: `hsl(var(--primary) / ${0.55 - i * 0.15})`,
            }}
          />
        ))}
      </div>
      <p className="text-lg text-muted-foreground">Loading stories…</p>
    </div>
  );
};

export default FullScreenLoader;
