import { LibraryPage } from './features/library/LibraryPage'
import { setTheme } from '@tauri-apps/api/app'
import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import {
  loadLibraryPreferences,
  resolveLibraryTheme,
  saveLibraryPreferences,
  type LibraryPreferences,
} from './features/library/libraryPreferences'
import { AppTitleBar } from './shared/components/AppTitleBar'
import type { WindowFrameTheme } from './shared/components/AppTitleBar'

const ReaderPage = lazy(() =>
  import('./features/reader/ReaderPage').then((module) => ({
    default: module.ReaderPage,
  })),
)

export function App() {
  const [openBookId, setOpenBookId] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<LibraryPreferences>(() =>
    loadLibraryPreferences(),
  )
  const [prefersLightTheme, setPrefersLightTheme] = useState(
    () => window.matchMedia('(prefers-color-scheme: light)').matches,
  )

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

  const resolvedTheme = resolveLibraryTheme(
    preferences.theme,
    prefersLightTheme,
  )

  if (openBookId) {
    return (
      <AppShell windowFrameTheme={resolvedTheme}>
        <Suspense
          fallback={
            <div className="grid h-full place-items-center bg-[#151412] text-neutral-100">
              Abrindo livro...
            </div>
          }
        >
          <ReaderPage
            bookId={openBookId}
            appTheme={resolvedTheme}
            onBack={() => setOpenBookId(null)}
          />
        </Suspense>
      </AppShell>
    )
  }

  return (
    <AppShell windowFrameTheme={resolvedTheme}>
      <LibraryPage
        preferences={preferences}
        prefersLightTheme={prefersLightTheme}
        onPreferencesChange={(next) =>
          setPreferences((current) => ({ ...current, ...next }))
        }
        onOpenBook={(book) => setOpenBookId(book.id)}
      />
    </AppShell>
  )
}

function AppShell({
  windowFrameTheme,
  children,
}: {
  windowFrameTheme: WindowFrameTheme
  children: ReactNode
}) {
  useEffect(() => {
    document.documentElement.dataset.windowFrameTheme = windowFrameTheme

    if (!('__TAURI_INTERNALS__' in window)) return
    void setTheme(windowFrameTheme).catch(() => undefined)
  }, [windowFrameTheme])

  return (
    <div
      data-window-frame-theme={windowFrameTheme}
      className="flex h-screen flex-col overflow-hidden bg-[#12110f]"
    >
      <AppTitleBar theme={windowFrameTheme} />
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
