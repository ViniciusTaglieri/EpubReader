import { describe, expect, it } from "vitest";
import type { EpubManifestDto, ReadingLocator } from "../../shared/types/books";
import { resolveInitialSpine, resolveTotalProgression } from "./readerNavigation";

const manifest: EpubManifestDto = {
  bookId: "book-1",
  title: "Livro",
  author: "Autor",
  toc: [],
  spine: [
    { idref: "c1", href: "OPS/chapter-1.xhtml", mediaType: "application/xhtml+xml" },
    { idref: "c2", href: "OPS/chapter-2.xhtml", mediaType: "application/xhtml+xml" },
    { idref: "c3", href: "OPS/chapter-3.xhtml", mediaType: "application/xhtml+xml" }
  ]
};

describe("readerNavigation", () => {
  it("opens at the locator spine when saved progress exists", () => {
    const locator: ReadingLocator = {
      bookId: "book-1",
      href: "OPS/chapter-2.xhtml",
      spineIndex: 1,
      progression: 0.4,
      totalProgression: 0.46
    };

    expect(resolveInitialSpine(manifest, locator)).toEqual({
      href: "OPS/chapter-2.xhtml",
      spineIndex: 1
    });
  });

  it("falls back to the first spine item when the locator is missing or stale", () => {
    expect(resolveInitialSpine(manifest, null)).toEqual({
      href: "OPS/chapter-1.xhtml",
      spineIndex: 0
    });
    expect(
      resolveInitialSpine(manifest, {
        bookId: "book-1",
        href: "missing.xhtml",
        spineIndex: 9,
        progression: 0,
        totalProgression: 0
      })
    ).toEqual({
      href: "OPS/chapter-1.xhtml",
      spineIndex: 0
    });
  });

  it("derives total progression from chapter position and chapter progression", () => {
    expect(resolveTotalProgression(1, 0.5, manifest.spine.length)).toBeCloseTo(0.5);
    expect(resolveTotalProgression(2, 1, manifest.spine.length)).toBe(1);
  });
});
