import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type {
  BookDetailDto,
  BookDto,
  CollectionDto,
  EpubManifestDto,
  ReadingLocator,
  ReadingSettingsDto,
  ResourceDto
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
  getSpineResource: (bookId: string, href: string) =>
    invoke<ResourceDto>("get_spine_resource", { bookId, href }),
  getCover: (bookId: string) => invoke<number[]>("get_cover", { bookId }),
  saveProgress: (bookId: string, locator: ReadingLocator) =>
    invoke<void>("save_progress", { bookId, locator }),
  getProgress: (bookId: string) =>
    invoke<ReadingLocator | null>("get_progress", { bookId }),
  updateReadingSettings: (settings: ReadingSettingsDto) =>
    invoke<void>("update_reading_settings", { settings })
};

export function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as AppError).message);
  }
  return "Nao foi possivel concluir a operacao.";
}
