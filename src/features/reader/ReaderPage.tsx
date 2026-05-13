import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type WheelEvent,
} from "react";
import {
  ArrowLeft,
  AlignJustify,
  AlignLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Columns2,
  ListTree,
  Loader2,
  RotateCcw,
  Settings2,
  ScrollText,
  Square,
} from "lucide-react";
import ePub from "epubjs";
import { commands, errorMessage } from "../../shared/tauri/commands";
import type { BookDetailDto, ReadingLocator } from "../../shared/types/books";
import {
  DEFAULT_READER_SETTINGS,
  applyReaderSettings,
  locatorFromCfi,
  loadReaderSettings,
  numbersToArrayBuffer,
  pageStatsFromLocation,
  readerShellColors,
  sanitizeRenderedEpubDocument,
  saveReaderSettings,
  shouldSaveLocator,
  type EpubBook,
  type EpubLocation,
  type EpubTocItem,
  type ReaderFlow,
  type ReaderSettings,
  type ReaderSpread,
  type ReaderTextAlign,
  type ReaderTheme,
  type Rendition,
} from "./epubCfiReader";

type ReaderPageProps = {
  bookId: string;
  onBack: () => void;
};

type ReaderTocItem = EpubTocItem & {
  depth: number;
};

export function ReaderPage({ bookId, onBack }: ReaderPageProps) {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const epubRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const latestLocatorRef = useRef<ReadingLocator | null>(null);
  const lastSavedCfiRef = useRef<string | null>(null);
  const saveChainRef = useRef(Promise.resolve());
  const tocItemsRef = useRef<ReaderTocItem[]>([]);
  const [book, setBook] = useState<BookDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [tocItems, setTocItems] = useState<ReaderTocItem[]>([]);
  const [currentTocIndex, setCurrentTocIndex] = useState(0);
  const [chapterPageStats, setChapterPageStats] = useState({
    currentPage: 1,
    totalPages: 1,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(() =>
    loadReaderSettings(),
  );
  const [pageStats, setPageStats] = useState({
    currentPage: 1,
    totalPages: 1,
    remainingPages: 0,
  });

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
        const navigation =
          (await epub.loaded?.navigation?.catch(() => undefined)) ??
          epub.navigation;
        if (!cancelled) {
          const flatToc = flattenToc(navigation?.toc ?? []);
          tocItemsRef.current = flatToc;
          setTocItems(flatToc);
          setCurrentTocIndex(0);
          setChapterPageStats({ currentPage: 1, totalPages: 1 });
        }

        const initialViewerSize = getViewerSize(viewerElement);
        const rendition = epub.renderTo(viewerElement, {
          flow: readerSettings.flow === "continuous" ? "scrolled-doc" : "paginated",
          width: initialViewerSize.width,
          height: initialViewerSize.height,
          gap: readerColumnGap(readerSettings),
          spread: readerSettings.spread === "double" ? "auto" : "none",
        });
        renditionRef.current = rendition;
        applyReaderSettings(rendition, readerSettings);

        const handleRelocated = (location: EpubLocation) => {
          const cfi = location.start?.cfi;
          if (!cfi) return;
          const locator = locatorFromCfi(bookId, cfi, location, epub);
          latestLocatorRef.current = locator;
          setPageStats(pageStatsFromLocation(location, epub, cfi));
          setChapterPageStats(chapterPageStatsFromLocation(location));
          setCurrentTocIndex((currentIndex) =>
            currentTocIndexFromHref(
              location.start?.href,
              tocItemsRef.current,
              currentIndex,
            ),
          );
          if (shouldSaveLocator(lastSavedCfiRef.current, cfi)) {
            lastSavedCfiRef.current = cfi;
            saveChainRef.current = saveChainRef.current
              .catch(() => undefined)
              .then(() =>
                commands.saveProgress(bookId, locator).catch((error) => {
                  setMessage(errorMessage(error));
                }),
              );
          }
        };

        rendition.on("relocated", handleRelocated);
        rendition.on("rendered", (_section, view) => {
          const renderedDocument = view?.document;
          if (renderedDocument) {
            sanitizeRenderedEpubDocument(renderedDocument);
          }
        });
        await epub.locations?.generate?.(1600);

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
      lastSavedCfiRef.current = null;
      tocItemsRef.current = [];
      viewerElement.replaceChildren();
    };
  }, [bookId]);

  useEffect(() => {
    saveReaderSettings(readerSettings);
    const rendition = renditionRef.current;
    if (!rendition) return;
    applyReaderSettings(rendition, readerSettings);
    applyRenditionGap(rendition, readerColumnGap(readerSettings));
    const handle = window.setTimeout(() => {
      const cfi = latestLocatorRef.current?.cfi;
      resizeRenditionToViewer(
        rendition,
        viewerRef.current,
        cfi,
      );
      window.requestAnimationFrame(() => {
        void rendition.display(cfi).catch(() => undefined);
      });
    }, 80);
    return () => window.clearTimeout(handle);
  }, [readerSettings]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || isEditableTarget(event.target)) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        nextPage();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        previousPage();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const resizeCurrentRendition = () => {
      const rendition = renditionRef.current;
      if (!rendition) return;
      resizeRenditionToViewer(rendition, viewer, latestLocatorRef.current?.cfi);
    };

    resizeCurrentRendition();
    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(resizeCurrentRendition);
    });
    resizeObserver.observe(viewer);

    return () => resizeObserver.disconnect();
  }, []);

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

  const lastWheelTurnRef = useRef(0);

  function handleReaderWheel(event: WheelEvent<HTMLElement>) {
    if (readerSettings.flow === "continuous" || isLoading) return;
    const dominantDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;
    if (Math.abs(dominantDelta) < 18) return;

    const now = window.performance.now();
    if (now - lastWheelTurnRef.current < 420) return;
    lastWheelTurnRef.current = now;
    event.preventDefault();

    if (dominantDelta > 0) {
      nextPage();
    } else {
      previousPage();
    }
  }

  function goToTocItem(item: ReaderTocItem, index: number) {
    const rendition = renditionRef.current;
    if (!rendition) return;
    setCurrentTocIndex(index);
    setTocOpen(false);
    void rendition.display(item.href).catch((error) => {
      setMessage(errorMessage(error));
    });
  }

  function goToPage(pageIndex: number) {
    const epub = epubRef.current;
    const rendition = renditionRef.current;
    if (!epub || !rendition) return;

    const totalLocations = Math.max(0, epub.locations?.length?.() ?? 0);
    if (totalLocations <= 0) return;

    const locationIndex = Math.min(
      totalLocations - 1,
      Math.max(0, Math.round(pageIndex)),
    );
    const cfi = epub.locations?.cfiFromLocation?.(locationIndex);
    if (!cfi) return;

    setPageStats({
      currentPage: locationIndex + 1,
      totalPages: totalLocations,
      remainingPages: Math.max(0, totalLocations - locationIndex - 1),
    });
    void rendition.display(cfi).catch((error) => {
      setMessage(errorMessage(error));
    });
  }

  function updateReaderSettings(next: Partial<ReaderSettings>) {
    setReaderSettings((current) => ({ ...current, ...next }));
  }

  const totalProgressPercent =
    pageStats.totalPages <= 1
      ? 0
      : Math.round(
          ((pageStats.currentPage - 1) / Math.max(1, pageStats.totalPages - 1)) *
            100,
        );

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
        <button
          type="button"
          onClick={() => {
            setTocOpen((open) => !open);
            setSettingsOpen(false);
          }}
          className="grid h-10 w-10 place-items-center rounded-md border border-white/10 text-neutral-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
          title="Sumário"
          disabled={tocItems.length === 0}
          aria-expanded={tocOpen}
        >
          <ListTree size={18} />
        </button>
        <button
          type="button"
          onClick={() => {
            setSettingsOpen((open) => !open);
            setTocOpen(false);
          }}
          className="grid h-10 w-10 place-items-center rounded-md border border-white/10 text-neutral-200 transition hover:bg-white/10"
          title="Configurações de leitura"
        >
          <Settings2 size={18} />
        </button>
      </header>

      {tocOpen ? (
        <TocPanel
          items={tocItems}
          currentIndex={currentTocIndex}
          onSelect={goToTocItem}
          onClose={() => setTocOpen(false)}
        />
      ) : null}

      {settingsOpen ? (
        <ReaderSettingsPanel
          settings={readerSettings}
          onChange={updateReaderSettings}
          onReset={() => setReaderSettings(DEFAULT_READER_SETTINGS)}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}

      <section
        className="relative min-h-0 flex-1 overflow-hidden bg-black/55 p-5"
        onWheel={handleReaderWheel}
      >
        <button
          type="button"
          onClick={previousPage}
          className="absolute left-5 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/35 text-neutral-200 transition hover:bg-black/55"
          title="Página anterior"
        >
          <ChevronLeft size={24} />
        </button>

        <div
          className="mx-auto h-full overflow-hidden rounded-lg border border-white/10 bg-[#f7f0e6] shadow-2xl shadow-black/30"
          style={{
            maxWidth: readerSettings.spread === "double" ? "72rem" : "56rem",
          }}
        >
          {message ? (
            <div className="grid h-full place-items-center p-8 text-center text-sm text-red-200">
              {message}
            </div>
          ) : (
            <div
              className="grid h-full w-full place-items-center overflow-hidden"
              style={{
                backgroundColor: readerShellColors(readerSettings.theme).background,
              }}
            >
              <div
                ref={viewerRef}
                className="overflow-hidden"
                style={{
                  width: `max(1px, calc(100% - ${readerSettings.margin * 2}px))`,
                  height: `max(1px, calc(100% - ${readerSettings.margin * 2}px))`,
                }}
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={nextPage}
          className="absolute right-5 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/35 text-neutral-200 transition hover:bg-black/55"
          title="Próxima página"
        >
          <ChevronRight size={24} />
        </button>

        {isLoading ? (
          <div className="absolute inset-0 grid place-items-center bg-black/35 backdrop-blur-sm">
            <Loader2 className="animate-spin text-amber-200" size={34} />
          </div>
        ) : null}
      </section>

      <footer className="grid min-h-20 shrink-0 grid-cols-[minmax(0,1fr)_minmax(18rem,2fr)_minmax(0,1fr)] items-center gap-5 border-t border-white/10 bg-black/25 px-7 py-3 text-sm text-neutral-300">
        <div className="min-w-0">
          <span className="block truncate font-medium text-neutral-100">
            Capítulo: {tocItems.length > 0 ? currentTocIndex + 1 : 1} /{" "}
            {Math.max(1, tocItems.length)}
          </span>
          <span className="block truncate text-xs text-neutral-500">
            Páginas do capítulo: {chapterPageStats.currentPage} /{" "}
            {chapterPageStats.totalPages}
          </span>
        </div>
        <label className="min-w-0">
          <span className="mb-2 flex items-center justify-center gap-2 text-xs text-neutral-400">
            <span>Página</span>
            <span className="text-neutral-200">
              {pageStats.currentPage} / {pageStats.totalPages}
            </span>
            <span>
              {pageStats.remainingPages === 1
                ? "resta 1 página"
                : `restam ${pageStats.remainingPages} páginas`}
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(0, pageStats.totalPages - 1)}
            value={Math.max(0, pageStats.currentPage - 1)}
            onChange={(event) => goToPage(Number(event.target.value))}
            className="block w-full accent-amber-300"
            aria-label="Progresso de página do livro"
          />
        </label>
        <span className="text-right">{totalProgressPercent}% do livro</span>
      </footer>
    </main>
  );
}

function resizeRenditionToViewer(
  rendition: Rendition,
  viewer: HTMLDivElement | null,
  cfi?: string,
) {
  if (!viewer) return;
  const { width, height } = getViewerSize(viewer);
  if (width <= 0 || height <= 0) return;
  rendition.resize?.(width, height, cfi);
}

function getViewerSize(viewer: HTMLDivElement) {
  const bounds = viewer.getBoundingClientRect();
  return {
    width: Math.floor(bounds.width || viewer.clientWidth),
    height: Math.floor(bounds.height || viewer.clientHeight),
  };
}

function readerColumnGap(settings: ReaderSettings) {
  return settings.flow === "paginated" && settings.spread === "double" ? 72 : 24;
}

function applyRenditionGap(rendition: Rendition, gap: number) {
  const renditionWithManager = rendition as Rendition & {
    manager?: { settings?: { gap?: number } };
  };
  if (renditionWithManager.manager?.settings) {
    renditionWithManager.manager.settings.gap = gap;
  }
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function flattenToc(items: EpubTocItem[], depth = 0): ReaderTocItem[] {
  return items.flatMap((item) => [
    { ...item, depth },
    ...flattenToc(item.subitems ?? [], depth + 1),
  ]);
}

function chapterPageStatsFromLocation(location: EpubLocation) {
  const currentPage = Math.max(1, location.start?.displayed?.page ?? 1);
  const totalPages = Math.max(
    currentPage,
    location.start?.displayed?.total ?? currentPage,
  );
  return { currentPage, totalPages };
}

function currentTocIndexFromHref(
  href: string | undefined,
  items: ReaderTocItem[],
  fallbackIndex: number,
) {
  if (!href || items.length === 0) return fallbackIndex;

  const normalizedHref = normalizeReaderHref(href);
  const exactIndex = items.findIndex(
    (item) => normalizeReaderHref(item.href) === normalizedHref,
  );
  if (exactIndex >= 0) return exactIndex;

  const normalizedFileHref = normalizedHref.split("#")[0];
  const fileIndex = items.findIndex((item) =>
    sameReaderHrefFile(normalizeReaderHref(item.href).split("#")[0], normalizedFileHref),
  );
  return fileIndex >= 0 ? fileIndex : fallbackIndex;
}

function sameReaderHrefFile(left: string, right: string) {
  return left === right || left.endsWith(`/${right}`) || right.endsWith(`/${left}`);
}

function normalizeReaderHref(href: string) {
  try {
    return decodeURIComponent(href).split("?")[0].replace(/^\.?\//, "");
  } catch {
    return href.split("?")[0].replace(/^\.?\//, "");
  }
}

type TocPanelProps = {
  items: ReaderTocItem[];
  currentIndex: number;
  onSelect: (item: ReaderTocItem, index: number) => void;
  onClose: () => void;
};

function TocPanel({ items, currentIndex, onSelect, onClose }: TocPanelProps) {
  return (
    <aside
      className="absolute right-20 top-20 z-30 max-h-[calc(100vh-6rem)] w-96 overflow-hidden rounded-lg border border-white/10 bg-[#1f1d1a] text-sm text-neutral-100 shadow-2xl shadow-black/40"
      role="dialog"
      aria-modal="false"
      aria-labelledby="toc-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="border-b border-white/10 px-4 py-3">
        <h2 id="toc-title" className="font-semibold">
          Sumário
        </h2>
      </div>
      <div className="max-h-[calc(100vh-11rem)] overflow-y-auto p-2">
        {items.map((item, index) => {
          const isCurrent = index === currentIndex;
          return (
            <button
              key={`${item.href}-${index}`}
              type="button"
              onClick={() => onSelect(item, index)}
              aria-current={isCurrent ? "location" : undefined}
              className={`block w-full rounded-md px-3 py-2 text-left text-xs transition ${
                isCurrent
                  ? "bg-amber-300/15 text-amber-100"
                  : "text-neutral-300 hover:bg-white/[0.07] hover:text-white"
              }`}
              style={{ paddingLeft: `${12 + item.depth * 16}px` }}
              title={item.label}
            >
              <span className="line-clamp-2">{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

type ReaderSettingsPanelProps = {
  settings: ReaderSettings;
  onChange: (settings: Partial<ReaderSettings>) => void;
  onReset: () => void;
  onClose: () => void;
};

function ReaderSettingsPanel({
  settings,
  onChange,
  onReset,
  onClose,
}: ReaderSettingsPanelProps) {
  return (
    <aside
      className="absolute right-5 top-20 z-30 max-h-[calc(100vh-6rem)] w-80 overflow-y-auto rounded-lg border border-white/10 bg-[#1f1d1a] p-4 text-sm text-neutral-100 shadow-2xl shadow-black/40"
      role="dialog"
      aria-modal="false"
      aria-labelledby="reading-settings-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 id="reading-settings-title" className="font-semibold">
          Configurações de Exibição
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-neutral-300 transition hover:bg-white/10 hover:text-white"
          title="Redefinir ajustes de leitura"
          aria-label="Redefinir ajustes de leitura"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      <label className="block">
        <span className="text-xs text-neutral-400">Fonte</span>
        <select
          value={settings.fontFamily}
          onChange={(event) => onChange({ fontFamily: event.target.value })}
          className="mt-1 h-10 w-full rounded-md border border-white/10 bg-neutral-900 px-3 outline-none"
        >
          <option value="Georgia, serif">Georgia</option>
          <option value="Lora, Georgia, serif">Lora</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="Verdana, sans-serif">Verdana</option>
          <option value="OpenDyslexic, Arial, sans-serif">OpenDyslexic</option>
        </select>
      </label>

      <SettingSlider
        label="Tamanho da fonte"
        value={settings.fontSize}
        min={12}
        max={34}
        step={1}
        suffix="px"
        onChange={(fontSize) => onChange({ fontSize })}
      />
      <SettingSlider
        label="Margem"
        value={settings.margin}
        min={0}
        max={96}
        step={4}
        suffix="px"
        onChange={(margin) => onChange({ margin })}
      />
      <SettingSlider
        label="Espaçamento entre linhas"
        value={settings.lineHeight}
        min={1.1}
        max={2.2}
        step={0.05}
        onChange={(lineHeight) => onChange({ lineHeight })}
      />
      <SettingSlider
        label="Espaçamento de parágrafo"
        value={settings.paragraphSpacing}
        min={0}
        max={2.4}
        step={0.05}
        suffix="em"
        onChange={(paragraphSpacing) => onChange({ paragraphSpacing })}
      />

      <ThemeButtons
        value={settings.theme}
        onChange={(theme) => onChange({ theme })}
      />
      <SegmentedButtons<ReaderTextAlign>
        label="Alinhamento"
        value={settings.textAlign}
        options={[
          ["left", "Esquerda", AlignLeft],
          ["justify", "Justificado", AlignJustify],
        ]}
        onChange={(textAlign) => onChange({ textAlign })}
      />
      <SegmentedButtons<ReaderFlow>
        label="Modo de leitura"
        value={settings.flow}
        options={[
          ["paginated", "Paginado", BookOpen],
          ["continuous", "Rolagem contínua", ScrollText],
        ]}
        onChange={(flow) => onChange({ flow })}
      />
      <SegmentedButtons<ReaderSpread>
        label="Modo"
        value={settings.spread}
        options={[
          ["single", "Uma página", Square],
          ["double", "Duas páginas", Columns2],
        ]}
        disabled={settings.flow === "continuous"}
        onChange={(spread) => onChange({ spread })}
      />
    </aside>
  );
}

function ThemeButtons({
  value,
  onChange,
}: {
  value: ReaderTheme;
  onChange: (theme: ReaderTheme) => void;
}) {
  const options: Array<[ReaderTheme, string]> = [
    ["light", "Claro"],
    ["dark", "Escuro"],
    ["sepia", "Sepia"],
    ["oled", "OLED"],
  ];

  return (
    <div className="mt-4">
      <span className="text-xs text-neutral-400">Tema</span>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {options.map(([theme, label]) => {
          const colors = readerShellColors(theme);
          const isSelected = value === theme;

          return (
            <button
              key={theme}
              type="button"
              onClick={() => onChange(theme)}
              aria-pressed={isSelected}
              className={`rounded-md border p-2 text-center transition ${
                isSelected
                  ? "border-amber-300 bg-amber-300/10 text-amber-100"
                  : "border-white/10 bg-white/[0.03] text-neutral-300 hover:bg-white/[0.07]"
              }`}
              title={label}
            >
              <span
                className="mx-auto block h-7 w-7 rounded-full border border-white/20"
                style={{
                  backgroundColor: colors.background,
                  boxShadow: `inset 0 0 0 8px ${colors.ink}`,
                }}
              />
              <span className="mt-1 block text-[11px]">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SegmentedButtons<TValue extends string>({
  label,
  value,
  options,
  disabled = false,
  onChange,
}: {
  label: string;
  value: TValue;
  options: Array<[TValue, string, ComponentType<{ size?: number }>]>;
  disabled?: boolean;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="mt-4">
      <span className="text-xs text-neutral-400">{label}</span>
      <div
        className={`mt-2 grid gap-2 ${options.length > 2 ? "grid-cols-3" : "grid-cols-2"}`}
      >
        {options.map(([optionValue, optionLabel, Icon]) => {
          const isSelected = value === optionValue;
          return (
            <button
              key={optionValue}
              type="button"
              disabled={disabled}
              onClick={() => onChange(optionValue)}
              aria-pressed={isSelected}
              className={`flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
                isSelected
                  ? "border-amber-300 bg-amber-300/15 text-amber-100"
                  : "border-white/10 bg-white/[0.03] text-neutral-300 hover:bg-white/[0.07]"
              }`}
            >
              <Icon size={15} />
              {optionLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SettingSlider({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="mt-4 block">
      <span className="flex items-center justify-between text-xs text-neutral-400">
        <span>{label}</span>
        <span className="text-neutral-200">
          {Number.isInteger(value) ? value : value.toFixed(2)}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-amber-300"
      />
    </label>
  );
}
