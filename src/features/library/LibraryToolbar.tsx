import { LayoutGrid, List, Search, X } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import type { CollectionDto } from '../../shared/types/books'
import type { LibraryFilters, LibrarySort } from './libraryFilters'
import type { LibrarySection, LibraryView } from './libraryTypes'

type LibraryToolbarProps = {
  activeSection: LibrarySection
  selectedCollection?: CollectionDto
  filters: LibraryFilters
  view: LibraryView
  onFiltersChange: Dispatch<SetStateAction<LibraryFilters>>
  onViewChange: (view: LibraryView) => void
  onEditCollection: (collection: CollectionDto) => void
  onDeleteCollection: (collection: CollectionDto) => void
}

export function LibraryToolbar({
  activeSection,
  selectedCollection,
  filters,
  view,
  onFiltersChange,
  onViewChange,
  onEditCollection,
  onDeleteCollection,
}: LibraryToolbarProps) {
  if (activeSection === 'settings') {
    return (
      <div>
        <h2 className="text-2xl font-bold">
          {sectionTitle(activeSection, selectedCollection)}
        </h2>
        <p className="mt-1 text-sm text-neutral-400">
          {sectionDescription(activeSection, selectedCollection)}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold">
          {sectionTitle(activeSection, selectedCollection)}
        </h2>
        <p className="mt-1 text-sm text-neutral-400">
          {sectionDescription(activeSection, selectedCollection)}
        </p>
        {selectedCollection ? (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onEditCollection(selectedCollection)}
              className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs text-neutral-200 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
            >
              Editar coleção
            </button>
            <button
              type="button"
              onClick={() => onDeleteCollection(selectedCollection)}
              className="inline-flex items-center gap-2 rounded-md border border-red-300/20 px-3 py-2 text-xs text-red-200 transition hover:bg-red-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-200"
            >
              Excluir
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
        <label className="relative min-w-64 max-w-lg flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            size={20}
          />
          <input
            value={filters.query}
            onChange={(event) =>
              onFiltersChange((current) => ({
                ...current,
                query: event.target.value,
              }))
            }
            placeholder="Buscar livro ou autor"
            className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.06] pl-11 pr-11 text-sm outline-none ring-amber-300/30 transition placeholder:text-neutral-400 focus:ring-4"
          />
          {filters.query ? (
            <button
              type="button"
              onClick={() =>
                onFiltersChange((current) => ({ ...current, query: '' }))
              }
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-neutral-400 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
              title="Limpar busca"
              aria-label="Limpar busca"
            >
              <X size={16} />
            </button>
          ) : null}
        </label>
        <select
          value={
            filters.favorite === 'favorites' ? 'favorites' : filters.status
          }
          onChange={(event) =>
            onFiltersChange((current) => {
              if (event.target.value === 'favorites') {
                return {
                  ...current,
                  status: 'all',
                  favorite: 'favorites',
                }
              }
              return {
                ...current,
                status: event.target.value as LibraryFilters['status'],
                favorite: 'all',
              }
            })
          }
          className="h-10 rounded-md border border-white/10 bg-neutral-900 px-3 text-sm"
        >
          <option value="all">Todos</option>
          <option value="favorites">Favoritos</option>
          <option value="unread">Não iniciados</option>
          <option value="reading">Lendo</option>
          <option value="finished">Finalizados</option>
        </select>
        <select
          value={filters.sortBy}
          onChange={(event) =>
            onFiltersChange((current) => ({
              ...current,
              sortBy: event.target.value as LibrarySort,
            }))
          }
          className="h-10 rounded-md border border-white/10 bg-neutral-900 px-3 text-sm"
        >
          <option value="last_opened">Último aberto</option>
          <option value="published_at">Data de publicação</option>
          <option value="title">Título</option>
          <option value="author">Autor</option>
          <option value="progress">Progresso</option>
          <option value="size">Tamanho do livro</option>
        </select>
        <ViewModeToggle value={view} onChange={onViewChange} />
      </div>
    </div>
  )
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: LibraryView
  onChange: (value: LibraryView) => void
}) {
  return (
    <div className="flex h-10 overflow-hidden rounded-md border border-white/10 bg-neutral-900">
      <button
        type="button"
        title="Visualização em grade"
        aria-label="Visualização em grade"
        aria-pressed={value === 'grid'}
        onClick={() => onChange('grid')}
        className={`grid w-10 place-items-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${
          value === 'grid'
            ? 'bg-amber-300/15 text-amber-200'
            : 'text-neutral-300 hover:bg-white/10'
        }`}
      >
        <LayoutGrid size={18} />
      </button>
      <button
        type="button"
        title="Visualização em lista"
        aria-label="Visualização em lista"
        aria-pressed={value === 'list'}
        onClick={() => onChange('list')}
        className={`grid w-10 place-items-center border-l border-white/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${
          value === 'list'
            ? 'bg-amber-300/15 text-amber-200'
            : 'text-neutral-300 hover:bg-white/10'
        }`}
      >
        <List size={18} />
      </button>
    </div>
  )
}

function sectionTitle(section: LibrarySection, collection?: CollectionDto) {
  if (section === 'collections') return collection?.name ?? 'Coleções'
  if (section === 'settings') return 'Configurações'
  return 'Biblioteca'
}

function sectionDescription(
  section: LibrarySection,
  collection?: CollectionDto,
) {
  if (section === 'collections') {
    return collection
      ? 'Livros organizados nesta coleção.'
      : 'Crie coleções e organize seus EPUBs por tema, estudo ou prioridade.'
  }
  if (section === 'settings')
    return 'Preferências, manutenção e dados locais do app.'
  return 'EPUBs importados para o armazenamento local do app.'
}
