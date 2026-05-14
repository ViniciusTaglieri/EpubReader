import type { LibraryFilters, LibrarySort } from './libraryFilters'
import type { LibraryView } from './libraryTypes'

const LIBRARY_FILTERS_STORAGE_KEY = 'epub-reader:library-filters'
const LIBRARY_VIEW_STORAGE_KEY = 'epub-reader:library-view'

export function saveLibraryFilters(filters: LibraryFilters) {
  window.localStorage.setItem(
    LIBRARY_FILTERS_STORAGE_KEY,
    JSON.stringify(filters),
  )
}

export function loadSavedFilters(): LibraryFilters {
  const fallback: LibraryFilters = {
    query: '',
    status: 'all',
    favorite: 'all',
    sortBy: 'last_opened',
  }

  try {
    const value = window.localStorage.getItem(LIBRARY_FILTERS_STORAGE_KEY)
    if (!value) return fallback
    const saved = JSON.parse(value) as Record<string, unknown>
    const savedSort =
      saved.sortBy === 'imported_at' ? 'published_at' : saved.sortBy
    return {
      ...fallback,
      ...saved,
      sortBy: isLibrarySort(savedSort) ? savedSort : fallback.sortBy,
    }
  } catch {
    return fallback
  }
}

export function saveLibraryView(view: LibraryView) {
  window.localStorage.setItem(LIBRARY_VIEW_STORAGE_KEY, view)
}

export function loadSavedView(): LibraryView {
  const value = window.localStorage.getItem(LIBRARY_VIEW_STORAGE_KEY)
  return value === 'list' ? 'list' : 'grid'
}

function isLibrarySort(value: unknown): value is LibrarySort {
  return (
    value === 'title' ||
    value === 'author' ||
    value === 'last_opened' ||
    value === 'published_at' ||
    value === 'progress' ||
    value === 'size'
  )
}
