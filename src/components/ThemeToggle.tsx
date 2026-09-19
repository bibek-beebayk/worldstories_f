import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";

// A simple light/dark toggle (no explicit "system" option in the UI) —
// clicking flips between the two, starting from whichever the system
// preference or a prior explicit choice currently resolves to. Not rendered
// on admin pages; ThemeRouteGate (root.tsx) suppresses the dark class there
// regardless, so a toggle would be misleading if shown.
const ThemeToggle = ({ className }: { className?: string }) => {
  const { resolvedTheme, setTheme } = useTheme();
  // ThemeProvider itself resolves to the SSR-safe "light" default until its
  // own post-hydration effect reads the real stored/system value, to avoid
  // a hydration mismatch — this just avoids this button visibly flashing
  // the wrong icon for that one frame while that resolves.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
};

export default ThemeToggle;
