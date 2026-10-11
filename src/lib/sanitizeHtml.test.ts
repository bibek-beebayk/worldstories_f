import { describe, expect, it } from "vitest";
import { sanitizeBlogContent, sanitizeHtml } from "./sanitizeHtml";

describe("sanitizeHtml style-based formatting", () => {
  // Google Docs wraps every paste in this; with the style stripped it used to
  // turn the whole chapter bold in the reader.
  it("unwraps a Google Docs font-weight:normal <b> wrapper", () => {
    const html =
      '<b style="font-weight:normal;" id="docs-internal-guid-1234"><p><span style="font-weight:400">Once upon a time</span></p></b>';
    expect(sanitizeHtml(html)).toBe(
      '<span style="font-weight:normal" id="docs-internal-guid-1234"><p><span style="font-weight:400">Once upon a time</span></p></span>'
    );
  });

  it("turns a bold-styled span into <strong>", () => {
    expect(sanitizeHtml('<span style="font-weight: bolder;">Indian Folktale</span>')).toBe(
      "<strong>Indian Folktale</strong>"
    );
    expect(sanitizeHtml('<span style="font-weight:700">x</span>')).toBe("<strong>x</strong>");
  });

  it("turns an italic-styled span into <em>", () => {
    expect(sanitizeHtml('<span style="font-style: italic">x</span>')).toBe("<em>x</em>");
  });

  it("ignores custom properties that only look like font-weight", () => {
    expect(sanitizeHtml('<span style="--tw-font-weight: 700; color: red">x</span>')).toBe("<span>x</span>");
  });

  // What the browser writes when you un-bold part of a bold element; losing
  // the style made the text bold again on the next open.
  it("keeps an un-bold span inside bold text", () => {
    expect(sanitizeHtml('<strong>Title <span style="font-weight: normal;">plain</span></strong>')).toBe(
      '<strong>Title <span style="font-weight:normal">plain</span></strong>'
    );
    expect(sanitizeHtml('<em>a <span style="font-style: normal">b</span></em>')).toBe(
      '<em>a <span style="font-style:normal">b</span></em>'
    );
  });

  it("allows no other inline styles", () => {
    expect(
      sanitizeHtml('<span style="font-weight: normal; color: red; background: url(x)">a</span><p style="font-weight:normal">b</p>')
    ).toBe('<span style="font-weight:normal">a</span><p>b</p>');
  });

  it("keeps plain bold and italic tags as they are", () => {
    expect(sanitizeHtml("<p><strong>a</strong> <b>b</b> <em>c</em></p>")).toBe(
      "<p><strong>a</strong> <b>b</b> <em>c</em></p>"
    );
  });

  it("applies the same handling to blog content", () => {
    expect(sanitizeBlogContent('<h1>T</h1><b style="font-weight:normal">body</b>')).toBe(
      '<h2>T</h2><span style="font-weight:normal">body</span>'
    );
  });
});
