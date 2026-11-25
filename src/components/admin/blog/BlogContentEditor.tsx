import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Underline,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useBlogImageUpload } from "@/hooks/useBlogImageUpload";
import {
  buildFigureHtml,
  countImagesMissingAlt,
  findUploadingPlaceholders,
  getFigureMeta,
  setFigureAlign,
  setFigureAlt,
  setFigureCaption,
  setFigureSize,
  validateBlogImageFile,
  type BlogImageAlign,
  type BlogImageSize,
} from "@/lib/blogEditorImages";
import { plainText } from "@/lib/plainText";
import { handleRichTextPaste } from "@/lib/richTextPaste";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { ImageEditToolbar, type SelectedFigureRect } from "@/components/admin/blog/ImageEditToolbar";
import { ImageInsertDialog, type ImageInsertSubmission } from "@/components/admin/blog/ImageInsertDialog";
import {
  buildUploadingPlaceholderHtml,
  markPlaceholderError,
  resetPlaceholderToUploading,
  updatePlaceholderProgress,
  type PlaceholderState,
} from "@/components/admin/blog/blogUploadPlaceholder";

export interface BlogContentEditorHandle {
  getMissingAltCount: () => number;
  focusFirstMissingAlt: () => void;
  hasBlockingUploads: () => boolean;
  setHtml: (html: string) => void;
}

interface BlogContentEditorProps {
  value: string;
  onChange: (html: string) => void;
  onUploadingChange?: (hasPendingOrFailed: boolean) => void;
  seedKey: string | number;
}

const MAX_DROP_FILES = 10;

function setCaretFromPoint(clientX: number, clientY: number, container: HTMLElement): Range | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  let range: Range | null = null;
  if (typeof doc.caretRangeFromPoint === "function") {
    range = doc.caretRangeFromPoint(clientX, clientY);
  } else if (typeof doc.caretPositionFromPoint === "function") {
    const pos = doc.caretPositionFromPoint(clientX, clientY);
    if (pos) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
    }
  }
  if (range && container.contains(range.startContainer)) {
    return range;
  }
  return null;
}

export const BlogContentEditor = forwardRef<BlogContentEditorHandle, BlogContentEditorProps>(function BlogContentEditor(
  { value, onChange, onUploadingChange, seedKey },
  ref,
) {
  const { upload } = useBlogImageUpload();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const retryFileInputRef = useRef<HTMLInputElement | null>(null);
  const retryTargetIdRef = useRef<string | null>(null);
  const uploadsMapRef = useRef<Map<string, PlaceholderState>>(new Map());
  const uploadCounterRef = useRef(0);

  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const wasHtmlModeRef = useRef(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"insert" | "replace">("insert");
  const [isDragOver, setIsDragOver] = useState(false);

  const [selectedFigure, setSelectedFigure] = useState<HTMLElement | null>(null);
  const [selectedRect, setSelectedRect] = useState<SelectedFigureRect | null>(null);
  const [editorWidth, setEditorWidth] = useState(0);
  const [altPopoverOpen, setAltPopoverOpen] = useState(false);
  const [metaTick, setMetaTick] = useState(0);

  const notifyUploadState = useCallback(() => {
    const hasDomPlaceholders = findUploadingPlaceholders(editorRef.current).length > 0;
    onUploadingChange?.(uploadsMapRef.current.size > 0 || hasDomPlaceholders);
  }, [onUploadingChange]);

  const syncContent = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? "";
    onChange(html);
    notifyUploadState();
  }, [onChange, notifyUploadState]);

  const clearSelection = useCallback(() => {
    if (selectedFigure) {
      selectedFigure.classList.remove("ws-fig-selected");
    }
    setSelectedFigure(null);
    setSelectedRect(null);
    setAltPopoverOpen(false);
  }, [selectedFigure]);

  const measureSelected = useCallback((fig: HTMLElement | null) => {
    const wrapper = wrapperRef.current;
    const editor = editorRef.current;
    if (!fig || !wrapper || !editor || !editor.contains(fig)) {
      setSelectedRect(null);
      return;
    }
    const wRect = wrapper.getBoundingClientRect();
    const fRect = fig.getBoundingClientRect();
    setEditorWidth(editor.getBoundingClientRect().width);
    setSelectedRect({
      top: fRect.top - wRect.top,
      left: fRect.left - wRect.left,
      width: fRect.width,
      height: fRect.height,
    });
  }, []);

  const selectFigure = useCallback(
    (fig: HTMLElement, openAlt = false) => {
      if (selectedFigure && selectedFigure !== fig) {
        selectedFigure.classList.remove("ws-fig-selected");
      }
      fig.classList.add("ws-fig-selected");
      setSelectedFigure(fig);
      setMetaTick((t) => t + 1);
      measureSelected(fig);
      if (openAlt) setAltPopoverOpen(true);
    },
    [selectedFigure, measureSelected],
  );

  // Seed contentEditable through sanitizeHtml when opening a post (same behavior as before)
  useEffect(() => {
    setIsHtmlMode(false);
    clearSelection();
    if (!editorRef.current) return;
    const clean = sanitizeHtml(value);
    editorRef.current.innerHTML = clean;
    if (clean !== value) onChange(clean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  // Revoke any dangling preview URLs on unmount
  useEffect(() => {
    const map = uploadsMapRef.current;
    return () => {
      map.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
      map.clear();
    };
  }, []);

  // Recompute floating toolbar position on scroll/resize/content updates
  useEffect(() => {
    if (!selectedFigure) return;
    const update = () => measureSelected(selectedFigure);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [selectedFigure, measureSelected, value, metaTick]);

  // Escape to deselect, Delete/Backspace to remove selected figure
  useEffect(() => {
    if (!selectedFigure) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (altPopoverOpen || dialogOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        clearSelection();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        const active = document.activeElement;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;
        event.preventDefault();
        selectedFigure.remove();
        clearSelection();
        syncContent();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedFigure, altPopoverOpen, dialogOpen, clearSelection, syncContent]);

  useImperativeHandle(
    ref,
    () => ({
      getMissingAltCount: () => {
        const currentHtml = isHtmlMode ? value : (editorRef.current?.innerHTML ?? value);
        return countImagesMissingAlt(currentHtml);
      },
      focusFirstMissingAlt: () => {
        if (isHtmlMode) {
          setIsHtmlMode(false);
          window.setTimeout(() => {
            if (editorRef.current) {
              editorRef.current.innerHTML = value;
              const img = Array.from(editorRef.current.querySelectorAll("img")).find(
                (el) => !el.closest("[data-upload-id]") && !(el.getAttribute("alt") ?? "").trim(),
              );
              const fig = img?.closest("figure");
              if (fig instanceof HTMLElement) {
                fig.scrollIntoView({ behavior: "smooth", block: "center" });
                selectFigure(fig, true);
              }
            }
          }, 0);
          return;
        }
        if (!editorRef.current) return;
        const img = Array.from(editorRef.current.querySelectorAll("img")).find(
          (el) => !el.closest("[data-upload-id]") && !(el.getAttribute("alt") ?? "").trim(),
        );
        const fig = img?.closest("figure");
        if (fig instanceof HTMLElement) {
          fig.scrollIntoView({ behavior: "smooth", block: "center" });
          selectFigure(fig, true);
        }
      },
      hasBlockingUploads: () =>
        uploadsMapRef.current.size > 0 || findUploadingPlaceholders(editorRef.current).length > 0,
      setHtml: (html: string) => {
        if (editorRef.current) {
          editorRef.current.innerHTML = html;
        }
        onChange(html);
      },
    }),
    [isHtmlMode, value, onChange, selectFigure],
  );

  const runCommand = (command: string, cmdValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, cmdValue);
    syncContent();
  };

  const addLink = () => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    runCommand("createLink", url);
  };

  // Push raw HTML back into the newly mounted contentEditable node when leaving HTML mode
  useEffect(() => {
    if (wasHtmlModeRef.current && !isHtmlMode && editorRef.current) {
      editorRef.current.innerHTML = value;
    }
    wasHtmlModeRef.current = isHtmlMode;
  }, [isHtmlMode, value]);

  const toggleHtmlMode = () => {
    clearSelection();
    setIsHtmlMode((prev) => !prev);
  };

  const saveCurrentRange = () => {
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (editor && sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editor.contains(range.startContainer)) {
        savedRangeRef.current = range.cloneRange();
        return;
      }
    }
    savedRangeRef.current = null;
  };

  const insertHtmlAtRange = useCallback(
    (html: string, explicitRange?: Range | null) => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      const sel = window.getSelection();
      const targetRange = explicitRange ?? savedRangeRef.current;
      let inserted = false;

      if (sel) {
        sel.removeAllRanges();
        if (targetRange && editor.contains(targetRange.startContainer)) {
          sel.addRange(targetRange);
        } else {
          const endRange = document.createRange();
          endRange.selectNodeContents(editor);
          endRange.collapse(false);
          sel.addRange(endRange);
        }
        if (typeof document.execCommand === "function") {
          const beforeHtml = editor.innerHTML;
          const ok = document.execCommand("insertHTML", false, html);
          inserted = ok && editor.innerHTML !== beforeHtml;
        }
      }

      if (!inserted) {
        const temp = document.createElement("div");
        temp.innerHTML = html;
        while (temp.firstChild) {
          editor.appendChild(temp.firstChild);
        }
      }

      // Ensure there's an editable paragraph below if a figure is the last element
      const lastEl = editor.lastElementChild;
      if (lastEl && lastEl.tagName === "FIGURE") {
        const p = document.createElement("p");
        p.innerHTML = "<br>";
        editor.appendChild(p);
      }

      savedRangeRef.current = null;
      syncContent();
    },
    [syncContent],
  );

  const runFileUpload = useCallback(
    async (uploadId: string, state: PlaceholderState, options?: { fromPaste?: boolean }) => {
      uploadsMapRef.current.set(uploadId, state);
      notifyUploadState();

      try {
        const res = await upload(state.file, (p) => {
          updatePlaceholderProgress(editorRef.current, uploadId, p.percent, p.loaded, p.total);
        });

        const editor = editorRef.current;
        const placeholder = editor?.querySelector<HTMLElement>(`figure[data-upload-id="${uploadId}"]`);
        if (placeholder) {
          const temp = document.createElement("div");
          temp.innerHTML = buildFigureHtml({
            url: res.url,
            alt: state.alt,
            caption: state.caption,
            width: res.width,
            height: res.height,
            size: state.size,
            align: state.align,
          });
          const finalFigure = temp.firstElementChild as HTMLElement | null;
          if (finalFigure) {
            placeholder.replaceWith(finalFigure);
            if (options?.fromPaste) {
              toast("Screenshot pasted. Add alt text to finish.", {
                action: {
                  label: "Add alt text",
                  onClick: () => selectFigure(finalFigure, true),
                },
              });
            }
          }
        }
        URL.revokeObjectURL(state.previewUrl);
        uploadsMapRef.current.delete(uploadId);
        syncContent();
      } catch (err) {
        const reason = err instanceof Error ? err.message : "Upload failed. Please try again.";
        state.status = "error";
        state.errorMessage = reason;
        uploadsMapRef.current.set(uploadId, state);
        markPlaceholderError(editorRef.current, uploadId, state.file.name, reason);
        notifyUploadState();
      }
    },
    [upload, notifyUploadState, selectFigure, syncContent],
  );

  const insertAndUploadFile = useCallback(
    async (
      file: File,
      opts: {
        alt: string;
        caption: string;
        size: BlogImageSize;
        align: BlogImageAlign;
        previewUrl?: string;
        range?: Range | null;
        fromPaste?: boolean;
      },
    ) => {
      const validationError = validateBlogImageFile(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }
      uploadCounterRef.current += 1;
      const uploadId = `ws-up-${Date.now()}-${uploadCounterRef.current}`;
      const previewUrl = opts.previewUrl ?? URL.createObjectURL(file);
      const placeholderHtml = buildUploadingPlaceholderHtml(
        uploadId,
        previewUrl,
        file.name,
        file.size,
        opts.size,
        opts.align,
      );
      insertHtmlAtRange(placeholderHtml, opts.range);
      await runFileUpload(
        uploadId,
        {
          uploadId,
          file,
          previewUrl,
          alt: opts.alt,
          caption: opts.caption,
          size: opts.size,
          align: opts.align,
          status: "uploading",
        },
        { fromPaste: opts.fromPaste },
      );
    },
    [insertHtmlAtRange, runFileUpload],
  );

  const handleDialogSubmit = (payload: ImageInsertSubmission) => {
    if (dialogMode === "replace" && selectedFigure) {
      const targetFig = selectedFigure;
      if (payload.kind === "url") {
        const img = targetFig.querySelector("img");
        if (img) {
          img.setAttribute("src", payload.url);
          if (payload.width) img.setAttribute("width", String(payload.width));
          else img.removeAttribute("width");
          if (payload.height) img.setAttribute("height", String(payload.height));
          else img.removeAttribute("height");
        }
        setMetaTick((t) => t + 1);
        syncContent();
        toast.success("Image replaced.");
        return;
      }
      // Upload replacement file and swap src/width/height on success
      void (async () => {
        try {
          const res = await upload(payload.file);
          const img = targetFig.querySelector("img");
          if (img) {
            img.setAttribute("src", res.url);
            img.setAttribute("width", String(res.width));
            img.setAttribute("height", String(res.height));
          }
          URL.revokeObjectURL(payload.previewUrl);
          setMetaTick((t) => t + 1);
          syncContent();
          toast.success("Image replaced.");
        } catch (err) {
          URL.revokeObjectURL(payload.previewUrl);
          toast.error(err instanceof Error ? err.message : "Could not replace image.");
        }
      })();
      return;
    }

    if (payload.kind === "url") {
      insertHtmlAtRange(
        buildFigureHtml({
          url: payload.url,
          alt: payload.alt,
          caption: payload.caption,
          width: payload.width,
          height: payload.height,
          size: payload.size,
          align: payload.align,
        }),
      );
      return;
    }

    void insertAndUploadFile(payload.file, {
      alt: payload.alt,
      caption: payload.caption,
      size: payload.size,
      align: payload.align,
      previewUrl: payload.previewUrl,
    });
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const files = Array.from(event.clipboardData.files ?? []);
    const imageFile = files.find((f) => f.type.startsWith("image/"));
    if (imageFile) {
      event.preventDefault();
      saveCurrentRange();
      void insertAndUploadFile(imageFile, {
        alt: "",
        caption: "",
        size: "wide",
        align: "center",
        fromPaste: true,
      });
      return;
    }
    handleRichTextPaste(event, syncContent);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes("Files")) {
      event.preventDefault();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.files || event.dataTransfer.files.length === 0) return;
    event.preventDefault();
    setIsDragOver(false);

    const allFiles = Array.from(event.dataTransfer.files);
    const imageFiles = allFiles.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length < allFiles.length) {
      toast.error("Non-image files were ignored.");
    }
    if (imageFiles.length === 0) return;

    const batch = imageFiles.slice(0, MAX_DROP_FILES);
    if (imageFiles.length > MAX_DROP_FILES) {
      toast(`Uploading the first ${MAX_DROP_FILES} images.`);
    }

    const dropRange = editorRef.current ? setCaretFromPoint(event.clientX, event.clientY, editorRef.current) : null;

    void (async () => {
      for (let i = 0; i < batch.length; i += 1) {
        await insertAndUploadFile(batch[i], {
          alt: "",
          caption: "",
          size: "wide",
          align: "center",
          range: i === 0 ? dropRange : null,
        });
      }
    })();
  };

  const handleEditorClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    // Error placeholder action buttons
    const actionBtn = target.closest<HTMLElement>("[data-upload-action]");
    if (actionBtn) {
      event.preventDefault();
      event.stopPropagation();
      const action = actionBtn.getAttribute("data-upload-action");
      const uploadId = actionBtn.getAttribute("data-upload-target");
      if (!uploadId) return;
      const entry = uploadsMapRef.current.get(uploadId);

      if (action === "remove") {
        editorRef.current?.querySelector(`figure[data-upload-id="${uploadId}"]`)?.remove();
        if (entry) URL.revokeObjectURL(entry.previewUrl);
        uploadsMapRef.current.delete(uploadId);
        syncContent();
        return;
      }
      if (action === "retry" && entry) {
        resetPlaceholderToUploading(editorRef.current, uploadId, entry.previewUrl, entry.file.name, entry.file.size);
        void runFileUpload(uploadId, { ...entry, status: "uploading", errorMessage: undefined });
        return;
      }
      if (action === "choose") {
        retryTargetIdRef.current = uploadId;
        retryFileInputRef.current?.click();
        return;
      }
    }

    const fig = target.closest<HTMLElement>("figure.ws-fig");
    if (fig && !fig.hasAttribute("data-upload-id")) {
      selectFigure(fig);
      return;
    }
    clearSelection();
  };

  const handleRetryFilePicked = (file: File | undefined) => {
    const uploadId = retryTargetIdRef.current;
    retryTargetIdRef.current = null;
    if (!file || !uploadId) return;
    const err = validateBlogImageFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    const prev = uploadsMapRef.current.get(uploadId);
    if (prev) URL.revokeObjectURL(prev.previewUrl);
    const nextPreview = URL.createObjectURL(file);
    const nextState: PlaceholderState = {
      uploadId,
      file,
      previewUrl: nextPreview,
      alt: prev?.alt ?? "",
      caption: prev?.caption ?? "",
      size: prev?.size ?? "wide",
      align: prev?.align ?? "center",
      status: "uploading",
    };
    resetPlaceholderToUploading(editorRef.current, uploadId, nextPreview, file.name, file.size);
    void runFileUpload(uploadId, nextState);
  };

  const stats = useMemo(() => {
    const text = plainText(value);
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return { words, minutes };
  }, [value]);

  const selectedMeta = useMemo(
    () => (selectedFigure ? getFigureMeta(selectedFigure) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedFigure, metaTick],
  );

  return (
    <div className="mt-2 space-y-2">
      <input
        ref={retryFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          handleRetryFilePicked(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-muted/20 p-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isHtmlMode}
          onClick={() => runCommand("undo")}
          aria-label="Undo"
          title="Undo"
        >
          <Undo2 className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isHtmlMode}
          onClick={() => runCommand("redo")}
          aria-label="Redo"
          title="Redo"
        >
          <Redo2 className="h-4 w-4" aria-hidden="true" />
        </Button>

        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isHtmlMode}
          onClick={() => runCommand("bold")}
          aria-label="Bold"
          title="Bold"
        >
          <Bold className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isHtmlMode}
          onClick={() => runCommand("italic")}
          aria-label="Italic"
          title="Italic"
        >
          <Italic className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isHtmlMode}
          onClick={() => runCommand("underline")}
          aria-label="Underline"
          title="Underline"
        >
          <Underline className="h-4 w-4" aria-hidden="true" />
        </Button>

        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isHtmlMode}
          onClick={() => runCommand("formatBlock", "h2")}
          aria-label="Heading"
          title="Heading"
        >
          <Heading2 className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isHtmlMode}
          onClick={() => runCommand("formatBlock", "h3")}
          aria-label="Subheading"
          title="Subheading"
        >
          <Heading3 className="h-4 w-4" aria-hidden="true" />
        </Button>

        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isHtmlMode}
          onClick={() => runCommand("insertUnorderedList")}
          aria-label="Bulleted list"
          title="Bulleted list"
        >
          <List className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isHtmlMode}
          onClick={() => runCommand("insertOrderedList")}
          aria-label="Numbered list"
          title="Numbered list"
        >
          <ListOrdered className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isHtmlMode}
          onClick={() => runCommand("formatBlock", "blockquote")}
          aria-label="Quote"
          title="Quote"
        >
          <Quote className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isHtmlMode}
          onClick={() => runCommand("insertHorizontalRule")}
          aria-label="Divider"
          title="Divider"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>

        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isHtmlMode}
          onClick={addLink}
          aria-label="Insert link"
          title="Insert link"
        >
          <Link2 className="h-4 w-4" aria-hidden="true" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isHtmlMode}
          onClick={() => {
            saveCurrentRange();
            setDialogMode("insert");
            setDialogOpen(true);
          }}
          className="gap-1.5 border-[#D92F4C]/40 bg-[#D92F4C]/10 font-medium text-[#A71B36] hover:bg-[#D92F4C]/15 hover:text-[#8E152C]"
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          Image
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
            {stats.words} {stats.words === 1 ? "word" : "words"} · {stats.minutes} min read
          </span>
          <Button
            type="button"
            variant={isHtmlMode ? "default" : "outline"}
            size="sm"
            onClick={toggleHtmlMode}
            className="gap-1.5"
            title={isHtmlMode ? "Switch to visual editor" : "Edit raw HTML"}
          >
            <Code2 className="h-4 w-4" aria-hidden="true" />
            HTML
          </Button>
        </div>
      </div>

      {/* Editor body */}
      {isHtmlMode ? (
        <Textarea
          id="blog-content"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-60 font-mono text-xs"
          spellCheck={false}
          placeholder="<p>Raw HTML for this post&hellip;</p>"
        />
      ) : (
        <div
          ref={wrapperRef}
          className="relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div
            id="blog-content"
            ref={editorRef}
            contentEditable
            dir="ltr"
            style={{ direction: "ltr", unicodeBidi: "isolate", writingMode: "horizontal-tb" }}
            suppressContentEditableWarning
            onInput={syncContent}
            onPaste={handlePaste}
            onClick={handleEditorClick}
            className={`ws-blog-editor prose prose-sm min-h-60 max-w-none rounded-md border px-3 py-2 text-left [unicode-bidi:isolate] [&_*]:text-left focus:outline-none focus:ring-2 focus:ring-ring ${
              isDragOver ? "border-2 border-dashed border-[#D92F4C] bg-rose-50/40" : ""
            }`}
          />

          {isDragOver && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-md bg-rose-50/75">
              <p className="rounded-md bg-white/95 px-3 py-1.5 text-sm font-semibold text-[#A71B36] shadow-sm">
                Drop the image to insert it here
              </p>
            </div>
          )}

          {selectedFigure && selectedRect && selectedMeta && (
            <ImageEditToolbar
              rect={selectedRect}
              editorWidth={editorWidth}
              meta={selectedMeta}
              altPopoverOpen={altPopoverOpen}
              onAltPopoverOpenChange={setAltPopoverOpen}
              onChangeSize={(nextSize) => {
                setFigureSize(selectedFigure, nextSize);
                setMetaTick((t) => t + 1);
                measureSelected(selectedFigure);
                syncContent();
              }}
              onChangeAlign={(nextAlign) => {
                setFigureAlign(selectedFigure, nextAlign);
                setMetaTick((t) => t + 1);
                measureSelected(selectedFigure);
                syncContent();
              }}
              onApplyAltCaption={(nextAlt, nextCaption) => {
                setFigureAlt(selectedFigure, nextAlt);
                setFigureCaption(selectedFigure, nextCaption);
                setMetaTick((t) => t + 1);
                measureSelected(selectedFigure);
                syncContent();
              }}
              onRequestReplace={() => {
                setDialogMode("replace");
                setDialogOpen(true);
              }}
              onRemove={() => {
                selectedFigure.remove();
                clearSelection();
                syncContent();
              }}
            />
          )}
        </div>
      )}

      <ImageInsertDialog
        open={dialogOpen}
        mode={dialogMode}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            window.setTimeout(() => editorRef.current?.focus(), 0);
          }
        }}
        onSubmit={handleDialogSubmit}
      />
    </div>
  );
});
