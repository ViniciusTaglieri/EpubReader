import { describe, expect, it } from "vitest";
import { buildReaderDocument, extractReadableMarkup } from "./readerDocument";

describe("readerDocument", () => {
  it("extracts only readable body markup from a full XHTML resource", () => {
    const markup = `<?xml version="1.0"?>
      <html xmlns="http://www.w3.org/1999/xhtml">
        <head><title>Chapter</title></head>
        <body><section><p>Texto reflowable</p></section></body>
      </html>`;

    expect(extractReadableMarkup(markup)).toBe("<section><p>Texto reflowable</p></section>");
  });

  it("builds a single-page viewport document with a dedicated paginated root", () => {
    const document = buildReaderDocument("<p>Texto</p>");

    expect(document).toContain('id="reader-stage"');
    expect(document).toContain('id="reader-clip"');
    expect(document).toContain('id="reader-root"');
    expect(document).toContain("overflow: hidden");
    expect(document).toContain("column-fill: auto");
    expect(document).toContain("max-width: 100%");
    expect(document).not.toContain("<body><html");
  });
});
