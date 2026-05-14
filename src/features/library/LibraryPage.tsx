import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getCurrentWebview, type DragDropEvent } from '@tauri-apps/api/webview'
import { BookMarked } from 'lucide-react'
import { BookCard } from './BookCard'
import { ImportButton } from './ImportButton'
import { epubPathsFromDrop, epubPathsFromTauriDragDrop } from './importPaths'
import { filterAndSortBooks, type LibraryFilters } from './libraryFilters'
import {
  loadLibraryPreferences,
  resolveLibraryTheme,
  saveLibraryPreferences,
  type LibraryPreferences,
} from './libraryPreferences'
import { commands, errorMessage } from '../../shared/tauri/commands'
import {
  AppMessage,
  type AppMessageData,
  type AppMessageVariant,
} from '../../shared/components/AppMessage'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import type { BookDto, CollectionDto } from '../../shared/types/books'
import { LibrarySidebar } from './LibrarySidebar'
import { LibrarySettingsPage } from './LibrarySettingsPage'
import { LibraryToolbar } from './LibraryToolbar'
import type { LibrarySection, LibraryView } from './libraryTypes'
import { useBookCovers } from './useBookCovers'
import {
  loadReaderSettings,
  saveReaderSettings,
  type ReaderSettings,
} from '../reader/epubCfiReader'
import {
  loadSavedFilters,
  loadSavedView,
  saveLibraryFilters,
  saveLibraryView,
} from './libraryStorage'
import { CollectionDialog } from './CollectionDialog'
import { CollectionsOverview } from './CollectionsOverview'

type LibraryPageProps = {
  onOpenBook: (book: BookDto) => void
}

export function LibraryPage({ onOpenBook }: LibraryPageProps) {
  const [books, setBooks] = useState<BookDto[]>([])
  const covers = useBookCovers(books)
  const [filters, setFilters] = useState<LibraryFilters>(() =>
    loadSavedFilters(),
  )
  const [preferences, setPreferences] = useState<LibraryPreferences>(() =>
    loadLibraryPreferences(),
  )
  const [prefersLightTheme, setPrefersLightTheme] = useState(
    () => window.matchMedia('(prefers-color-scheme: light)').matches,
  )
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(() =>
    loadReaderSettings(),
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [message, setMessage] = useState<AppMessageData | null>(null)
  const [view, setView] = useState<LibraryView>(() => loadSavedView())
  const [collections, setCollections] = useState<CollectionDto[]>([])
  const [activeSection, setActiveSection] = useState<LibrarySection>('library')
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null)
  const [collectionsExpanded, setCollectionsExpanded] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false)
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(
    null,
  )
  const [collectionName, setCollectionName] = useState('')
  const [collectionBookIds, setCollectionBookIds] = useState<string[]>([])
  const [pendingDeleteBook, setPendingDeleteBook] = useState<BookDto | null>(
    null,
  )
  const [pendingDeleteCollection, setPendingDeleteCollection] =
    useState<CollectionDto | null>(null)
  const selectedCollection = collections.find(
    (collection) => collection.id === selectedCollectionId,
  )

  useEffect(() => {
    void refreshLibrary()
  }, [])

  useEffect(() => {
    saveLibraryFilters(filters)
  }, [filters])

  useEffect(() => {
    saveLibraryView(view)
  }, [view])

  useEffect(() => {
    saveLibraryPreferences(preferences)
  }, [preferences])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
    const updatePreference = () => setPrefersLightTheme(mediaQuery.matches)
    updatePreference()
    mediaQuery.addEventListener('change', updatePreference)
    return () => mediaQuery.removeEventListener('change', updatePreference)
  }, [])

  useEffect(() => {
    saveReaderSettings(readerSettings)
  }, [readerSettings])

  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return
    let unlisten: (() => void) | undefined

    getCurrentWebview()
      .onDragDropEvent((event) => {
        const paths = epubPathsFromTauriDragDrop(event.payload as DragDropEvent)
        if (paths.length) {
          void importBooks(paths)
        }
      })
      .then((unsubscribe) => {
        unlisten = unsubscribe
      })
      .catch(() => undefined)

    return () => {
      unlisten?.()
    }
  }, [selectedCollectionId, selectedCollection?.name])

  const scopedBooks = useMemo(() => {
    if (activeSection === 'collections' && selectedCollectionId) {
      const collection = collections.find(
        (item) => item.id === selectedCollectionId,
      )
      return books.filter((book) => collection?.bookIds.includes(book.id))
    }
    if (activeSection === 'settings') {
      return []
    }
    return books
  }, [activeSection, books, collections, selectedCollectionId])

  const visibleBooks = useMemo(
    () => filterAndSortBooks(scopedBooks, filters),
    [scopedBooks, filters],
  )
  async function refreshLibrary() {
    await Promise.all([refreshBooks(), refreshCollections()])
  }

  function showMessage(text: string, variant: AppMessageVariant) {
    setMessage({ text, variant })
  }

  async function refreshBooks() {
    setIsLoading(true)
    try {
      setBooks(await commands.listBooks())
      setMessage(null)
    } catch (error) {
      showMessage(errorMessage(error), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  async function refreshCollections() {
    try {
      setCollections(await commands.listCollections())
    } catch (error) {
      showMessage(errorMessage(error), 'error')
    }
  }

  async function importBooks(paths: string[]) {
    const uniquePaths = Array.from(new Set(paths))
    if (!uniquePaths.length) {
      showMessage('Selecione ou arraste arquivos EPUB válidos.', 'warning')
      return
    }

    setIsImporting(true)
    let importedCount = 0
    const failures: string[] = []

    try {
      for (const path of uniquePaths) {
        try {
          const imported = await commands.importEpub(path)
          if (selectedCollectionId) {
            await commands.addBookToCollection(
              selectedCollectionId,
              imported.id,
            )
          }
          importedCount += 1
        } catch (error) {
          failures.push(`${fileNameFromPath(path)}: ${errorMessage(error)}`)
        }
      }
      await refreshLibrary()
      if (failures.length) {
        showMessage(
          `${importedCount} EPUB(s) importado(s). Falhas: ${failures.join(' | ')}`,
          importedCount > 0 ? 'warning' : 'error',
        )
      } else {
        showMessage(
          selectedCollection
            ? `${importedCount} EPUB(s) importado(s) para "${selectedCollection.name}".`
            : `${importedCount} EPUB(s) importado(s) para a biblioteca.`,
          'success',
        )
      }
    } finally {
      setIsImporting(false)
    }
  }

  async function toggleFavorite(book: BookDto) {
    const isFavorite = !book.isFavorite
    try {
      await commands.setBookFavorite(book.id, isFavorite)
      setBooks((current) =>
        current.map((item) =>
          item.id === book.id ? { ...item, isFavorite } : item,
        ),
      )
    } catch (error) {
      showMessage(errorMessage(error), 'error')
    }
  }

  function createCollectionForBook(book: BookDto) {
    openCollectionDialog([book.id])
  }

  async function toggleBookCollection(
    book: BookDto,
    collection: CollectionDto,
  ) {
    const hasBook = collection.bookIds.includes(book.id)
    try {
      if (hasBook) {
        await commands.removeBookFromCollection(collection.id, book.id)
      } else {
        await commands.addBookToCollection(collection.id, book.id)
      }
      await refreshCollections()
    } catch (error) {
      showMessage(errorMessage(error), 'error')
    }
  }

  function openCollectionDialog(
    initialBookIds: string[] = [],
    collection?: CollectionDto,
  ) {
    setEditingCollectionId(collection?.id ?? null)
    setCollectionName(collection?.name ?? '')
    setCollectionBookIds(collection?.bookIds ?? initialBookIds)
    setCollectionDialogOpen(true)
  }

  async function saveCollection() {
    const name = collectionName.trim()
    if (!name) {
      showMessage('Informe um nome para a coleção.', 'warning')
      return
    }
    try {
      if (editingCollectionId) {
        const collection = await commands.updateCollection(
          editingCollectionId,
          name,
          collectionBookIds,
        )
        await refreshCollections()
        setSelectedCollectionId(collection.id)
        setCollectionDialogOpen(false)
        showMessage(`Coleção "${collection.name}" atualizada.`, 'success')
        return
      }

      const collection = await commands.createCollection(name)
      for (const bookId of collectionBookIds) {
        await commands.addBookToCollection(collection.id, bookId)
      }
      await refreshCollections()
      setActiveSection('collections')
      setSelectedCollectionId(collection.id)
      setCollectionDialogOpen(false)
      showMessage(`Coleção "${collection.name}" criada.`, 'success')
    } catch (error) {
      showMessage(errorMessage(error), 'error')
    }
  }

  async function deleteCollection(collection: CollectionDto) {
    try {
      await commands.deleteCollection(collection.id)
      await refreshCollections()
      if (selectedCollectionId === collection.id) {
        setSelectedCollectionId(null)
      }
      setActiveSection('collections')
      showMessage(`Coleção "${collection.name}" excluída.`, 'success')
    } catch (error) {
      showMessage(errorMessage(error), 'error')
    }
  }

  async function deleteBook(book: BookDto) {
    try {
      await commands.deleteBook(book.id)
      setBooks((current) => current.filter((item) => item.id !== book.id))
      showMessage(
        `O livro: "${book.title}" foi removido da biblioteca.`,
        'success',
      )
    } catch (error) {
      showMessage(errorMessage(error), 'error')
    }
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault()
    const paths = epubPathsFromDrop(
      event.dataTransfer.files as unknown as Iterable<File & { path?: string }>,
    )
    if (paths.length) {
      void importBooks(paths)
    } else {
      showMessage('Arraste um ou mais arquivos EPUB válidos.', 'warning')
    }
  }

  const resolvedTheme = resolveLibraryTheme(
    preferences.theme,
    prefersLightTheme,
  )

  return (
    <main
      data-library-theme={resolvedTheme}
      className={`library-shell flex h-full overflow-hidden text-neutral-100 ${
        resolvedTheme === 'light' ? 'bg-[#f7f2e8]' : 'bg-[#12110f]'
      }`}
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
          setActiveSection('library')
          setSelectedCollectionId(null)
        }}
        onToggleCollections={() => {
          setActiveSection('collections')
          setSelectedCollectionId(null)
          setCollectionsExpanded((current) => !current)
        }}
        onOpenCollection={(collectionId) => {
          setActiveSection('collections')
          setSelectedCollectionId(collectionId)
        }}
        onOpenSettings={() => setActiveSection('settings')}
      />

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="library-topbar shrink-0 border-b border-white/10 bg-[#12110f]/95 p-6 backdrop-blur">
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
          ) : activeSection === 'settings' ? (
            <LibrarySettingsPage
              books={books}
              collections={collections}
              view={view}
              filters={filters}
              sidebarCollapsed={sidebarCollapsed}
              preferences={preferences}
              readerSettings={readerSettings}
              onViewChange={setView}
              onSidebarCollapsedChange={setSidebarCollapsed}
              onPreferencesChange={(next) =>
                setPreferences((current) => ({ ...current, ...next }))
              }
              onReaderSettingsChange={(next) =>
                setReaderSettings((current) => ({ ...current, ...next }))
              }
            />
          ) : activeSection === 'collections' && !selectedCollectionId ? (
            <CollectionsOverview
              collections={collections}
              books={books}
              covers={covers}
              onCreate={() => openCollectionDialog()}
              onOpen={(collection) => setSelectedCollectionId(collection.id)}
              onEdit={(collection) => openCollectionDialog([], collection)}
              onDelete={setPendingDeleteCollection}
            />
          ) : visibleBooks.length ? (
            <div
              className={
                view === 'grid'
                  ? `grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] ${
                      preferences.density === 'compact' ? 'gap-3' : 'gap-5'
                    }`
                  : preferences.density === 'compact'
                    ? 'space-y-2'
                    : 'space-y-3'
              }
            >
              <ImportButton
                onImport={importBooks}
                disabled={isImporting}
                view={view}
              />
              {visibleBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  coverUrl={covers[book.id]}
                  view={view}
                  collections={collections}
                  onOpen={onOpenBook}
                  onDelete={setPendingDeleteBook}
                  onToggleFavorite={toggleFavorite}
                  onCreateCollection={createCollectionForBook}
                  onToggleCollection={toggleBookCollection}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="Sua biblioteca ainda está vazia.">
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
          mode={editingCollectionId ? 'edit' : 'create'}
        />
      ) : null}

      {pendingDeleteCollection ? (
        <ConfirmDialog
          title="Excluir coleção"
          description={`Excluir "${pendingDeleteCollection.name}"? Os livros permanecem na biblioteca.`}
          confirmLabel="Excluir coleção"
          danger
          onCancel={() => setPendingDeleteCollection(null)}
          onConfirm={() => {
            const collection = pendingDeleteCollection
            setPendingDeleteCollection(null)
            void deleteCollection(collection)
          }}
        />
      ) : null}

      {pendingDeleteBook ? (
        <ConfirmDialog
          title="Remover livro"
          description={`Remover "${pendingDeleteBook.title}" do app e apagar os arquivos salvos deste livro?`}
          confirmLabel="Remover livro"
          danger
          onCancel={() => setPendingDeleteBook(null)}
          onConfirm={() => {
            const book = pendingDeleteBook
            setPendingDeleteBook(null)
            void deleteBook(book)
          }}
        />
      ) : null}
    </main>
  )
}

function EmptyState({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
      <div>
        <BookMarked className="mx-auto text-amber-300" size={42} />
        <p className="mt-4 text-lg font-semibold text-white">{title}</p>
        <p className="mt-2 max-w-md text-sm text-neutral-400">
          Importe um EPUB ou arraste arquivos para começar.
        </p>
        {children}
      </div>
    </div>
  )
}

function fileNameFromPath(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}
