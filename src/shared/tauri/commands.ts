import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type {
  BookDetailDto,
  BookDto,
  EpubManifestDto,
  ReadingLocator,
  ReadingSettingsDto,
  ResourceDto
} from "../types/books";

export type AppError = {
  code: string;
  message: string;
};

export async function pickEpubFile(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: "EPUB", extensions: ["epub"] }]
  });
  return typeof selected === "string" ? selected : null;
}

export const commands = {
  importEpub: (path: string) => invoke<BookDto>("import_epub", { path }),
  listBooks: () => invoke<BookDto[]>("list_books"),
  getBook: (bookId: string) => invoke<BookDetailDto>("get_book", { bookId }),
  deleteBook: (bookId: string, deleteFile: boolean) =>
    invoke<void>("delete_book", { bookId, deleteFile }),
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
