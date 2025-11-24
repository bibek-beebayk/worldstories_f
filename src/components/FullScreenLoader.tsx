import { Loader2 } from "lucide-react";

const FullScreenLoader = () => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50">
      <Loader2 className="animate-spin h-12 w-12 text-primary mb-4" />
      <p className="text-lg text-muted-foreground">Loading stories…</p>
    </div>
  );
};

export default FullScreenLoader;
