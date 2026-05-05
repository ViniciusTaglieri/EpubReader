import {
  BookOpen,
  Check,
  ChevronRight,
  FolderPlus,
  MoreVertical,
  Star,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { BookDto, CollectionDto } from "../../shared/types/books";
import {
  resolveMenuPlacement,
  resolveSubmenuPlacement,
  type MenuPlacement,
  type SubmenuPlacement,
} from "./floatingMenuPlacement";

type BookCardProps = {
  book: BookDto;
  coverUrl?: string;
  view: "grid" | "list";
  collections: CollectionDto[];
  onOpen: (book: BookDto) => void;
  onDelete: (book: BookDto) => void;
  onToggleFavorite: (book: BookDto) => void;
  onCreateCollection: (book: BookDto) => void;
  onToggleCollection: (book: BookDto, collection: CollectionDto) => void;
};

export function BookCard({
  book,
  coverUrl,
  view,
  collections,
  onOpen,
  onDelete,
  onToggleFavorite,
  onCreateCollection,
  onToggleCollection,
}: BookCardProps) {
  const progress = Math.round(book.totalProgression * 100);
  const [menuOpen, setMenuOpen] = useState(false);

  if (view === "list") {
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
        className={`group relative grid cursor-pointer grid-cols-[4.5rem_1fr_auto] items-center gap-4 rounded-lg border border-white/10 bg-white/[0.045] p-3 transition hover:border-amber-300/40 hover:bg-white/[0.07] ${
          menuOpen ? "z-[80]" : "z-0"
        }`}
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded bg-neutral-900">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={`Capa de ${book.title}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-amber-100">
              <BookOpen size={24} />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white">
            {book.title}
          </h3>
          <p className="mt-1 truncate text-xs text-neutral-300">
            {book.author ?? "Autor desconhecido"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
            <span>{labelForStatus(book.readingStatus)}</span>
            <span>{formatTextLength(book.textLength)}</span>
            <span>{progress}%</span>
          </div>
          <MetadataLine book={book} />
        </div>

        <BookActionsMenu
          book={book}
          collections={collections}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
          onCreateCollection={onCreateCollection}
          onToggleCollection={onToggleCollection}
        />
      </article>
    );
  }

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
      className={`group relative cursor-pointer overflow-visible rounded-lg border border-white/10 bg-white/[0.045] shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-amber-300/40 ${
        menuOpen ? "z-[80]" : "z-0"
      }`}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-t-lg bg-neutral-900">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`Capa de ${book.title}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center text-amber-100">
            <BookOpen size={38} />
            <span className="font-serif text-xl leading-tight">
              {book.title}
            </span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded bg-black/55 px-2 py-1 text-xs font-semibold text-white backdrop-blur">
          {labelForStatus(book.readingStatus)}
        </span>
      </div>

      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-white">
              {book.title}
            </h3>
            <p className="truncate text-xs text-neutral-300">
              {book.author ?? "Autor desconhecido"}
            </p>
          </div>
          <BookActionsMenu
            book={book}
            collections={collections}
            open={menuOpen}
            onOpenChange={setMenuOpen}
            onDelete={onDelete}
            onToggleFavorite={onToggleFavorite}
            onCreateCollection={onCreateCollection}
            onToggleCollection={onToggleCollection}
          />
        </div>

        <MetadataLine book={book} />
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-amber-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-9 text-right text-xs text-neutral-300">
            {progress}%
          </span>
        </div>
        <p className="mt-2 truncate text-xs text-neutral-400">
          {formatTextLength(book.textLength)}
        </p>
      </div>
    </article>
  );
}

function BookActionsMenu({
  book,
  collections,
  open,
  onOpenChange,
  onDelete,
  onToggleFavorite,
  onCreateCollection,
  onToggleCollection,
}: {
  book: BookDto;
  collections: CollectionDto[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (book: BookDto) => void;
  onToggleFavorite: (book: BookDto) => void;
  onCreateCollection: (book: BookDto) => void;
  onToggleCollection: (book: BookDto, collection: CollectionDto) => void;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuPanelRef = useRef<HTMLDivElement | null>(null);
  const submenuRef = useRef<HTMLDivElement | null>(null);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<MenuPlacement>({
    horizontal: "right",
    vertical: "down",
  });
  const [submenuPlacement, setSubmenuPlacement] = useState<SubmenuPlacement>({
    horizontal: "right",
    vertical: "down",
  });

  useEffect(() => {
    if (!open) {
      setCollectionsOpen(false);
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onOpenChange, open]);

  useEffect(() => {
    if (!open || !menuButtonRef.current || !menuPanelRef.current) return;

    function updateMenuPlacement() {
      const anchorRect = menuButtonRef.current?.getBoundingClientRect();
      const menuRect = menuPanelRef.current?.getBoundingClientRect();
      if (!anchorRect || !menuRect) return;

      setMenuPlacement(
        resolveMenuPlacement({
          anchorRect,
          menuSize: {
            width: menuRect.width,
            height: menuRect.height,
          },
          viewportSize: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        }),
      );
    }

    updateMenuPlacement();
    window.addEventListener("resize", updateMenuPlacement);
    return () => window.removeEventListener("resize", updateMenuPlacement);
  }, [open]);

  useEffect(() => {
    if (!collectionsOpen || !menuPanelRef.current || !submenuRef.current)
      return;

    function updateSubmenuPlacement() {
      const anchorRect = menuPanelRef.current?.getBoundingClientRect();
      const submenuRect = submenuRef.current?.getBoundingClientRect();
      if (!anchorRect || !submenuRect) return;

      setSubmenuPlacement(
        resolveSubmenuPlacement({
          anchorRect,
          submenuSize: {
            width: submenuRect.width,
            height: submenuRect.height,
          },
          viewportSize: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        }),
      );
    }

    updateSubmenuPlacement();
    window.addEventListener("resize", updateSubmenuPlacement);
    return () => window.removeEventListener("resize", updateSubmenuPlacement);
  }, [collectionsOpen, collections.length]);

  function runAction(action: () => void) {
    action();
    onOpenChange(false);
  }

  return (
    <div
      ref={menuRef}
      className="relative z-[90]"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onOpenChange(false);
        }
      }}
    >
      <button
        ref={menuButtonRef}
        type="button"
        title="Acoes do livro"
        onClick={(event) => {
          event.stopPropagation();
          onOpenChange(!open);
        }}
        className="rounded p-1.5 text-neutral-300 transition hover:bg-white/10 hover:text-amber-200"
      >
        <MoreVertical size={16} />
      </button>

      {open ? (
        <div
          ref={menuPanelRef}
          className={`absolute z-[100] w-64 rounded-lg border border-white/10 bg-neutral-950 p-2 text-xs text-neutral-200 shadow-2xl shadow-black/50 ${
            menuPlacement.horizontal === "right" ? "right-0" : "left-0"
          } ${menuPlacement.vertical === "down" ? "top-9" : "bottom-9"}`}
          onClick={(event) => event.stopPropagation()}
        >
          <MenuButton onClick={() => runAction(() => onToggleFavorite(book))}>
            <Star
              size={14}
              className={book.isFavorite ? "fill-amber-300 text-amber-300" : ""}
            />
            {book.isFavorite
              ? "Remover dos favoritos"
              : "Adicionar aos favoritos"}
          </MenuButton>
          <MenuButton onClick={() => setCollectionsOpen((current) => !current)}>
            <FolderPlus size={14} />
            <span className="flex-1">Colecoes</span>
            <ChevronRight
              size={14}
              className={`transition ${collectionsOpen ? "rotate-180 text-amber-300" : ""}`}
            />
          </MenuButton>

          {collectionsOpen ? (
            <div
              ref={submenuRef}
              className={`absolute z-[110] w-64 rounded-lg border border-white/10 bg-neutral-950 p-2 text-xs text-neutral-200 shadow-2xl shadow-black/50 ${
                submenuPlacement.horizontal === "right"
                  ? "left-full ml-2"
                  : "right-full mr-2"
              } ${submenuPlacement.vertical === "down" ? "top-12" : "bottom-0"}`}
            >
              <p className="px-2 pb-1 text-[11px] uppercase tracking-wide text-neutral-500">
                Colecoes
              </p>
              <MenuButton
                onClick={() => runAction(() => onCreateCollection(book))}
              >
                <FolderPlus size={14} />
                Criar colecao com este livro
              </MenuButton>
              {collections.map((collection) => {
                const selected = collection.bookIds.includes(book.id);
                return (
                  <MenuButton
                    key={collection.id}
                    onClick={() =>
                      runAction(() => onToggleCollection(book, collection))
                    }
                  >
                    {selected ? (
                      <Check size={14} className="text-amber-300" />
                    ) : (
                      <span className="h-3.5 w-3.5" />
                    )}
                    {collection.name}
                  </MenuButton>
                );
              })}
              {!collections.length ? (
                <p className="px-2 py-2 text-neutral-500">
                  Nenhuma colecao criada.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-2 border-t border-white/10 pt-2">
            <MenuButton danger onClick={() => runAction(() => onDelete(book))}>
              <Trash2 size={14} />
              Remover do app
            </MenuButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuButton({
  children,
  danger = false,
  onClick,
}: {
  children: ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left transition ${
        danger ? "text-red-200 hover:bg-red-400/10" : "hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function MetadataLine({ book }: { book: BookDto }) {
  const chips = [
    book.language ? book.language.toUpperCase() : "-",
    book.publisher ?? "-",
    book.publishedAt ? formatDate(book.publishedAt) : "-",
    book.subjects[0] ?? "-",
  ];

  return (
    <div
      className="mt-2 grid h-11 grid-cols-2 gap-1 overflow-hidden"
      title={metadataTitle(book)}
    >
      {chips.map((chip, index) => (
        <span
          key={`${chip}-${index}`}
          className={`truncate rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] leading-4 ${
            chip === "-" ? "text-neutral-600" : "text-neutral-400"
          }`}
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

function labelForStatus(status: BookDto["readingStatus"]) {
  if (status === "finished") return "Concluido";
  if (status === "reading") return "Lendo";
  return "Não Iniciado";
}

function formatTextLength(textLength: number) {
  if (!textLength) return "Texto nao estimado";
  const pages = Math.max(1, Math.round(textLength / 1800));
  return `Páginas estimadas ${pages}`;
}

function formatDate(value: string) {
  return value.slice(0, 10);
}

function metadataTitle(book: BookDto) {
  return [
    book.language ? `Idioma: ${book.language}` : null,
    book.publisher ? `Editora: ${book.publisher}` : null,
    book.publishedAt ? `Publicado: ${formatDate(book.publishedAt)}` : null,
    book.subjects.length ? `Tags: ${book.subjects.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}
