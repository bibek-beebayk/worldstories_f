import { useEffect, useState } from "react";
import { AlignCenter, AlignLeft, RefreshCw, Trash2, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import type { BlogImageAlign, BlogImageSize, FigureMeta } from "@/lib/blogEditorImages";

export interface SelectedFigureRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ImageEditToolbarProps {
  rect: SelectedFigureRect;
  editorWidth: number;
  meta: FigureMeta;
  altPopoverOpen: boolean;
  onAltPopoverOpenChange: (open: boolean) => void;
  onChangeSize: (size: BlogImageSize) => void;
  onChangeAlign: (align: BlogImageAlign) => void;
  onApplyAltCaption: (alt: string, caption: string) => void;
  onRequestReplace: () => void;
  onRemove: () => void;
}

export function ImageEditToolbar({
  rect,
  editorWidth,
  meta,
  altPopoverOpen,
  onAltPopoverOpenChange,
  onChangeSize,
  onChangeAlign,
  onApplyAltCaption,
  onRequestReplace,
  onRemove,
}: ImageEditToolbarProps) {
  const [draftAlt, setDraftAlt] = useState(meta.alt);
  const [draftCaption, setDraftCaption] = useState(meta.caption);
  const [altError, setAltError] = useState(false);

  useEffect(() => {
    if (altPopoverOpen) {
      setDraftAlt(meta.alt);
      setDraftCaption(meta.caption);
      setAltError(false);
    }
  }, [altPopoverOpen, meta.alt, meta.caption]);

  const handleApply = () => {
    if (!draftAlt.trim()) {
      setAltError(true);
      return;
    }
    onApplyAltCaption(draftAlt.trim(), draftCaption.trim());
    onAltPopoverOpenChange(false);
  };

  const startResizeDrag = (corner: "nw" | "ne" | "sw" | "se") => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = rect.width;
    const sign = corner === "ne" || corner === "se" ? 1 : -1;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const delta = (moveEvent.clientX - startX) * sign;
      const projected = Math.max(80, startWidth + delta);
      const ratio = editorWidth > 0 ? projected / editorWidth : 0.78;
      const nextSize: BlogImageSize = ratio <= 0.55 ? "small" : ratio <= 0.88 ? "wide" : "full";
      onChangeSize(nextSize);
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const toolbarTop = Math.max(4, rect.top - 48);
  const toolbarLeft = Math.max(4, Math.min(rect.left + rect.width / 2, Math.max(220, editorWidth - 4)));

  return (
    <>
      {/* Corner resize handles over the selected figure */}
      <div
        className="pointer-events-none absolute z-20"
        style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
      >
        {(
          [
            { key: "nw", cls: "-left-1.5 -top-1.5 cursor-nwse-resize" },
            { key: "ne", cls: "-right-1.5 -top-1.5 cursor-nesw-resize" },
            { key: "sw", cls: "-bottom-1.5 -left-1.5 cursor-nesw-resize" },
            { key: "se", cls: "-bottom-1.5 -right-1.5 cursor-nwse-resize" },
          ] as const
        ).map((h) => (
          <button
            key={h.key}
            type="button"
            tabIndex={-1}
            aria-label={`Resize image (${h.key})`}
            onPointerDown={startResizeDrag(h.key)}
            className={`pointer-events-auto absolute h-3 w-3 rounded-sm border-2 border-[#D92F4C] bg-white shadow-sm ${h.cls}`}
          />
        ))}
      </div>

      {/* Floating dark toolbar above the selected figure */}
      <div
        role="toolbar"
        aria-label="Selected image options"
        style={{ top: toolbarTop, left: toolbarLeft, transform: "translateX(-50%)" }}
        className="absolute z-30 flex flex-wrap items-center gap-1 rounded-lg bg-neutral-900 px-2 py-1 text-xs text-white shadow-lg"
        onMouseDown={(e) => {
          // Keep focus from collapsing selection unintentionally unless interacting with inputs
          if ((e.target as HTMLElement).tagName !== "TEXTAREA") {
            e.stopPropagation();
          }
        }}
      >
        <div role="group" aria-label="Image size" className="flex items-center gap-0.5 pr-1">
          {(
            [
              { value: "small", label: "Small" },
              { value: "wide", label: "Wide" },
              { value: "full", label: "Full" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={meta.size === opt.value}
              onClick={() => onChangeSize(opt.value)}
              className={`rounded px-2 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                meta.size === opt.value
                  ? "bg-[#D92F4C] text-white"
                  : "text-neutral-200 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <span className="h-4 w-px bg-neutral-700" aria-hidden="true" />

        <div role="group" aria-label="Image alignment" className="flex items-center gap-0.5 px-1">
          <button
            type="button"
            aria-label="Align left"
            aria-pressed={meta.align === "left"}
            onClick={() => onChangeAlign("left")}
            className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              meta.align === "left"
                ? "bg-[#D92F4C] text-white"
                : "text-neutral-200 hover:bg-neutral-800 hover:text-white"
            }`}
          >
            <AlignLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Align center"
            aria-pressed={meta.align === "center"}
            onClick={() => onChangeAlign("center")}
            className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              meta.align === "center"
                ? "bg-[#D92F4C] text-white"
                : "text-neutral-200 hover:bg-neutral-800 hover:text-white"
            }`}
          >
            <AlignCenter className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        <span className="h-4 w-px bg-neutral-700" aria-hidden="true" />

        <Popover open={altPopoverOpen} onOpenChange={onAltPopoverOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded px-2 py-1 font-medium text-neutral-100 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Type className="h-3.5 w-3.5" aria-hidden="true" />
              Alt text and caption
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[340px] space-y-3 p-3.5" align="center" sideOffset={8}>
            <div className="space-y-1">
              <Label htmlFor="edit-fig-alt" className="text-xs">
                Alt text <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="edit-fig-alt"
                rows={2}
                value={draftAlt}
                onChange={(e) => {
                  setDraftAlt(e.target.value);
                  if (altError && e.target.value.trim()) setAltError(false);
                }}
                placeholder="Describe this image..."
                className="text-xs"
              />
              {altError && (
                <p role="alert" className="text-[11px] font-medium text-destructive">
                  Add a short description
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-fig-caption" className="text-xs">
                Caption (optional)
              </Label>
              <Textarea
                id="edit-fig-caption"
                rows={2}
                value={draftCaption}
                onChange={(e) => setDraftCaption(e.target.value)}
                placeholder="Shown beneath the image"
                className="text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => onAltPopoverOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <button
          type="button"
          onClick={onRequestReplace}
          aria-label="Replace image"
          className="inline-flex items-center gap-1 rounded px-2 py-1 font-medium text-neutral-100 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Replace
        </button>

        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove image"
          className="inline-flex items-center gap-1 rounded px-2 py-1 font-medium text-rose-300 hover:bg-neutral-800 hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Remove
        </button>
      </div>
    </>
  );
}
