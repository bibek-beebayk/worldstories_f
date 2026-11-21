import { buildBlogToc } from "@/lib/blogToc";
import { describe, expect, it } from "vitest";

describe("buildBlogToc", () => {
  it("adds unique unicode-safe ids to h2 headings", () => {
    const result = buildBlogToc("<h2>Café &amp; tales</h2><h2>Café &amp; tales</h2><h3>Ignored</h3>");
    expect(result.items).toEqual([
      { id: "café-tales", label: "Café & tales", level: 2 },
      { id: "café-tales-2", label: "Café & tales", level: 2 },
    ]);
    expect(result.html).toContain('id="café-tales"');
    expect(result.html).toContain('id="café-tales-2"');
  });

  it("keeps existing ids and ignores empty headings", () => {
    const result = buildBlogToc('<h2 id="authored"><em>Named</em></h2><h2> &nbsp; </h2>');
    expect(result.items).toEqual([{ id: "authored", label: "Named", level: 2 }]);
    expect(result.html).toContain('<h2 id="authored"><em>Named</em></h2>');
  });

  it("leaves content without h2 headings unchanged", () => {
    expect(buildBlogToc("<p>Body only</p>")).toEqual({ html: "<p>Body only</p>", items: [] });
  });
});
