import { useState } from "react";
import { Moon, SlidersHorizontal, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FONTS } from "@/pages/StoryReader";
import type { useReaderAppearance } from "@/hooks/useReaderAppearance";
import { hasAccessibleTextContrast } from "@/lib/readerContrast";

interface ReaderSettingsPanelProps {
  appearance: ReturnType<typeof useReaderAppearance>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFullscreen: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
}

/**
 * Reader appearance controls (text size, line height, theme, custom theme
 * creation, font) as a top-bar popover. Mirrors the chapter reader's settings
 * modal contents; uses the Epub/Pdf reader's popover placement so it portals
 * correctly while the page is in CSS fullscreen.
 */
export function ReaderSettingsPanel({
  appearance,
  open,
  onOpenChange,
  isFullscreen,
  containerRef,
}: ReaderSettingsPanelProps) {
  const [newThemeName, setNewThemeName] = useState("");
  const [newThemeBgColor, setNewThemeBgColor] = useState("#1f2937");
  const [newThemeBorderColor, setNewThemeBorderColor] = useState("#374151");
  const [newThemeTextColor, setNewThemeTextColor] = useState("#e5e7eb");
  const [newThemeLinkColor, setNewThemeLinkColor] = useState("#93c5fd");
  const [newThemeIsDark, setNewThemeIsDark] = useState(true);

  const {
    fontSize,
    setFontSize,
    lineHeight,
    setLineHeight,
    fontFamily,
    setFontFamily,
    theme,
    setTheme,
    themeOptions,
    createCustomTheme,
  } = appearance;

  const handleCreateTheme = () => {
    if (!newThemeName.trim() || !customThemeHasAccessibleContrast) return;
    createCustomTheme({
      name: newThemeName,
      bgColor: newThemeBgColor,
      borderColor: newThemeBorderColor,
      textColor: newThemeTextColor,
      linkColor: newThemeLinkColor,
      isDark: newThemeIsDark,
    });
    setNewThemeName("");
  };

  const customTextHasAccessibleContrast = hasAccessibleTextContrast(
    newThemeTextColor,
    newThemeBgColor
  );
  const customLinkHasAccessibleContrast = hasAccessibleTextContrast(
    newThemeLinkColor,
    newThemeBgColor
  );
  const customThemeHasAccessibleContrast =
    customTextHasAccessibleContrast && customLinkHasAccessibleContrast;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-11 w-11 touch-manipulation px-0 motion-reduce:transition-none sm:h-9 sm:w-auto sm:px-3"
          aria-label="Reader settings"
        >
          <SlidersHorizontal className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-[calc(100vh-6rem)] w-80 space-y-4 overflow-y-auto motion-reduce:animate-none motion-reduce:transition-none"
        container={isFullscreen ? containerRef.current ?? undefined : undefined}
      >
        <div>
          <div className="mb-2 text-xs font-medium text-muted-foreground">Text Size</div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 min-w-11 touch-manipulation"
              aria-label="Decrease text size"
              onClick={() => setFontSize((s) => s - 1)}
            >
              A-
            </Button>
            <span className="w-12 text-center text-xs">{fontSize}px</span>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 min-w-11 touch-manipulation"
              aria-label="Increase text size"
              onClick={() => setFontSize((s) => s + 1)}
            >
              A+
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Line Height</span>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 min-w-11 touch-manipulation"
            aria-label="Decrease line height"
            onClick={() => setLineHeight((v) => v - 0.1)}
          >
            -
          </Button>
          <span className="w-10 text-center text-xs">{lineHeight.toFixed(1)}</span>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 min-w-11 touch-manipulation"
            aria-label="Increase line height"
            onClick={() => setLineHeight((v) => v + 0.1)}
          >
            +
          </Button>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium text-muted-foreground">Theme</div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(themeOptions).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={theme === key ? "default" : "outline"}
                onClick={() => setTheme(key)}
                className="min-h-11 touch-manipulation gap-1"
              >
                {key === "night" || themeOptions[key].isDark ? (
                  <Moon className="h-3.5 w-3.5" />
                ) : (
                  <Sun className="h-3.5 w-3.5" />
                )}
                {themeOptions[key].label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2 rounded-md border p-3">
          <div className="text-xs font-medium text-muted-foreground">Create Theme</div>
          <Input
            placeholder="Theme name"
            value={newThemeName}
            onChange={(event) => setNewThemeName(event.target.value)}
            maxLength={24}
          />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex min-h-11 items-center justify-between rounded border px-2 py-1">
              <span>Background</span>
              <input
                type="color"
                value={newThemeBgColor}
                onChange={(event) => setNewThemeBgColor(event.target.value)}
              />
            </label>
            <label className="flex min-h-11 items-center justify-between rounded border px-2 py-1">
              <span>Border</span>
              <input
                type="color"
                value={newThemeBorderColor}
                onChange={(event) => setNewThemeBorderColor(event.target.value)}
              />
            </label>
            <label className="flex min-h-11 items-center justify-between rounded border px-2 py-1">
              <span>Text</span>
              <input
                type="color"
                value={newThemeTextColor}
                onChange={(event) => setNewThemeTextColor(event.target.value)}
              />
            </label>
            <label className="flex min-h-11 items-center justify-between rounded border px-2 py-1">
              <span>Links</span>
              <input
                type="color"
                value={newThemeLinkColor}
                onChange={(event) => setNewThemeLinkColor(event.target.value)}
              />
            </label>
          </div>
          {!customThemeHasAccessibleContrast && (
            <p role="alert" className="text-xs text-destructive">
              Choose text and link colors with stronger contrast against the background.
            </p>
          )}
          <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={newThemeIsDark}
              onChange={(event) => setNewThemeIsDark(event.target.checked)}
            />
            Treat as dark theme
          </label>
          <Button
            size="sm"
            className="min-h-11 touch-manipulation"
            onClick={handleCreateTheme}
            disabled={!newThemeName.trim() || !customThemeHasAccessibleContrast}
          >
            Save Theme
          </Button>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium text-muted-foreground">Font</div>
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
            {Object.keys(FONTS).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={fontFamily === key ? "default" : "outline"}
                onClick={() => setFontFamily(key)}
                style={{ fontFamily: FONTS[key].value }}
                className="min-h-11 touch-manipulation"
              >
                {FONTS[key].label}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
