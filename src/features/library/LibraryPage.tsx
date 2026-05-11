import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getCurrentWebview, type DragDropEvent } from "@tauri-apps/api/webview";
import {
  BookMarked,
  Edit3,
  FolderOpen,
  MoreVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { BookCard } from "./BookCard";
import { ImportButton } from "./ImportButton";
import { epubPathsFromDrop, epubPathsFromTauriDragDrop } from "./importPaths";
import {
  filterAndSortBooks,
  type LibraryFilters,
  type LibrarySort,
} from "./libraryFilters";
import { commands, errorMessage } from "../../shared/tauri/commands";
import {
  AppMessage,
  type AppMessageData,
  type AppMessageVariant,
} from "../../shared/components/AppMessage";
import type { BookDto, CollectionDto } from "../../shared/types/books";
import { LibrarySidebar } from "./LibrarySidebar";
import { LibraryToolbar } from "./LibraryToolbar";
import type { LibrarySection, LibraryView } from "./libraryTypes";
import { useBookCovers, type CoverMap } from "./useBookCovers";

const LIBRARY_FILTERS_STORAGE_KEY = "epub-reader:library-filters";
const LIBRARY_VIEW_STORAGE_KEY = "epub-reader:library-view";

type LibraryPageProps = {
  onOpenBook: (book: BookDto) => void;
};

export function LibraryPage({ onOpenBook }: LibraryPageProps) {
  const [books, setBooks] = useState<BookDto[]>([]);
  const covers = useBookCovers(books);
  const [filters, setFilters] = useState<LibraryFilters>(() =>
    loadSavedFilters(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<AppMessageData | null>(null);
  const [view, setView] = useState<LibraryView>(() => loadSavedView());
  const [collections, setCollections] = useState<CollectionDto[]>([]);
  const [activeSection, setActiveSection] = useState<LibrarySection>("library");
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);
  const [collectionsExpanded, setCollectionsExpanded] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(
    null,
  );
  const [collectionName, setCollectionName] = useState("");
  const [collectionBookIds, setCollectionBookIds] = useState<string[]>([]);
  const selectedCollection = collections.find(
    (collection) => collection.id === selectedCollectionId,
  );

  useEffect(() => {
    void refreshLibrary();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      LIBRARY_FILTERS_STORAGE_KEY,
      JSON.stringify(filters),
    );
  }, [filters]);

  useEffect(() => {
    window.localStorage.setItem(LIBRARY_VIEW_STORAGE_KEY, view);
  }, [view]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getCurrentWebview()
      .onDragDropEvent((event) => {
        const paths = epubPathsFromTauriDragDrop(
          event.payload as DragDropEvent,
        );
        if (paths.length) {
          void importBooks(paths);
        }
      })
      .then((unsubscribe) => {
        unlisten = unsubscribe;
      })
      .catch(() => undefined);

    return () => {
      unlisten?.();
    };
  }, [selectedCollectionId, selectedCollection?.name]);

  const scopedBooks = useMemo(() => {
    if (activeSection === "collections" && selectedCollectionId) {
      const collection = collections.find(
        (item) => item.id === selectedCollectionId,
      );
      return books.filter((book) => collection?.bookIds.includes(book.id));
    }
    if (activeSection === "settings") {
      return [];
    }
    return books;
  }, [activeSection, books, collections, selectedCollectionId]);

  const visibleBooks = useMemo(
    () => filterAndSortBooks(scopedBooks, filters),
    [scopedBooks, filters],
  );
  async function refreshLibrary() {
    await Promise.all([refreshBooks(), refreshCollections()]);
  }

  function showMessage(text: string, variant: AppMessageVariant) {
    setMessage({ text, variant });
  }

  async function refreshBooks() {
    setIsLoading(true);
    try {
      setBooks(await commands.listBooks());
      setMessage(null);
    } catch (error) {
      showMessage(errorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshCollections() {
    try {
      setCollections(await commands.listCollections());
    } catch (error) {
      showMessage(errorMessage(error), "error");
    }
  }

  async function importBooks(paths: string[]) {
    const uniquePaths = Array.from(new Set(paths));
    if (!uniquePaths.length) {
      showMessage("Selecione ou arraste arquivos EPUB validos.", "warning");
      return;
    }

    setIsImporting(true);
    let importedCount = 0;
    const failures: string[] = [];

    try {
      for (const path of uniquePaths) {
        try {
          const imported = await commands.importEpub(path);
          if (selectedCollectionId) {
            await commands.addBookToCollection(
              selectedCollectionId,
              imported.id,
            );
          }
          importedCount += 1;
        } catch (error) {
          failures.push(`${fileNameFromPath(path)}: ${errorMessage(error)}`);
        }
      }
      await refreshLibrary();
      if (failures.length) {
        showMessage(
          `${importedCount} EPUB(s) importado(s). Falhas: ${failures.join(" | ")}`,
          importedCount > 0 ? "warning" : "error",
        );
      } else {
        showMessage(
          selectedCollection
            ? `${importedCount} EPUB(s) importado(s) para "${selectedCollection.name}".`
            : `${importedCount} EPUB(s) importado(s) para a biblioteca.`,
          "success",
        );
      }
    } finally {
      setIsImporting(false);
    }
  }

  async function toggleFavorite(book: BookDto) {
    const isFavorite = !book.isFavorite;
    try {
      await commands.setBookFavorite(book.id, isFavorite);
      setBooks((current) =>
        current.map((item) =>
          item.id === book.id ? { ...item, isFavorite } : item,
        ),
      );
    } catch (error) {
      showMessage(errorMessage(error), "error");
    }
  }

  function createCollectionForBook(book: BookDto) {
    openCollectionDialog([book.id]);
  }

  async function toggleBookCollection(
    book: BookDto,
    collection: CollectionDto,
  ) {
    const hasBook = collection.bookIds.includes(book.id);
    try {
      if (hasBook) {
        await commands.removeBookFromCollection(collection.id, book.id);
      } else {
        await commands.addBookToCollection(collection.id, book.id);
      }
      await refreshCollections();
    } catch (error) {
      showMessage(errorMessage(error), "error");
    }
  }

  function openCollectionDialog(
    initialBookIds: string[] = [],
    collection?: CollectionDto,
  ) {
    setEditingCollectionId(collection?.id ?? null);
    setCollectionName(collection?.name ?? "");
    setCollectionBookIds(collection?.bookIds ?? initialBookIds);
    setCollectionDialogOpen(true);
  }

  async function saveCollection() {
    const name = collectionName.trim();
    if (!name) {
      showMessage("Informe um nome para a colecao.", "warning");
      return;
    }
    try {
      if (editingCollectionId) {
        const collection = await commands.updateCollection(
          editingCollectionId,
          name,
          collectionBookIds,
        );
        await refreshCollections();
        setSelectedCollectionId(collection.id);
        setCollectionDialogOpen(false);
        showMessage(`Colecao "${collection.name}" atualizada.`, "success");
        return;
      }

      const collection = await commands.createCollection(name);
      for (const bookId of collectionBookIds) {
        await commands.addBookToCollection(collection.id, bookId);
      }
      await refreshCollections();
      setActiveSection("collections");
      setSelectedCollectionId(collection.id);
      setCollectionDialogOpen(false);
      showMessage(`Colecao "${collection.name}" criada.`, "success");
    } catch (error) {
      showMessage(errorMessage(error), "error");
    }
  }

  async function deleteCollection(collection: CollectionDto) {
    if (
      !window.confirm(
        `Excluir a colecao "${collection.name}"? Os livros permanecem na biblioteca.`,
      )
    )
      return;
    try {
      await commands.deleteCollection(collection.id);
      await refreshCollections();
      if (selectedCollectionId === collection.id) {
        setSelectedCollectionId(null);
      }
      setActiveSection("collections");
      showMessage(`Colecao "${collection.name}" excluida.`, "success");
    } catch (error) {
      showMessage(errorMessage(error), "error");
    }
  }

  async function deleteBook(book: BookDto) {
    if (
      !window.confirm(
        `Remover "${book.title}" do app e apagar todos os arquivos salvos deste livro?`,
      )
    )
      return;
    try {
      await commands.deleteBook(book.id);
      setBooks((current) => current.filter((item) => item.id !== book.id));
      showMessage(
        `O livro: "${book.title}" foi removido da biblioteca.`,
        "success",
      );
    } catch (error) {
      showMessage(errorMessage(error), "error");
    }
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    const paths = epubPathsFromDrop(
      event.dataTransfer.files as unknown as Iterable<File & { path?: string }>,
    );
    if (paths.length) {
      void importBooks(paths);
    } else {
      showMessage("Arraste um ou mais arquivos EPUB validos.", "warning");
    }
  }

  return (
    <main
      className="flex h-screen overflow-hidden text-neutral-100"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <LibrarySidebar
        collapsed={sidebarCollapsed}
        collectionsExpanded={collectionsExpanded}
        collections={collections}
        activeSection={activeSection}
        selectedCollectionId={selectedCollectionId}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        onOpenLibrary={() => {
          setActiveSection("library");
          setSelectedCollectionId(null);
        }}
        onToggleCollections={() => {
          setActiveSection("collections");
          setSelectedCollectionId(null);
          setCollectionsExpanded((current) => !current);
        }}
        onOpenCollection={(collectionId) => {
          setActiveSection("collections");
          setSelectedCollectionId(collectionId);
        }}
        onOpenSettings={() => setActiveSection("settings")}
      />

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-white/10 bg-[#12110f]/95 p-6 backdrop-blur">
          <LibraryToolbar
            activeSection={activeSection}
            selectedCollection={selectedCollection}
            filters={filters}
            view={view}
            onFiltersChange={setFilters}
            onViewChange={setView}
            onEditCollection={(collection) =>
              openCollectionDialog([], collection)
            }
            onDeleteCollection={deleteCollection}
          />

          {message ? (
            <AppMessage
              message={message}
              onClose={() => setMessage(null)}
              className="mt-5"
            />
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto p-7">
          {isLoading ? (
            <EmptyState title="Carregando biblioteca..." />
          ) : activeSection === "collections" && !selectedCollectionId ? (
            <CollectionsOverview
              collections={collections}
              books={books}
              covers={covers}
              onCreate={() => openCollectionDialog()}
              onOpen={(collection) => setSelectedCollectionId(collection.id)}
              onEdit={(collection) => openCollectionDialog([], collection)}
              onDelete={deleteCollection}
            />
          ) : visibleBooks.length ? (
            <div
              className={
                view === "grid"
                  ? "grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-5"
                  : "space-y-3"
              }
            >
              {activeSection === "settings" ? null : (
                <ImportButton
                  onImport={importBooks}
                  disabled={isImporting}
                  view={view}
                />
              )}
              {visibleBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  coverUrl={covers[book.id]}
                  view={view}
                  collections={collections}
                  onOpen={onOpenBook}
                  onDelete={deleteBook}
                  onToggleFavorite={toggleFavorite}
                  onCreateCollection={createCollectionForBook}
                  onToggleCollection={toggleBookCollection}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="Sua Bookshelf ainda esta vazia.">
              <ImportButton
                onImport={importBooks}
                disabled={isImporting}
                view="empty"
              />
            </EmptyState>
          )}
        </div>
      </section>

      {collectionDialogOpen ? (
        <CollectionDialog
          books={books}
          covers={covers}
          name={collectionName}
          selectedBookIds={collectionBookIds}
          onNameChange={setCollectionName}
          onToggleBook={(bookId) =>
            setCollectionBookIds((current) =>
              current.includes(bookId)
                ? current.filter((id) => id !== bookId)
                : [...current, bookId],
            )
          }
          onCancel={() => setCollectionDialogOpen(false)}
          onSave={saveCollection}
          mode={editingCollectionId ? "edit" : "create"}
        />
      ) : null}
    </main>
  );
}

function CollectionsOverview({
  collections,
  books,
  covers,
  onCreate,
  onOpen,
  onEdit,
  onDelete,
}: {
  collections: CollectionDto[];
  books: BookDto[];
  covers: CoverMap;
  onCreate: () => void;
  onOpen: (collection: CollectionDto) => void;
  onEdit: (collection: CollectionDto) => void;
  onDelete: (collection: CollectionDto) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-5">
      <button
        type="button"
        onClick={onCreate}
        className="group overflow-hidden rounded-lg border border-dashed border-amber-300/35 bg-white/[0.035] text-left shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-amber-300/70 hover:bg-amber-300/10"
      >
        <div className="grid aspect-[2/3] place-items-center bg-neutral-950/70">
          <div className="grid h-16 w-16 place-items-center rounded-full border border-amber-300/35 bg-amber-300/10 text-amber-200">
            <Plus size={30} />
          </div>
        </div>
        <div className="p-3">
          <h3 className="text-sm font-semibold text-white">Nova colecao</h3>
          <p className="mt-1 text-xs text-neutral-400">Defina nome e livros</p>
        </div>
      </button>

      {collections.map((collection) => {
        const collectionBooks = books.filter((book) =>
          collection.bookIds.includes(book.id),
        );
        return (
          <article
            key={collection.id}
            className="group relative overflow-visible rounded-lg border border-white/10 bg-white/[0.045] text-left shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-amber-300/40"
          >
            <button
              type="button"
              onClick={() => onOpen(collection)}
              className="block w-full overflow-hidden rounded-lg text-left"
            >
              <div className="grid aspect-[2/3] grid-cols-2 gap-1 bg-neutral-950 p-2">
                {collectionBooks.slice(0, 4).map((book) =>
                  covers[book.id] ? (
                    <img
                      key={book.id}
                      src={covers[book.id]}
                      alt=""
                      className="h-full w-full rounded object-cover"
                    />
                  ) : (
                    <div
                      key={book.id}
                      className="grid place-items-center rounded bg-white/10 text-amber-100"
                    >
                      <BookMarked size={18} />
                    </div>
                  ),
                )}
                {!collectionBooks.length ? (
                  <div className="col-span-2 grid h-full place-items-center text-amber-100">
                    <FolderOpen size={42} />
                  </div>
                ) : null}
              </div>
              <div className="p-3">
                <h3 className="truncate text-sm font-semibold text-white">
                  {collection.name}
                </h3>
                <p className="mt-1 text-xs text-neutral-400">
                  {collection.bookIds.length} livro(s)
                </p>
              </div>
            </button>
            <CollectionActionsMenu
              collection={collection}
              onOpen={onOpen}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </article>
        );
      })}
    </div>
  );
}

function CollectionActionsMenu({
  collection,
  onOpen,
  onEdit,
  onDelete,
}: {
  collection: CollectionDto;
  onOpen: (collection: CollectionDto) => void;
  onEdit: (collection: CollectionDto) => void;
  onDelete: (collection: CollectionDto) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="absolute right-2 top-2 z-20"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="grid h-8 w-8 place-items-center rounded-md bg-black/55 text-neutral-200 backdrop-blur transition hover:bg-black/75 hover:text-amber-200"
        title="Acoes da colecao"
      >
        <MoreVertical size={16} />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-10 z-30 w-56 rounded-lg border border-white/10 bg-neutral-950 p-2 text-xs text-neutral-200 shadow-2xl shadow-black/50"
          onClick={(event) => event.stopPropagation()}
        >
          <CollectionMenuButton
            onClick={() => {
              onEdit(collection);
              setOpen(false);
            }}
          >
            <Edit3 size={14} />
            Editar colecao
          </CollectionMenuButton>
          <div className="mt-2 border-t border-white/10 pt-2">
            <CollectionMenuButton
              danger
              onClick={() => {
                onDelete(collection);
                setOpen(false);
              }}
            >
              <Trash2 size={14} />
              Excluir colecao
            </CollectionMenuButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CollectionMenuButton({
  children,
  danger = false,
  onClick,
}: {
  children: ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left transition ${
        danger ? "text-red-200 hover:bg-red-400/10" : "hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function CollectionDialog({
  books,
  covers,
  name,
  selectedBookIds,
  onNameChange,
  onToggleBook,
  onCancel,
  onSave,
  mode,
}: {
  books: BookDto[];
  covers: CoverMap;
  name: string;
  selectedBookIds: string[];
  onNameChange: (name: string) => void;
  onToggleBook: (bookId: string) => void;
  onCancel: () => void;
  onSave: () => void;
  mode: "create" | "edit";
}) {
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-6 backdrop-blur-sm"
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-dialog-title"
        className="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-xl border border-white/10 bg-[#1f1d1a] shadow-2xl shadow-black/50"
      >
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2
              id="collection-dialog-title"
              className="text-base font-semibold text-white"
            >
              {mode === "edit" ? "Editar colecao" : "Criar colecao"}
            </h2>
            <p className="text-xs text-neutral-400">
              Escolha um nome e os livros do agrupamento.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="grid h-9 w-9 place-items-center rounded-md text-neutral-300 transition hover:bg-white/10 hover:text-white"
            title="Fechar"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-5 overflow-y-auto p-5">
          <label className="block">
            <span className="text-xs text-neutral-400">Nome da colecao</span>
            <input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 text-sm outline-none ring-amber-300/30 transition focus:ring-4"
              placeholder="Ex.: Ficcao cientifica"
            />
          </label>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-neutral-400">Livros</span>
              <span className="text-xs text-neutral-500">
                {selectedBookIds.length} selecionado(s)
              </span>
            </div>
            <div className="grid max-h-[26rem] grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3 overflow-y-auto pr-1">
              {books.map((book) => {
                const selected = selectedBookIds.includes(book.id);
                return (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => onToggleBook(book.id)}
                    className={`overflow-hidden rounded-lg border text-left transition ${
                      selected
                        ? "border-amber-300 bg-amber-300/10"
                        : "border-white/10 bg-white/[0.035] hover:border-white/25"
                    }`}
                  >
                    <div className="relative aspect-[2/3] bg-neutral-950">
                      {covers[book.id] ? (
                        <img
                          src={covers[book.id]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-amber-100">
                          <BookMarked size={28} />
                        </div>
                      )}
                      {selected ? (
                        <span className="absolute right-2 top-2 rounded bg-amber-300 px-2 py-1 text-[10px] font-semibold text-neutral-950">
                          Incluido
                        </span>
                      ) : null}
                    </div>
                    <div className="p-2">
                      <p className="truncate text-xs font-semibold text-white">
                        {book.title}
                      </p>
                      <p className="truncate text-[11px] text-neutral-400">
                        {book.author ?? "Autor desconhecido"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <footer className="flex justify-end gap-3 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-white/10 px-4 py-2 text-sm text-neutral-300 transition hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-md border border-amber-300/40 bg-amber-300 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-amber-200"
          >
            {mode === "edit" ? "Salvar colecao" : "Criar colecao"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
      <div>
        <BookMarked className="mx-auto text-amber-300" size={42} />
        <p className="mt-4 text-lg font-semibold text-white">{title}</p>
        <p className="mt-2 max-w-md text-sm text-neutral-400">
          Use Importar EPUB ou arraste um ou mais arquivos .epub para iniciar o
          Ingestion Pipeline.
        </p>
        {children}
      </div>
    </div>
  );
}

function fileNameFromPath(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function loadSavedFilters(): LibraryFilters {
  const fallback: LibraryFilters = {
    query: "",
    status: "all",
    favorite: "all",
    sortBy: "last_opened",
  };

  try {
    const value = window.localStorage.getItem(LIBRARY_FILTERS_STORAGE_KEY);
    if (!value) return fallback;
    const saved = JSON.parse(value) as Record<string, unknown>;
    const savedSort =
      saved.sortBy === "imported_at" ? "published_at" : saved.sortBy;
    return {
      ...fallback,
      ...saved,
      sortBy: isLibrarySort(savedSort) ? savedSort : fallback.sortBy,
    };
  } catch {
    return fallback;
  }
}

function loadSavedView(): LibraryView {
  const value = window.localStorage.getItem(LIBRARY_VIEW_STORAGE_KEY);
  return value === "list" ? "list" : "grid";
}

function isLibrarySort(value: unknown): value is LibrarySort {
  return (
    value === "title" ||
    value === "author" ||
    value === "last_opened" ||
    value === "published_at" ||
    value === "progress" ||
    value === "size"
  );
}
