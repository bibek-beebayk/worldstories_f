import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export async function preloadOfflineReader(type: "epub" | "pdf"): Promise<void> {
  if (type === "pdf") {
    await Promise.all([
      import("@/pages/PdfReader"),
      fetch(pdfWorkerUrl, { cache: "force-cache" }).then((response) => {
        if (!response.ok) throw new Error("Could not cache the PDF worker.");
      }),
    ]);
    return;
  }

  await import("@/pages/EpubReader");
}
