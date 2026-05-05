import { BookOpen, MoreVertical, Trash2 } from "lucide-react";
import type { BookDto } from "../../shared/types/books";

type BookCardProps = {
  book: BookDto;
  coverUrl?: string;
  onOpen: (book: BookDto) => void;
  onDelete: (book: BookDto, deleteFile: boolean) => void;
};

export function BookCard({ book, coverUrl, onOpen, onDelete }: BookCardProps) {
  const progress = Math.round(book.totalProgression * 100);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(book)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(book);
        }
      }}
      className="group cursor-pointer overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-amber-300/40"
    >
      <div className="relative aspect-[2/3] bg-neutral-900">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`Capa de ${book.title}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center text-amber-100">
            <BookOpen size={38} />
            <span className="font-serif text-xl leading-tight">{book.title}</span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded bg-black/55 px-2 py-1 text-xs font-semibold text-white backdrop-blur">
          {labelForStatus(book.readingStatus)}
        </span>
      </div>

      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-white">{book.title}</h3>
            <p className="truncate text-xs text-neutral-300">{book.author ?? "Autor desconhecido"}</p>
          </div>
          <button
            type="button"
            title="Excluir da biblioteca"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(book, false);
            }}
            className="rounded p-1.5 text-neutral-400 opacity-0 transition hover:bg-white/10 hover:text-red-200 group-hover:opacity-100"
          >
            <Trash2 size={16} />
          </button>
          <button
            type="button"
            title="Excluir tambem o arquivo local"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(book, true);
            }}
            className="rounded p-1.5 text-neutral-400 opacity-0 transition hover:bg-white/10 hover:text-amber-200 group-hover:opacity-100"
          >
            <MoreVertical size={16} />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-amber-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-9 text-right text-xs text-neutral-300">{progress}%</span>
        </div>
      </div>
    </article>
  );
}

function labelForStatus(status: BookDto["readingStatus"]) {
  if (status === "finished") return "Concluido";
  if (status === "reading") return "Lendo";
  return "Nao lido";
}
