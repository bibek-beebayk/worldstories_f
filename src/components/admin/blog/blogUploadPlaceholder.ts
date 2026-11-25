import { escapeHtml, formatBytes, type BlogImageAlign, type BlogImageSize } from "@/lib/blogEditorImages";

export interface PlaceholderState {
  uploadId: string;
  file: File;
  previewUrl: string;
  alt: string;
  caption: string;
  size: BlogImageSize;
  align: BlogImageAlign;
  status: "uploading" | "error";
  errorMessage?: string;
}

export function buildUploadingPlaceholderHtml(
  uploadId: string,
  previewUrl: string,
  fileName: string,
  totalBytes: number,
  size: BlogImageSize = "wide",
  align: BlogImageAlign = "center",
): string {
  const safeName = escapeHtml(fileName);
  const safeSrc = escapeHtml(previewUrl);
  const totalLabel = escapeHtml(formatBytes(totalBytes));
  return (
    `<figure class="ws-fig ws-size-${size} ws-align-${align} overflow-hidden rounded-lg border border-border bg-muted/30" ` +
    `data-upload-id="${escapeHtml(uploadId)}" data-uploading="true" contenteditable="false">` +
    `<div class="relative">` +
    `<img src="${safeSrc}" alt="" class="opacity-45" />` +
    `<div data-upload-overlay="true" class="absolute inset-0 flex flex-col items-center justify-center bg-white/80 p-4 text-center">` +
    `<p class="max-w-full truncate text-xs font-semibold text-neutral-900">${safeName}</p>` +
    `<div class="mt-2 h-2 w-48 max-w-full overflow-hidden rounded-full bg-neutral-200">` +
    `<div data-upload-bar="true" class="h-full rounded-full bg-[#D92F4C] transition-all" style="width: 5%"></div>` +
    `</div>` +
    `<p data-upload-status="true" class="mt-1.5 text-xs font-medium text-neutral-700">0% · 0 B of ${totalLabel}</p>` +
    `</div>` +
    `</div>` +
    `</figure>`
  );
}

export function updatePlaceholderProgress(
  root: HTMLElement | null,
  uploadId: string,
  percent: number,
  loaded: number,
  total: number,
): void {
  if (!root) return;
  const fig = root.querySelector<HTMLElement>(`figure[data-upload-id="${uploadId}"]`);
  if (!fig) return;
  const bar = fig.querySelector<HTMLElement>('[data-upload-bar="true"]');
  const status = fig.querySelector<HTMLElement>('[data-upload-status="true"]');
  if (bar) bar.style.width = `${Math.max(5, Math.min(100, percent))}%`;
  if (status) {
    status.textContent = `${percent}% · ${formatBytes(loaded)} of ${formatBytes(total)}`;
  }
}

export function markPlaceholderError(
  root: HTMLElement | null,
  uploadId: string,
  fileName: string,
  reason: string,
): void {
  if (!root) return;
  const fig = root.querySelector<HTMLElement>(`figure[data-upload-id="${uploadId}"]`);
  if (!fig) return;
  fig.setAttribute("data-upload-error", "true");
  fig.innerHTML =
    `<div class="rounded-lg border border-red-300 bg-red-50 p-4 text-left font-sans">` +
    `<p class="text-sm font-semibold text-red-900">Could not upload ${escapeHtml(fileName)}</p>` +
    `<p class="mt-1 text-xs text-red-800">${escapeHtml(reason)}</p>` +
    `<div class="mt-3 flex flex-wrap items-center gap-2">` +
    `<button type="button" data-upload-action="choose" data-upload-target="${escapeHtml(uploadId)}" ` +
    `class="rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-900 hover:bg-red-100">Choose another file</button>` +
    `<button type="button" data-upload-action="retry" data-upload-target="${escapeHtml(uploadId)}" ` +
    `class="rounded-md bg-[#D92F4C] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#b5223c]">Retry</button>` +
    `<button type="button" data-upload-action="remove" data-upload-target="${escapeHtml(uploadId)}" ` +
    `class="rounded-md px-2.5 py-1 text-xs font-medium text-red-900 hover:underline">Remove</button>` +
    `</div>` +
    `</div>`;
}

export function resetPlaceholderToUploading(
  root: HTMLElement | null,
  uploadId: string,
  previewUrl: string,
  fileName: string,
  totalBytes: number,
): void {
  if (!root) return;
  const fig = root.querySelector<HTMLElement>(`figure[data-upload-id="${uploadId}"]`);
  if (!fig) return;
  fig.removeAttribute("data-upload-error");
  fig.setAttribute("data-uploading", "true");
  const safeName = escapeHtml(fileName);
  const safeSrc = escapeHtml(previewUrl);
  const totalLabel = escapeHtml(formatBytes(totalBytes));
  fig.innerHTML =
    `<div class="relative">` +
    `<img src="${safeSrc}" alt="" class="opacity-45" />` +
    `<div data-upload-overlay="true" class="absolute inset-0 flex flex-col items-center justify-center bg-white/80 p-4 text-center">` +
    `<p class="max-w-full truncate text-xs font-semibold text-neutral-900">${safeName}</p>` +
    `<div class="mt-2 h-2 w-48 max-w-full overflow-hidden rounded-full bg-neutral-200">` +
    `<div data-upload-bar="true" class="h-full rounded-full bg-[#D92F4C] transition-all" style="width: 5%"></div>` +
    `</div>` +
    `<p data-upload-status="true" class="mt-1.5 text-xs font-medium text-neutral-700">0% · 0 B of ${totalLabel}</p>` +
    `</div>` +
    `</div>`;
}
