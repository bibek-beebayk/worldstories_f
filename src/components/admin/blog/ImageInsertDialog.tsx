import { useEffect, useRef, useState } from "react";
import { ImagePlus, Link2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  formatBytes,
  isValidImageUrl,
  validateBlogImageFile,
  type BlogImageAlign,
  type BlogImageSize,
} from "@/lib/blogEditorImages";

export type ImageInsertSubmission =
  | {
      kind: "file";
      file: File;
      previewUrl: string;
      width: number | null;
      height: number | null;
      alt: string;
      caption: string;
      size: BlogImageSize;
      align: BlogImageAlign;
    }
  | {
      kind: "url";
      url: string;
      width: number | null;
      height: number | null;
      alt: string;
      caption: string;
      size: BlogImageSize;
      align: BlogImageAlign;
    };

interface ImageInsertDialogProps {
  open: boolean;
  mode?: "insert" | "replace";
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ImageInsertSubmission) => void;
}

export function ImageInsertDialog({ open, mode = "insert", onOpenChange, onSubmit }: ImageInsertDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<"upload" | "link">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [linkUrl, setLinkUrl] = useState("");
  const [linkDims, setLinkDims] = useState<{ width: number; height: number } | null>(null);

  const [alt, setAlt] = useState("");
  const [altTouched, setAltTouched] = useState(false);
  const [caption, setCaption] = useState("");
  const [size, setSize] = useState<BlogImageSize>("wide");
  const [align, setAlign] = useState<BlogImageAlign>("center");

  useEffect(() => {
    if (!open) {
      setTab("upload");
      setSelectedFile(null);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setDimensions(null);
      setFileError(null);
      setIsDragging(false);
      setLinkUrl("");
      setLinkDims(null);
      setAlt("");
      setAltTouched(false);
      setCaption("");
      setSize("wide");
      setAlign("center");
    }
  }, [open]);

  const acceptFile = (file: File | null | undefined) => {
    if (!file) return;
    const err = validateBlogImageFile(file);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);
    setSelectedFile(file);
    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return nextUrl;
    });
    setDimensions(null);
    const img = new Image();
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = nextUrl;
  };

  const handlePasteInDialog = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (tab !== "upload") return;
    const files = Array.from(event.clipboardData.files ?? []);
    const imgFile = files.find((f) => f.type.startsWith("image/"));
    if (imgFile) {
      event.preventDefault();
      acceptFile(imgFile);
    }
  };

  const hasValidSource = tab === "upload" ? Boolean(selectedFile && previewUrl) : isValidImageUrl(linkUrl);
  const needsAlt = mode === "insert";
  const altValid = !needsAlt || alt.trim().length > 0;
  const canSubmit = hasValidSource && altValid;

  const handleConfirm = () => {
    setAltTouched(true);
    if (!canSubmit) return;

    if (tab === "upload" && selectedFile && previewUrl) {
      // Hand off a fresh object URL so the dialog cleanup doesn't revoke the placeholder preview.
      const handoffUrl = URL.createObjectURL(selectedFile);
      onSubmit({
        kind: "file",
        file: selectedFile,
        previewUrl: handoffUrl,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        alt: alt.trim(),
        caption: caption.trim(),
        size,
        align,
      });
      onOpenChange(false);
      return;
    }

    if (tab === "link" && isValidImageUrl(linkUrl)) {
      onSubmit({
        kind: "url",
        url: linkUrl.trim(),
        width: linkDims?.width ?? null,
        height: linkDims?.height ?? null,
        alt: alt.trim(),
        caption: caption.trim(),
        size,
        align,
      });
      onOpenChange(false);
    }
  };

  const isGif = selectedFile?.type === "image/gif" || selectedFile?.name.toLowerCase().endsWith(".gif");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]" onPaste={handlePasteInDialog}>
        <DialogHeader>
          <DialogTitle>{mode === "replace" ? "Replace image" : "Insert image"}</DialogTitle>
          <DialogDescription>
            {mode === "replace"
              ? "Choose a new image file or URL. Size, alignment, alt text, and caption will be preserved."
              : "Upload an image or link one from an HTTPS URL."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v === "link" ? "link" : "upload")} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-1.5">
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              From a link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                acceptFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />

            {!selectedFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  acceptFile(e.dataTransfer.files?.[0]);
                }}
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-7 text-center transition-colors ${
                  isDragging
                    ? "border-[#D92F4C] bg-rose-50/50"
                    : "border-border bg-muted/20 hover:border-muted-foreground/50"
                }`}
              >
                <ImagePlus className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-foreground">Drop an image here, or paste a screenshot</p>
                <p className="mt-0.5 text-xs text-muted-foreground">JPG, PNG, WebP or GIF, up to 8 MB</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose a file
                </Button>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Tip: you can also press Ctrl+V / Cmd+V anywhere in this dialog or the editor.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                {previewUrl && (
                  <img src={previewUrl} alt="" className="h-16 w-16 shrink-0 rounded-md border object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(selectedFile.size)}
                    {dimensions ? ` · ${dimensions.width} × ${dimensions.height}px` : ""}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                    {isGif ? "GIF will be uploaded as-is if animated" : "Will be saved as WebP"}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Replace
                </Button>
              </div>
            )}

            {fileError && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {fileError}
              </p>
            )}
          </TabsContent>

          <TabsContent value="link" className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="blog-image-link-url">Image URL (https)</Label>
              <Input
                id="blog-image-link-url"
                type="url"
                placeholder="https://example.com/photo.jpg"
                value={linkUrl}
                onChange={(e) => {
                  setLinkUrl(e.target.value);
                  setLinkDims(null);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Hot-linked image — it will not be resized or hosted on WorldStories.
              </p>
            </div>
            {isValidImageUrl(linkUrl) && (
              <div className="overflow-hidden rounded-md border bg-muted/20 p-2">
                <img
                  src={linkUrl.trim()}
                  alt="Preview"
                  className="mx-auto max-h-40 rounded object-contain"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                      setLinkDims({ width: img.naturalWidth, height: img.naturalHeight });
                    }
                  }}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {mode === "insert" && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="blog-image-alt">
                Alt text <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="blog-image-alt"
                rows={2}
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                onBlur={() => setAltTouched(true)}
                placeholder="A stack of weathered paperbacks on a wooden table"
                aria-invalid={altTouched && !alt.trim()}
              />
              {altTouched && !alt.trim() && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  Add a short description
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Describe the image for people who cannot see it. Also used by search engines.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="blog-image-caption">Caption (optional)</Label>
              <Input
                id="blog-image-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Optional caption displayed below the image"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Size</Label>
                <div role="group" aria-label="Image size" className="grid grid-cols-3 rounded-md border p-0.5">
                  {(
                    [
                      { value: "small", label: "Small" },
                      { value: "wide", label: "Wide" },
                      { value: "full", label: "Full width" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={size === opt.value}
                      onClick={() => setSize(opt.value)}
                      className={`rounded px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        size === opt.value ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Alignment</Label>
                <div role="group" aria-label="Image alignment" className="grid grid-cols-2 rounded-md border p-0.5">
                  {(
                    [
                      { value: "left", label: "Left" },
                      { value: "center", label: "Center" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={align === opt.value}
                      onClick={() => setAlign(opt.value)}
                      className={`rounded px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        align === opt.value ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleConfirm}>
            {mode === "replace" ? "Replace image" : "Insert image"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
