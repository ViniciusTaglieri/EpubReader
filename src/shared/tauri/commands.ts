import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type {
  BookDetailDto,
  BookDto,
  BookmarkDto,
  CollectionDto,
  EpubManifestDto,
  HighlightDto,
  HighlightRangeDto,
  ReadingLocator,
  ReadingSettingsDto,
  ResourceDto,
  SearchResultDto
} from "../types/books";
import { normalizePickedEpubPaths } from "../../features/library/importPaths";

export type AppError = {
  code: string;
  message: string;
};

export async function pickEpubFiles(): Promise<string[]> {
  const selected = await open({
    multiple: true,
    filters: [{ name: "EPUB", extensions: ["epub"] }]
  });
  return normalizePickedEpubPaths(selected);
}

export const commands = {
  importEpub: (path: string) => invoke<BookDto>("import_epub", { path }),
  listBooks: () => invoke<BookDto[]>("list_books"),
  getBook: (bookId: string) => invoke<BookDetailDto>("get_book", { bookId }),
  deleteBook: (bookId: string) =>
    invoke<void>("delete_book", { bookId }),
  setBookFavorite: (bookId: string, isFavorite: boolean) =>
    invoke<void>("set_book_favorite", { bookId, isFavorite }),
  createCollection: (name: string) =>
    invoke<CollectionDto>("create_collection", { name }),
  listCollections: () => invoke<CollectionDto[]>("list_collections"),
  updateCollection: (collectionId: string, name: string, bookIds: string[]) =>
    invoke<CollectionDto>("update_collection", { collectionId, name, bookIds }),
  addBookToCollection: (collectionId: string, bookId: string) =>
    invoke<void>("add_book_to_collection", { collectionId, bookId }),
  removeBookFromCollection: (collectionId: string, bookId: string) =>
    invoke<void>("remove_book_from_collection", { collectionId, bookId }),
  deleteCollection: (collectionId: string) =>
    invoke<void>("delete_collection", { collectionId }),
  getBookManifest: (bookId: string) =>
    invoke<EpubManifestDto>("get_book_manifest", { bookId }),
  getBookRendition: (bookId: string) =>
    invoke<ResourceDto>("get_book_rendition", { bookId }),
  getSpineResource: (bookId: string, href: string) =>
    invoke<ResourceDto>("get_spine_resource", { bookId, href }),
  getCover: (bookId: string) => invoke<number[]>("get_cover", { bookId }),
  saveProgress: (bookId: string, locator: ReadingLocator) =>
    invoke<void>("save_progress", { bookId, locator }),
  getProgress: (bookId: string) =>
    invoke<ReadingLocator | null>("get_progress", { bookId }),
  createBookmark: (bookId: string, locator: ReadingLocator, label?: string) =>
    invoke<BookmarkDto>("create_bookmark", { bookId, locator, label }),
  listBookmarks: (bookId: string) =>
    invoke<BookmarkDto[]>("list_bookmarks", { bookId }),
  deleteBookmark: (bookmarkId: string) =>
    invoke<void>("delete_bookmark", { bookmarkId }),
  createHighlight: (
    bookId: string,
    range: HighlightRangeDto,
    color: string,
    note?: string
  ) => invoke<HighlightDto>("create_highlight", { bookId, range, color, note }),
  listHighlights: (bookId: string) =>
    invoke<HighlightDto[]>("list_highlights", { bookId }),
  updateHighlightNote: (highlightId: string, note: string) =>
    invoke<void>("update_highlight_note", { highlightId, note }),
  searchInBook: (bookId: string, query: string) =>
    invoke<SearchResultDto[]>("search_in_book", { bookId, query }),
  updateReadingSettings: (settings: ReadingSettingsDto) =>
    invoke<void>("update_reading_settings", { settings }),
  getReadingSettings: (settingsId: string) =>
    invoke<ReadingSettingsDto | null>("get_reading_settings", { settingsId })
};

export function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as AppError).message);
  }
  return "Nao foi possivel concluir a operacao.";
}
