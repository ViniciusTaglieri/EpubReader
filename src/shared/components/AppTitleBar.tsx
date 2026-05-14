import { getCurrentWindow } from '@tauri-apps/api/window'
import { BookMarked, Maximize2, Minus, X } from 'lucide-react'
import type { ReactNode } from 'react'

export function AppTitleBar() {
  return (
    <header
      data-tauri-drag-region
      className="app-titlebar flex h-10 shrink-0 select-none items-center border-b border-white/10 bg-[#171512] text-neutral-200"
    >
      <div
        data-tauri-drag-region
        className="flex min-w-0 flex-1 items-center gap-2 px-3 text-xs font-semibold"
      >
        <BookMarked size={16} className="text-amber-300" />
        <span data-tauri-drag-region className="truncate">
          Leitor EPUB
        </span>
      </div>
      <div className="flex h-full items-stretch">
        <TitleBarButton
          label="Minimizar"
          onClick={() => void handleWindowAction('minimize')}
        >
          <Minus size={15} />
        </TitleBarButton>
        <TitleBarButton
          label="Maximizar ou restaurar"
          onClick={() => void handleWindowAction('toggleMaximize')}
        >
          <Maximize2 size={14} />
        </TitleBarButton>
        <TitleBarButton
          label="Fechar"
          danger
          onClick={() => void handleWindowAction('close')}
        >
          <X size={16} />
        </TitleBarButton>
      </div>
    </header>
  )
}

async function handleWindowAction(
  action: 'minimize' | 'toggleMaximize' | 'close',
) {
  if (!('__TAURI_INTERNALS__' in window)) return
  const appWindow = getCurrentWindow()
  await appWindow[action]()
}

function TitleBarButton({
  label,
  danger = false,
  children,
  onClick,
}: {
  label: string
  danger?: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-10 w-11 place-items-center transition ${
        danger
          ? 'hover:bg-red-500 hover:text-white'
          : 'hover:bg-white/10 hover:text-amber-100'
      }`}
    >
      {children}
    </button>
  )
}
