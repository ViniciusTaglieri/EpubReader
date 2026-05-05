import { describe, expect, it } from "vitest";
import type { BookDto } from "../../shared/types/books";
import { filterAndSortBooks } from "./libraryFilters";

const book = (overrides: Partial<BookDto>): BookDto => ({
  id: "id",
  title: "Livro",
  subtitle: null,
  author: null,
  publisher: null,
  language: null,
  description: null,
  identifier: null,
  fileHash: "hash",
  filePath: "book.epub",
  coverPath: null,
  importedAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  lastOpenedAt: null,
  readingStatus: "unread",
  totalProgression: 0,
  textLength: 0,
  ...overrides
});

describe("filterAndSortBooks", () => {
  it("filters books by title or author without changing the original list", () => {
    const books = [
      book({ id: "a", title: "O Nome do Vento", author: "Patrick Rothfuss" }),
      book({ id: "b", title: "Dom Casmurro", author: "Machado de Assis" })
    ];

    const result = filterAndSortBooks(books, {
      query: "machado",
      status: "all",
      sortBy: "title"
    });

    expect(result.map((item) => item.id)).toEqual(["b"]);
    expect(books.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("filters by reading status and sorts progress descending", () => {
    const books = [
      book({ id: "a", readingStatus: "reading", totalProgression: 0.25 }),
      book({ id: "b", readingStatus: "finished", totalProgression: 1 }),
      book({ id: "c", readingStatus: "reading", totalProgression: 0.6 })
    ];

    const result = filterAndSortBooks(books, {
      query: "",
      status: "reading",
      sortBy: "progress"
    });

    expect(result.map((item) => item.id)).toEqual(["c", "a"]);
  });

  it("sorts books by estimated text size descending", () => {
    const books = [
      book({ id: "short", textLength: 10_000 }),
      book({ id: "long", textLength: 80_000 }),
      book({ id: "medium", textLength: 35_000 })
    ];

    const result = filterAndSortBooks(books, {
      query: "",
      status: "all",
      sortBy: "size"
    });

    expect(result.map((item) => item.id)).toEqual(["long", "medium", "short"]);
  });
});
