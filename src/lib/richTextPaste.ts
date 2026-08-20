import { marked } from "marked";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

// Pasting into the admin's contentEditable rich-text editors (Summary,
// Retrospective, chapter content): if the clipboard already carries real
// HTML (e.g. copying formatted text from a web page or Word), let the
// browser's own paste behavior handle it as-is — reinterpreting that through
// a markdown parser would be a downgrade, not an improvement. If the
// clipboard is plain text only — the normal case when copying out of a .md
// file, a plain text editor, or a terminal — parse it as Markdown and insert
// the resulting HTML instead of the raw "# Heading" / "**bold**" source
// text, so the pasted formatting actually maps onto real rich-text elements.
export function handleRichTextPaste(event: React.ClipboardEvent<HTMLDivElement>, onPasted: () => void) {
  if (event.clipboardData.types.includes("text/html")) return;

  const text = event.clipboardData.getData("text/plain");
  if (!text) return;

  event.preventDefault();
  const html = sanitizeHtml(marked.parse(text, { async: false, gfm: true, breaks: true }));
  document.execCommand("insertHTML", false, html);
  onPasted();
}
