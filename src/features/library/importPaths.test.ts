import { describe, expect, it } from "vitest";
import {
  epubPathsFromDrop,
  epubPathsFromTauriDragDrop,
  normalizePickedEpubPaths
} from "./importPaths";

describe("importPaths", () => {
  it("normalizes a dialog selection into multiple epub paths", () => {
    expect(normalizePickedEpubPaths("C:/books/a.epub")).toEqual(["C:/books/a.epub"]);
    expect(normalizePickedEpubPaths(["C:/books/a.epub", "C:/books/b.EPUB"])).toEqual([
      "C:/books/a.epub",
      "C:/books/b.EPUB"
    ]);
    expect(normalizePickedEpubPaths(null)).toEqual([]);
  });

  it("extracts only epub paths from a drag and drop file list", () => {
    const files = [
      { name: "a.epub", path: "C:/books/a.epub" },
      { name: "notes.txt", path: "C:/books/notes.txt" },
      { name: "b.EPUB", path: "C:/books/b.EPUB" },
      { name: "missing-path.epub" }
    ];

    expect(epubPathsFromDrop(files)).toEqual(["C:/books/a.epub", "C:/books/b.EPUB"]);
  });

  it("extracts epub paths from a native Tauri drop payload", () => {
    expect(
      epubPathsFromTauriDragDrop({
        type: "drop",
        paths: ["C:/books/a.epub", "C:/books/cover.jpg", "C:/books/b.EPUB"]
      })
    ).toEqual(["C:/books/a.epub", "C:/books/b.EPUB"]);

    expect(epubPathsFromTauriDragDrop({ type: "over" })).toEqual([]);
  });
});
