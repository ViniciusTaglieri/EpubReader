import { LibraryPage } from './features/library/LibraryPage'
import { Suspense, lazy, useState, type ReactNode } from 'react'
import { AppTitleBar } from './shared/components/AppTitleBar'

const ReaderPage = lazy(() =>
  import('./features/reader/ReaderPage').then((module) => ({
    default: module.ReaderPage,
  })),
)

export function App() {
  const [openBookId, setOpenBookId] = useState<string | null>(null)

  if (openBookId) {
    return (
      <AppShell>
        <Suspense
          fallback={
            <div className="grid h-full place-items-center bg-[#151412] text-neutral-100">
              Abrindo livro...
            </div>
          }
        >
          <ReaderPage bookId={openBookId} onBack={() => setOpenBookId(null)} />
        </Suspense>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <LibraryPage onOpenBook={(book) => setOpenBookId(book.id)} />
    </AppShell>
  )
}

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#12110f]">
      <AppTitleBar />
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
