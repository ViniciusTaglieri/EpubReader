import { Upload } from 'lucide-react'
import { pickEpubFiles } from '../../shared/tauri/commands'

type ImportButtonProps = {
  onImport: (paths: string[]) => void
  disabled?: boolean
  view?: 'grid' | 'list' | 'empty'
}

export function ImportButton({
  onImport,
  disabled,
  view = 'grid',
}: ImportButtonProps) {
  async function handleClick() {
    const paths = await pickEpubFiles()
    if (paths.length) {
      onImport(paths)
    }
  }

  if (view === 'list') {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        className="grid min-h-24 w-full grid-cols-[4.5rem_1fr] items-center gap-4 rounded-lg border border-dashed border-amber-300/35 bg-amber-300/5 p-3 text-left transition hover:border-amber-300/70 hover:bg-amber-300/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="grid aspect-[2/3] place-items-center rounded bg-neutral-950 text-amber-200">
          <Upload size={24} aria-hidden />
        </span>
        <span>
          <span className="block text-sm font-semibold text-white">
            Importar EPUB
          </span>
          <span className="mt-1 block text-xs text-neutral-400">
            Adicionar livro a partir de um arquivo local.
          </span>
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={`group overflow-hidden rounded-lg border border-dashed border-amber-300/35 bg-amber-300/5 text-left shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-amber-300/70 hover:bg-amber-300/10 disabled:cursor-not-allowed disabled:opacity-50 ${
        view === 'empty' ? 'mx-auto mt-5 block w-full max-w-48' : ''
      }`}
    >
      <span className="grid aspect-[2/3] place-items-center bg-neutral-950/70">
        <span className="grid h-16 w-16 place-items-center rounded-full border border-amber-300/35 bg-amber-300/10 text-amber-200">
          <Upload size={30} aria-hidden />
        </span>
      </span>
      <span className="block p-3">
        <span className="block text-sm font-semibold text-white">
          Importar EPUB
        </span>
        <span className="mt-1 block text-xs text-neutral-400">
          Selecionar arquivo
        </span>
      </span>
    </button>
  )
}
