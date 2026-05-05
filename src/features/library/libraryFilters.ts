import type { BookDto, ReadingStatus } from "../../shared/types/books";

export type LibrarySort =
  | "title"
  | "author"
  | "last_opened"
  | "published_at"
  | "progress"
  | "size";

export type LibraryFilters = {
  query: string;
  status: "all" | ReadingStatus;
  favorite: "all" | "favorites";
  sortBy: LibrarySort;
};

const normalized = (value?: string | null) => value?.toLocaleLowerCase("pt-BR") ?? "";

export function filterAndSortBooks(books: BookDto[], filters: LibraryFilters): BookDto[] {
  const query = normalized(filters.query).trim();

  return [...books]
    .filter((book) => {
      const matchesQuery =
        query.length === 0 ||
        normalized(book.title).includes(query) ||
        normalized(book.author).includes(query);
      const matchesStatus = filters.status === "all" || book.readingStatus === filters.status;
      const matchesFavorite = filters.favorite === "all" || book.isFavorite;
      return matchesQuery && matchesStatus && matchesFavorite;
    })
    .sort((left, right) => compareBooks(left, right, filters.sortBy));
}

function compareBooks(left: BookDto, right: BookDto, sortBy: LibrarySort): number {
  if (sortBy === "title") {
    return left.title.localeCompare(right.title, "pt-BR");
  }

  if (sortBy === "author") {
    return normalized(left.author).localeCompare(normalized(right.author), "pt-BR");
  }

  if (sortBy === "progress") {
    return right.totalProgression - left.totalProgression;
  }

  if (sortBy === "size") {
    return right.textLength - left.textLength;
  }

  if (sortBy === "last_opened") {
    return dateValue(right.lastOpenedAt) - dateValue(left.lastOpenedAt);
  }

  return dateValue(right.publishedAt) - dateValue(left.publishedAt);
}

function dateValue(value?: string | null): number {
  return value ? new Date(value).getTime() : 0;
}
