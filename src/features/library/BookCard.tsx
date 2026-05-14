import {
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  FolderPlus,
  MoreVertical,
  Star,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { BookDto, CollectionDto } from '../../shared/types/books'
import {
  resolveMenuPlacement,
  resolveSubmenuPlacement,
  type MenuPlacement,
  type SubmenuPlacement,
} from './floatingMenuPlacement'

type BookCardProps = {
  book: BookDto
  coverUrl?: string
  view: 'grid' | 'list'
  collections: CollectionDto[]
  onOpen: (book: BookDto) => void
  onDelete: (book: BookDto) => void
  onToggleFavorite: (book: BookDto) => void
  onCreateCollection: (book: BookDto) => void
  onToggleCollection: (book: BookDto, collection: CollectionDto) => void
}

export function BookCard({
  book,
  coverUrl,
  view,
  collections,
  onOpen,
  onDelete,
  onToggleFavorite,
  onCreateCollection,
  onToggleCollection,
}: BookCardProps) {
  const progress = Math.round(book.totalProgression * 100)
  const [menuOpen, setMenuOpen] = useState(false)

  if (view === 'list') {
    return (
      <article
        className={`group relative grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-4 rounded-lg border border-white/10 bg-white/[0.045] p-3 transition hover:border-amber-300/40 hover:bg-white/[0.07] ${
          menuOpen ? 'z-[80]' : 'z-0'
        }`}
      >
        <button
          type="button"
          onClick={() => onOpen(book)}
          className="grid min-w-0 grid-cols-[4.75rem_minmax(0,1.25fr)_minmax(18rem,1fr)] items-center gap-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 max-xl:grid-cols-[4.75rem_1fr]"
        >
          <div className="relative aspect-[2/3] overflow-hidden rounded bg-neutral-900">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={`Capa de ${book.title}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center text-amber-100">
                <BookOpen size={24} />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-white">
                {book.title}
              </h3>
              {book.isFavorite ? (
                <Star
                  size={14}
                  className="shrink-0 fill-amber-300 text-amber-300"
                  aria-label="Favorito"
                />
              ) : null}
            </div>
            {book.subtitle ? (
              <p className="mt-0.5 truncate text-xs text-neutral-400">
                {book.subtitle}
              </p>
            ) : null}
            <p className="mt-1 truncate text-xs text-neutral-300">
              {book.author ?? 'Autor desconhecido'}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <StatusPill status={book.readingStatus} />
              <span className="inline-flex items-center gap-1 text-xs text-neutral-400">
                <FileText size={13} />
                {formatPageEstimate(book.textLength)}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-neutral-400">
                <Clock3 size={13} />
                {formatDate(book.lastOpenedAt ?? book.importedAt)}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-amber-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="w-9 text-right text-xs text-neutral-300">
                {progress}%
              </span>
            </div>
          </div>

          <div className="min-w-0 max-xl:hidden">
            <MetadataLine book={book} detailed />
          </div>
        </button>

        <BookActionsMenu
          book={book}
          collections={collections}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
          onCreateCollection={onCreateCollection}
          onToggleCollection={onToggleCollection}
        />
      </article>
    )
  }

  return (
    <article
      className={`group relative overflow-visible rounded-lg border border-white/10 bg-white/[0.045] shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-amber-300/40 ${
        menuOpen ? 'z-[80]' : 'z-0'
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen(book)}
        className="block w-full overflow-hidden rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-t-lg bg-neutral-900">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={`Capa de ${book.title}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center text-amber-100">
              <BookOpen size={38} />
              <span className="font-serif text-xl leading-tight">
                {book.title}
              </span>
            </div>
          )}
          <span className="absolute left-3 top-3 rounded bg-black/55 px-2 py-1 text-xs font-semibold text-white backdrop-blur">
            {labelForStatus(book.readingStatus)}
          </span>
        </div>

        <div className="p-3 pr-11">
          <h3 className="truncate text-sm font-semibold text-white">
            {book.title}
          </h3>
          <div className="col-span-2 flex justify-between">
            <p className="truncate text-xs text-neutral-300">
              {book.author ?? 'Autor desconhecido'}
            </p>
            <p className="truncate text-xs text-neutral-400">
              {formatTextLength(book.textLength)} Páginas
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-amber-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="w-9 text-right text-xs text-neutral-300">
              {progress}%
            </span>
          </div>
        </div>
      </button>
      <div className="absolute right-3 top-[calc(100%_-_5.25rem)] z-[95]">
        <BookActionsMenu
          book={book}
          collections={collections}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
          onCreateCollection={onCreateCollection}
          onToggleCollection={onToggleCollection}
        />
      </div>
    </article>
  )
}

function BookActionsMenu({
  book,
  collections,
  open,
  onOpenChange,
  onDelete,
  onToggleFavorite,
  onCreateCollection,
  onToggleCollection,
}: {
  book: BookDto
  collections: CollectionDto[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (book: BookDto) => void
  onToggleFavorite: (book: BookDto) => void
  onCreateCollection: (book: BookDto) => void
  onToggleCollection: (book: BookDto, collection: CollectionDto) => void
}) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)
  const menuPanelRef = useRef<HTMLDivElement | null>(null)
  const submenuRef = useRef<HTMLDivElement | null>(null)
  const [collectionsMenuOpen, setCollectionsMenuOpen] = useState(false)
  const collectionsOpen = open && collectionsMenuOpen
  const [menuPlacement, setMenuPlacement] = useState<MenuPlacement>({
    horizontal: 'right',
    vertical: 'down',
  })
  const [submenuPlacement, setSubmenuPlacement] = useState<SubmenuPlacement>({
    horizontal: 'right',
    vertical: 'down',
  })

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [onOpenChange, open])

  useEffect(() => {
    if (!open || !menuButtonRef.current || !menuPanelRef.current) return

    function updateMenuPlacement() {
      const anchorRect = menuButtonRef.current?.getBoundingClientRect()
      const menuRect = menuPanelRef.current?.getBoundingClientRect()
      if (!anchorRect || !menuRect) return

      setMenuPlacement(
        resolveMenuPlacement({
          anchorRect,
          menuSize: {
            width: menuRect.width,
            height: menuRect.height,
          },
          viewportSize: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        }),
      )
    }

    updateMenuPlacement()
    window.addEventListener('resize', updateMenuPlacement)
    return () => window.removeEventListener('resize', updateMenuPlacement)
  }, [open])

  useEffect(() => {
    if (!collectionsOpen || !menuPanelRef.current || !submenuRef.current) return

    function updateSubmenuPlacement() {
      const anchorRect = menuPanelRef.current?.getBoundingClientRect()
      const submenuRect = submenuRef.current?.getBoundingClientRect()
      if (!anchorRect || !submenuRect) return

      setSubmenuPlacement(
        resolveSubmenuPlacement({
          anchorRect,
          submenuSize: {
            width: submenuRect.width,
            height: submenuRect.height,
          },
          viewportSize: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        }),
      )
    }

    updateSubmenuPlacement()
    window.addEventListener('resize', updateSubmenuPlacement)
    return () => window.removeEventListener('resize', updateSubmenuPlacement)
  }, [collectionsOpen, collections.length])

  function runAction(action: () => void) {
    action()
    onOpenChange(false)
  }

  return (
    <div
      ref={menuRef}
      className="relative z-[90]"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onOpenChange(false)
        }
      }}
    >
      <button
        ref={menuButtonRef}
        type="button"
        title="Ações do livro"
        aria-label="Ações do livro"
        onClick={(event) => {
          event.stopPropagation()
          onOpenChange(!open)
        }}
        className="rounded p-1.5 text-neutral-300 transition hover:bg-white/10 hover:text-amber-200"
      >
        <MoreVertical size={16} />
      </button>

      {open ? (
        <div
          ref={menuPanelRef}
          className={`absolute z-[100] w-64 rounded-lg border border-white/10 bg-neutral-950 p-2 text-xs text-neutral-200 shadow-2xl shadow-black/50 ${
            menuPlacement.horizontal === 'right' ? 'right-0' : 'left-0'
          } ${menuPlacement.vertical === 'down' ? 'top-9' : 'bottom-9'}`}
          onClick={(event) => event.stopPropagation()}
        >
          <MenuButton onClick={() => runAction(() => onToggleFavorite(book))}>
            <Star
              size={14}
              className={book.isFavorite ? 'fill-amber-300 text-amber-300' : ''}
            />
            {book.isFavorite
              ? 'Remover dos favoritos'
              : 'Adicionar aos favoritos'}
          </MenuButton>
          <MenuButton
            onClick={() => setCollectionsMenuOpen((current) => !current)}
          >
            <FolderPlus size={14} />
            <span className="flex-1">Coleções</span>
            <ChevronRight
              size={14}
              className={`transition ${collectionsOpen ? 'rotate-180 text-amber-300' : ''}`}
            />
          </MenuButton>

          {collectionsOpen ? (
            <div
              ref={submenuRef}
              className={`absolute z-[110] w-64 rounded-lg border border-white/10 bg-neutral-950 p-2 text-xs text-neutral-200 shadow-2xl shadow-black/50 ${
                submenuPlacement.horizontal === 'right'
                  ? 'left-full ml-2'
                  : 'right-full mr-2'
              } ${submenuPlacement.vertical === 'down' ? 'top-12' : 'bottom-0'}`}
            >
              <p className="px-2 pb-1 text-[11px] uppercase tracking-wide text-neutral-500">
                Coleções
              </p>
              <MenuButton
                onClick={() => runAction(() => onCreateCollection(book))}
              >
                <FolderPlus size={14} />
                Criar coleção com este livro
              </MenuButton>
              {collections.map((collection) => {
                const selected = collection.bookIds.includes(book.id)
                return (
                  <MenuButton
                    key={collection.id}
                    onClick={() =>
                      runAction(() => onToggleCollection(book, collection))
                    }
                  >
                    {selected ? (
                      <Check size={14} className="text-amber-300" />
                    ) : (
                      <span className="h-3.5 w-3.5" />
                    )}
                    {collection.name}
                  </MenuButton>
                )
              })}
              {!collections.length ? (
                <p className="px-2 py-2 text-neutral-500">
                  Nenhuma coleção criada.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-2 border-t border-white/10 pt-2">
            <MenuButton danger onClick={() => runAction(() => onDelete(book))}>
              <Trash2 size={14} />
              Remover da biblioteca
            </MenuButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MenuButton({
  children,
  danger = false,
  onClick,
}: {
  children: ReactNode
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left transition ${
        danger ? 'text-red-200 hover:bg-red-400/10' : 'hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

function StatusPill({ status }: { status: BookDto['readingStatus'] }) {
  const classes =
    status === 'finished'
      ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100'
      : status === 'reading'
        ? 'border-amber-300/30 bg-amber-300/10 text-amber-100'
        : 'border-white/10 bg-white/[0.04] text-neutral-300'
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${classes}`}>
      {labelForStatus(status)}
    </span>
  )
}

function MetadataLine({
  book,
  detailed = false,
}: {
  book: BookDto
  detailed?: boolean
}) {
  const chips = [
    ['Idioma', book.language ? book.language.toUpperCase() : '-'],
    ['Editora', book.publisher ?? '-'],
    ['Publicado', book.publishedAt ? formatDate(book.publishedAt) : '-'],
    ['Tags', book.subjects.slice(0, 2).join(', ') || '-'],
  ]

  return (
    <div
      className={`grid gap-1 overflow-hidden ${
        detailed ? 'grid-cols-2' : 'mt-2 h-11 grid-cols-2'
      }`}
      title={metadataTitle(book)}
    >
      {chips.map(([label, chip]) => (
        <span
          key={label}
          className={`min-w-0 truncate rounded border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] leading-4 ${
            chip === '-' ? 'text-neutral-600' : 'text-neutral-400'
          }`}
        >
          {detailed && chip !== '-' ? (
            <span className="text-neutral-500">{label}: </span>
          ) : null}
          {chip}
        </span>
      ))}
    </div>
  )
}

function labelForStatus(status: BookDto['readingStatus']) {
  if (status === 'finished') return 'Concluído'
  if (status === 'reading') return 'Lendo'
  return 'Não iniciado'
}

function formatTextLength(textLength: number) {
  if (!textLength) return 'Tamanho ainda não calculado'
  const pages = Math.max(1, Math.round(textLength / 1800))
  return `${pages}`
}

function formatPageEstimate(textLength: number) {
  if (!textLength) return 'Tamanho pendente'
  const pages = Math.max(1, Math.round(textLength / 1800))
  return pages === 1 ? '1 página' : `${pages} páginas`
}

function formatDate(value: string) {
  return value.slice(0, 10)
}

function metadataTitle(book: BookDto) {
  return [
    book.language ? `Idioma: ${book.language}` : null,
    book.publisher ? `Editora: ${book.publisher}` : null,
    book.publishedAt ? `Publicado: ${formatDate(book.publishedAt)}` : null,
    book.subjects.length ? `Tags: ${book.subjects.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join(' | ')
}
