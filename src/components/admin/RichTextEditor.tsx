import { useEffect, useRef, useState } from "react";
import { Bold, Code, Heading2, Heading3, Italic, Link2, List, ListOrdered, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * A small WYSIWYG editor (contentEditable + execCommand), the same approach as
 * the blog editor, with an HTML source toggle. Whatever it produces is
 * sanitized by the backend on save, so this only needs to be convenient.
 */
export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [htmlMode, setHtmlMode] = useState(false);

  // Seed the editable node once, and again after leaving HTML mode — writing
  // innerHTML on every change would reset the caret while typing.
  useEffect(() => {
    if (!htmlMode && editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [htmlMode]);

  const sync = () => onChange(editorRef.current?.innerHTML || "");

  const run = (command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    sync();
  };

  const tools = [
    { label: "Bold", icon: Bold, action: () => run("bold") },
    { label: "Italic", icon: Italic, action: () => run("italic") },
    { label: "Underline", icon: Underline, action: () => run("underline") },
    { label: "Heading", icon: Heading2, action: () => run("formatBlock", "h2") },
    { label: "Subheading", icon: Heading3, action: () => run("formatBlock", "h3") },
    { label: "Bulleted list", icon: List, action: () => run("insertUnorderedList") },
    { label: "Numbered list", icon: ListOrdered, action: () => run("insertOrderedList") },
    {
      label: "Link",
      icon: Link2,
      action: () => {
        const url = window.prompt("Link URL (https://… or /path)");
        if (url) run("createLink", url);
      },
    },
  ];

  return (
    <div className="rounded-md border">
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-1.5">
        {tools.map(({ label, icon: Icon, action }) => (
          <Button
            key={label}
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            title={label}
            aria-label={label}
            disabled={htmlMode}
            // Keep the selection inside the editor when clicking a tool.
            onMouseDown={(event) => event.preventDefault()}
            onClick={action}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={htmlMode ? "secondary" : "ghost"}
          className="ml-auto h-8"
          onClick={() => setHtmlMode((current) => !current)}
        >
          <Code className="mr-1.5 h-4 w-4" />
          HTML
        </Button>
      </div>
      {htmlMode ? (
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={10}
          className="rounded-none border-0 font-mono text-xs focus-visible:ring-0"
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={sync}
          onBlur={sync}
          className="prose prose-sm min-h-[160px] max-w-none p-3 focus:outline-none"
        />
      )}
    </div>
  );
}
