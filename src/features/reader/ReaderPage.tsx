import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import ePub from "epubjs";
import { commands, errorMessage } from "../../shared/tauri/commands";
import type { BookDetailDto, ReadingLocator } from "../../shared/types/books";
import {
  locatorFromCfi,
  numbersToArrayBuffer,
  type EpubBook,
  type EpubLocation,
  type Rendition,
} from "./epubCfiReader";

type ReaderPageProps = {
  bookId: string;
  onBack: () => void;
};

export function ReaderPage({ bookId, onBack }: ReaderPageProps) {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const epubRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const latestLocatorRef = useRef<ReadingLocator | null>(null);
  const saveChainRef = useRef(Promise.resolve());
  const [book, setBook] = useState<BookDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const viewer = viewerRef.current;
    if (!viewer) return;
    const viewerElement = viewer;

    async function openBook() {
      setIsLoading(true);
      setMessage(null);
      viewerElement.replaceChildren();

      try {
        const [bookDetail, savedProgress, bytes] = await Promise.all([
          commands.getBook(bookId),
          commands.getProgress(bookId),
          commands.readBook(bookId),
        ]);
        if (cancelled) return;

        setBook(bookDetail);
        latestLocatorRef.current = savedProgress;

        const bookData = numbersToArrayBuffer(bytes);
        const epub = ePub({ replacements: "base64" }) as unknown as EpubBook;
        epubRef.current = epub;
        await epub.open(bookData, "binary");
        if (cancelled) return;

        const rendition = epub.renderTo(viewerElement, {
          flow: "paginated",
          width: "100%",
          height: "100%",
          spread: "none",
        });
        renditionRef.current = rendition;

        const handleRelocated = (location: EpubLocation) => {
          const cfi = location.start?.cfi;
          if (!cfi) return;
          const locator = locatorFromCfi(bookId, cfi, location, epub);
          latestLocatorRef.current = locator;
          saveChainRef.current = saveChainRef.current
            .catch(() => undefined)
            .then(() =>
              commands.saveProgress(bookId, locator).catch((error) => {
                setMessage(errorMessage(error));
              }),
            );
        };

        rendition.on("relocated", handleRelocated);

        try {
          await rendition.display(savedProgress?.cfi ?? undefined);
        } catch {
          await rendition.display();
        }

        if (!cancelled) setIsLoading(false);
      } catch (error) {
        if (!cancelled) {
          setMessage(errorMessage(error));
          setIsLoading(false);
        }
      }
    }

    void openBook();

    return () => {
      cancelled = true;
      renditionRef.current?.destroy?.();
      epubRef.current?.destroy?.();
      renditionRef.current = null;
      epubRef.current = null;
      viewerElement.replaceChildren();
    };
  }, [bookId]);

  async function flushAndBack() {
    const locator = latestLocatorRef.current;
    if (locator?.cfi) {
      saveChainRef.current = saveChainRef.current
        .catch(() => undefined)
        .then(() => commands.saveProgress(bookId, locator));
    }
    try {
      await saveChainRef.current;
      onBack();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  function previousPage() {
    void renditionRef.current?.prev();
  }

  function nextPage() {
    void renditionRef.current?.next();
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#151412] text-neutral-100">
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-white/10 bg-black/25 px-5">
        <button
          type="button"
          onClick={() => void flushAndBack()}
          className="grid h-10 w-10 place-items-center rounded-md text-neutral-300 transition hover:bg-white/10 hover:text-white"
          title="Voltar para biblioteca"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">
            {book?.title ?? "Livro"}
          </h1>
          <p className="truncate text-xs text-neutral-400">
            {book?.author ?? "Leitor EPUB"}
          </p>
        </div>
      </header>

      <section className="relative min-h-0 flex-1 overflow-hidden bg-black/55 p-5">
        <button
          type="button"
          onClick={previousPage}
          className="absolute left-5 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/35 text-neutral-200 transition hover:bg-black/55"
          title="Pagina anterior"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="mx-auto h-full max-w-4xl overflow-hidden rounded-lg border border-white/10 bg-[#f7f0e6] shadow-2xl shadow-black/30">
          {message ? (
            <div className="grid h-full place-items-center p-8 text-center text-sm text-red-200">
              {message}
            </div>
          ) : (
            <div ref={viewerRef} className="h-full w-full" />
          )}
        </div>

        <button
          type="button"
          onClick={nextPage}
          className="absolute right-5 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/35 text-neutral-200 transition hover:bg-black/55"
          title="Proxima pagina"
        >
          <ChevronRight size={24} />
        </button>

        {isLoading ? (
          <div className="absolute inset-0 grid place-items-center bg-black/35 backdrop-blur-sm">
            <Loader2 className="animate-spin text-amber-200" size={34} />
          </div>
        ) : null}
      </section>
    </main>
  );
}
