import { useState, type ReactNode } from 'react'
import {
  BookMarked,
  Edit3,
  FolderOpen,
  MoreVertical,
  Plus,
  Trash2,
} from 'lucide-react'
import type { BookDto, CollectionDto } from '../../shared/types/books'
import type { CoverMap } from './useBookCovers'

type CollectionsOverviewProps = {
  collections: CollectionDto[]
  books: BookDto[]
  covers: CoverMap
  onCreate: () => void
  onOpen: (collection: CollectionDto) => void
  onEdit: (collection: CollectionDto) => void
  onDelete: (collection: CollectionDto) => void
}

export function CollectionsOverview({
  collections,
  books,
  covers,
  onCreate,
  onOpen,
  onEdit,
  onDelete,
}: CollectionsOverviewProps) {
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
          <h3 className="text-sm font-semibold text-white">Nova coleção</h3>
          <p className="mt-1 text-xs text-neutral-400">Defina nome e livros</p>
        </div>
      </button>

      {collections.map((collection) => {
        const collectionBooks = books.filter((book) =>
          collection.bookIds.includes(book.id),
        )
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
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </article>
        )
      })}
    </div>
  )
}

function CollectionActionsMenu({
  collection,
  onEdit,
  onDelete,
}: {
  collection: CollectionDto
  onEdit: (collection: CollectionDto) => void
  onDelete: (collection: CollectionDto) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="absolute right-2 top-2 z-20"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false)
        }
      }}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
        className="grid h-8 w-8 place-items-center rounded-md bg-black/55 text-neutral-200 backdrop-blur transition hover:bg-black/75 hover:text-amber-200"
        title="Ações da coleção"
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
              onEdit(collection)
              setOpen(false)
            }}
          >
            <Edit3 size={14} />
            Editar coleção
          </CollectionMenuButton>
          <div className="mt-2 border-t border-white/10 pt-2">
            <CollectionMenuButton
              danger
              onClick={() => {
                onDelete(collection)
                setOpen(false)
              }}
            >
              <Trash2 size={14} />
              Excluir coleção
            </CollectionMenuButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function CollectionMenuButton({
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
