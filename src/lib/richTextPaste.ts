import { marked } from "marked";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

// Pasting into the admin's contentEditable rich-text editors (Summary,
// Retrospective, chapter content, blog content).
//
// HTML on the clipboard (copying formatted text from Google Docs, Word or a
// web page) is run through the same sanitizer the readers use before it's
// inserted. Left to the browser's own paste, it kept inline styles the editor
// honoured but the readers strip — Google Docs' `<b style="font-weight:normal">`
// wrapper looked normal here and made the whole chapter bold in the reader.
// Sanitizing on the way in means what the editor shows is what gets stored
// and what readers see. Bold/italic set through styles survive as real
// <strong>/<em> tags (see sanitizeHtml's style transforms).
//
// Plain text only — the normal case when copying out of a .md file, a plain
// text editor, or a terminal — is parsed as Markdown, so "# Heading" /
// "**bold**" become real rich-text elements instead of raw source text.
export function handleRichTextPaste(event: React.ClipboardEvent<HTMLDivElement>, onPasted: () => void) {
  const pastedHtml = event.clipboardData.getData("text/html");
  if (pastedHtml) {
    event.preventDefault();
    document.execCommand("insertHTML", false, sanitizeHtml(pastedHtml));
    onPasted();
    return;
  }

  const text = event.clipboardData.getData("text/plain");
  if (!text) return;

  event.preventDefault();
  const html = sanitizeHtml(marked.parse(text, { async: false, gfm: true, breaks: true }));
  document.execCommand("insertHTML", false, html);
  onPasted();
}
