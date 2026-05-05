import { Upload } from "lucide-react";
import { pickEpubFile } from "../../shared/tauri/commands";

type ImportButtonProps = {
  onImport: (path: string) => void;
  disabled?: boolean;
};

export function ImportButton({ onImport, disabled }: ImportButtonProps) {
  async function handleClick() {
    const path = await pickEpubFile();
    if (path) {
      onImport(path);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className="inline-flex items-center gap-2 rounded-md border border-amber-400/45 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200 shadow-sm transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Upload size={18} aria-hidden />
      Importar EPUB
    </button>
  );
}
