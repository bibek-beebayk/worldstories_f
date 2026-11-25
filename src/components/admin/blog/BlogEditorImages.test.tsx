// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef, useState } from "react";
import { BlogContentEditor, type BlogContentEditorHandle } from "@/components/admin/blog/BlogContentEditor";
import { ImageInsertDialog } from "@/components/admin/blog/ImageInsertDialog";
import { uploadBlogImageFile } from "@/hooks/useBlogImageUpload";

vi.mock("@/hooks/useBlogImageUpload", () => {
  const uploadFn = vi.fn();
  return {
    uploadBlogImageFile: uploadFn,
    useBlogImageUpload: () => ({ upload: uploadFn }),
  };
});

vi.mock("@/components/ui/sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

function EditorHarness({
  initial = "<p>Hello world</p>",
  onUploadingChange,
}: {
  initial?: string;
  onUploadingChange?: (blocked: boolean) => void;
}) {
  const [html, setHtml] = useState(initial);
  const editorRef = useRef<BlogContentEditorHandle | null>(null);
  return (
    <div>
      <BlogContentEditor
        ref={editorRef}
        value={html}
        onChange={setHtml}
        onUploadingChange={onUploadingChange}
        seedKey={1}
      />
      <div data-testid="html-output">{html}</div>
    </div>
  );
}

describe("BlogContentEditor & ImageInsertDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (!URL.createObjectURL) {
      URL.createObjectURL = vi.fn(() => "blob:mock-preview");
    } else {
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-preview");
    }
    if (!URL.revokeObjectURL) {
      URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    }
  });

  afterEach(() => {
    cleanup();
  });

  it("supports typing, bold toolbar command, and HTML-mode round trip", () => {
    const origExec = document.execCommand;
    const execSpy = vi.fn(() => true);
    document.execCommand = execSpy;

    try {
      render(<EditorHarness initial="<p>Start</p>" />);

      const boldBtn = screen.getByRole("button", { name: "Bold" });
      fireEvent.click(boldBtn);
      expect(execSpy).toHaveBeenCalledWith("bold", false, undefined);

      // Switch to HTML mode and edit raw HTML
      const htmlBtn = screen.getByRole("button", { name: /HTML/i });
      fireEvent.click(htmlBtn);
      const textarea = screen.getByPlaceholderText(/Raw HTML for this post/i);
      fireEvent.change(textarea, { target: { value: "<p>Updated <strong>HTML</strong></p>" } });

      // Switch back to visual mode and verify contentEditable got the HTML
      fireEvent.click(htmlBtn);
      const editorEl = document.getElementById("blog-content")!;
      expect(editorEl.innerHTML).toContain("<strong>HTML</strong>");
    } finally {
      document.execCommand = origExec;
    }
  });

  it("ImageInsertDialog blocks Insert image without alt text and enables once filled", () => {
    const onSubmit = vi.fn();
    render(<ImageInsertDialog open={true} onOpenChange={() => {}} onSubmit={onSubmit} />);

    const insertBtn = screen.getByRole("button", { name: "Insert image" }) as HTMLButtonElement;
    expect(insertBtn.disabled).toBe(true);

    // Pick a file via the hidden file input
    const file = new File([new Uint8Array(64)], "pic.png", { type: "image/png" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Still disabled without alt text
    expect(insertBtn.disabled).toBe(true);

    // Blur alt text empty -> shows required error
    const altField = screen.getByLabelText(/Alt text/i);
    fireEvent.blur(altField);
    expect(screen.getByText("Add a short description")).toBeTruthy();

    // Fill alt text -> enabled
    fireEvent.change(altField, { target: { value: "A bright reading room" } });
    expect(insertBtn.disabled).toBe(false);

    fireEvent.click(insertBtn);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "file",
        file,
        alt: "A bright reading room",
        size: "wide",
        align: "center",
      }),
    );
  });

  it("pastes an image file, calls upload once, inserts placeholder, then swaps to figure", async () => {
    let resolveUpload!: (val: { id: number; url: string; width: number; height: number; size_bytes: number }) => void;
    vi.mocked(uploadBlogImageFile).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
    );

    const onUploadingChange = vi.fn();
    render(<EditorHarness onUploadingChange={onUploadingChange} />);

    const editorEl = document.getElementById("blog-content")!;
    const pastedFile = new File([new Uint8Array(128)], "screenshot.png", { type: "image/png" });
    fireEvent.paste(editorEl, {
      clipboardData: {
        files: [pastedFile],
        getData: () => "",
      },
    });

    await waitFor(() => {
      expect(uploadBlogImageFile).toHaveBeenCalledTimes(1);
    });
    expect(editorEl.querySelector('figure[data-uploading="true"]')).toBeTruthy();
    expect(onUploadingChange).toHaveBeenCalledWith(true);

    resolveUpload({
      id: 7,
      url: "https://cdn.example.com/blog_images/screenshot.webp",
      width: 1000,
      height: 600,
      size_bytes: 50000,
    });

    await waitFor(() => {
      expect(editorEl.querySelector('figure[data-uploading="true"]')).toBeNull();
      const img = editorEl.querySelector("figure.ws-fig img");
      expect(img?.getAttribute("src")).toBe("https://cdn.example.com/blog_images/screenshot.webp");
      expect(img?.getAttribute("alt")).toBe("");
    });
    expect(onUploadingChange).toHaveBeenLastCalledWith(false);
  });

  it("keeps uploading-blocked state true on failed upload and renders Retry/Remove panel", async () => {
    vi.mocked(uploadBlogImageFile).mockRejectedValue(new Error("Image is too large. Maximum file size is 8 MB."));
    const onUploadingChange = vi.fn();
    render(<EditorHarness onUploadingChange={onUploadingChange} />);

    const editorEl = document.getElementById("blog-content")!;
    const pastedFile = new File([new Uint8Array(128)], "big.png", { type: "image/png" });
    fireEvent.paste(editorEl, {
      clipboardData: {
        files: [pastedFile],
        getData: () => "",
      },
    });

    await waitFor(() => {
      expect(editorEl.textContent).toContain("Image is too large. Maximum file size is 8 MB.");
      expect(editorEl.textContent).toContain("Retry");
      expect(editorEl.textContent).toContain("Remove");
    });
    expect(onUploadingChange).toHaveBeenLastCalledWith(true);
  });
});
