import { BookMarked, X } from 'lucide-react'
import type { BookDto } from '../../shared/types/books'
import type { CoverMap } from './useBookCovers'

type CollectionDialogProps = {
  books: BookDto[]
  covers: CoverMap
  name: string
  selectedBookIds: string[]
  onNameChange: (name: string) => void
  onToggleBook: (bookId: string) => void
  onCancel: () => void
  onSave: () => void
  mode: 'create' | 'edit'
}

export function CollectionDialog({
  books,
  covers,
  name,
  selectedBookIds,
  onNameChange,
  onToggleBook,
  onCancel,
  onSave,
  mode,
}: CollectionDialogProps) {
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-6 backdrop-blur-sm"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel()
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
              {mode === 'edit' ? 'Editar coleção' : 'Criar coleção'}
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
            <span className="text-xs text-neutral-400">Nome da coleção</span>
            <input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 text-sm outline-none ring-amber-300/30 transition focus:ring-4"
              placeholder="Ex.: Ficção científica"
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
                const selected = selectedBookIds.includes(book.id)
                return (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => onToggleBook(book.id)}
                    className={`overflow-hidden rounded-lg border text-left transition ${
                      selected
                        ? 'border-amber-300 bg-amber-300/10'
                        : 'border-white/10 bg-white/[0.035] hover:border-white/25'
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
                          Incluído
                        </span>
                      ) : null}
                    </div>
                    <div className="p-2">
                      <p className="truncate text-xs font-semibold text-white">
                        {book.title}
                      </p>
                      <p className="truncate text-[11px] text-neutral-400">
                        {book.author ?? 'Autor desconhecido'}
                      </p>
                    </div>
                  </button>
                )
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
            {mode === 'edit' ? 'Salvar coleção' : 'Criar coleção'}
          </button>
        </footer>
      </section>
    </div>
  )
}
