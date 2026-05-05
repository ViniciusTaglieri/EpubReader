import { useEffect, useMemo, useState } from "react";
import {
  BookMarked,
  FolderOpen,
  LayoutGrid,
  Library,
  ListFilter,
  Search,
  Settings,
  Star
} from "lucide-react";
import { BookCard } from "./BookCard";
import { ImportButton } from "./ImportButton";
import { epubPathsFromDrop } from "./importPaths";
import {
  filterAndSortBooks,
  type LibraryFilters,
  type LibrarySort
} from "./libraryFilters";
import { commands, errorMessage } from "../../shared/tauri/commands";
import type { BookDto } from "../../shared/types/books";

type CoverMap = Record<string, string>;

type LibraryPageProps = {
  onOpenBook: (book: BookDto) => void;
};

export function LibraryPage({ onOpenBook }: LibraryPageProps) {
  const [books, setBooks] = useState<BookDto[]>([]);
  const [covers, setCovers] = useState<CoverMap>({});
  const [filters, setFilters] = useState<LibraryFilters>({
    query: "",
    status: "all",
    sortBy: "last_opened"
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void refreshBooks();
  }, []);

  useEffect(() => {
    for (const book of books) {
      if (!book.coverPath || covers[book.id]) continue;
      void commands.getCover(book.id).then((bytes) => {
        if (!bytes.length) return;
        const blob = new Blob([new Uint8Array(bytes)], { type: "image/jpeg" });
        setCovers((current) => ({
          ...current,
          [book.id]: URL.createObjectURL(blob)
        }));
      });
    }
  }, [books, covers]);

  const visibleBooks = useMemo(
    () => filterAndSortBooks(books, filters),
    [books, filters]
  );

  async function refreshBooks() {
    setIsLoading(true);
    try {
      setBooks(await commands.listBooks());
      setMessage(null);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function importBooks(paths: string[]) {
    const uniquePaths = Array.from(new Set(paths));
    if (!uniquePaths.length) {
      setMessage("Selecione ou arraste arquivos EPUB validos.");
      return;
    }

    setIsImporting(true);
    let importedCount = 0;
    const failures: string[] = [];

    try {
      for (const path of uniquePaths) {
        try {
          await commands.importEpub(path);
          importedCount += 1;
        } catch (error) {
          failures.push(`${fileNameFromPath(path)}: ${errorMessage(error)}`);
        }
      }
      await refreshBooks();
      if (failures.length) {
        setMessage(
          `${importedCount} EPUB(s) importado(s). Falhas: ${failures.join(" | ")}`
        );
      } else {
        setMessage(`${importedCount} EPUB(s) importado(s) para a biblioteca.`);
      }
    } finally {
      setIsImporting(false);
    }
  }

  async function deleteBook(book: BookDto, deleteFile: boolean) {
    const scope = deleteFile ? "da biblioteca e do armazenamento local" : "da biblioteca";
    if (!window.confirm(`Excluir "${book.title}" ${scope}?`)) return;
    try {
      await commands.deleteBook(book.id, deleteFile);
      setBooks((current) => current.filter((item) => item.id !== book.id));
      setMessage(`"${book.title}" removido.`);
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    const paths = epubPathsFromDrop(event.dataTransfer.files as unknown as Iterable<File & { path?: string }>);
    if (paths.length) {
      void importBooks(paths);
    } else {
      setMessage("Arraste um ou mais arquivos EPUB validos.");
    }
  }

  return (
    <main
      className="min-h-screen text-neutral-100"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <header className="flex h-20 items-center gap-6 border-b border-white/10 bg-black/20 px-6 backdrop-blur">
        <div className="flex min-w-52 items-center gap-3">
          <BookMarked className="text-amber-300" size={28} />
          <h1 className="text-xl font-bold">Leitor EPUB</h1>
        </div>

        <label className="relative max-w-xl flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            size={20}
          />
          <input
            value={filters.query}
            onChange={(event) =>
              setFilters((current) => ({ ...current, query: event.target.value }))
            }
            placeholder="Buscar livro ou autor"
            className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.06] pl-11 pr-4 text-sm outline-none ring-amber-300/30 transition placeholder:text-neutral-400 focus:ring-4"
          />
        </label>

        <ImportButton onImport={importBooks} disabled={isImporting} />
      </header>

      <div className="grid min-h-[calc(100vh-5rem)] grid-cols-[15rem_1fr]">
        <aside className="border-r border-white/10 bg-black/20 p-5">
          <nav className="space-y-2">
            <SideItem icon={<Library size={22} />} label="Biblioteca" active />
            <SideItem icon={<ListFilter size={22} />} label="Recentes" />
            <SideItem icon={<FolderOpen size={22} />} label="Colecoes" />
            <SideItem icon={<Star size={22} />} label="Favoritos" />
            <SideItem icon={<Settings size={22} />} label="Configuracoes" />
          </nav>

          <section className="mt-10 rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <p className="text-sm font-semibold text-white">Armazenamento local</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/4 rounded-full bg-sky-400" />
            </div>
            <p className="mt-3 text-xs text-neutral-400">AppData / books</p>
          </section>
        </aside>

        <section className="p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Biblioteca</h2>
              <p className="mt-1 text-sm text-neutral-400">
                EPUBs importados para o armazenamento local do app.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value as LibraryFilters["status"]
                  }))
                }
                className="h-10 rounded-md border border-white/10 bg-neutral-900 px-3 text-sm"
              >
                <option value="all">Todos</option>
                <option value="unread">Nao lidos</option>
                <option value="reading">Lendo</option>
                <option value="finished">Finalizados</option>
              </select>
              <select
                value={filters.sortBy}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    sortBy: event.target.value as LibrarySort
                  }))
                }
                className="h-10 rounded-md border border-white/10 bg-neutral-900 px-3 text-sm"
              >
                <option value="last_opened">Ultimo aberto</option>
                <option value="imported_at">Data de importacao</option>
                <option value="title">Titulo</option>
                <option value="author">Autor</option>
                <option value="progress">Progresso</option>
              </select>
              <button
                type="button"
                title="Visualizacao em grid"
                className="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-white/[0.06] text-amber-200"
              >
                <LayoutGrid size={18} />
              </button>
            </div>
          </div>

          {message ? (
            <div className="mt-5 rounded-md border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              {message}
            </div>
          ) : null}

          <div className="mt-6">
            {isLoading ? (
              <EmptyState title="Carregando biblioteca..." />
            ) : visibleBooks.length ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-5">
                {visibleBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    coverUrl={covers[book.id]}
                    onOpen={onOpenBook}
                    onDelete={deleteBook}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="Sua Bookshelf ainda esta vazia." />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function SideItem({
  icon,
  label,
  active = false
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm transition ${
        active
          ? "bg-white/10 font-semibold text-amber-200"
          : "text-neutral-300 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
      <div>
        <BookMarked className="mx-auto text-amber-300" size={42} />
        <p className="mt-4 text-lg font-semibold text-white">{title}</p>
        <p className="mt-2 max-w-md text-sm text-neutral-400">
          Use Importar EPUB ou arraste um ou mais arquivos .epub para iniciar o Ingestion Pipeline.
        </p>
      </div>
    </div>
  );
}

function fileNameFromPath(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}
