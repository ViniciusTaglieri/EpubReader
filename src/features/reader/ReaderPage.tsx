import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ListTree,
  Loader2,
  RotateCcw,
  Settings2,
} from "lucide-react";
import { commands, errorMessage } from "../../shared/tauri/commands";
import type {
  EpubManifestDto,
  ReadingLocator,
  ReadingSettingsDto,
  ResourceDto,
  TocItemDto,
} from "../../shared/types/books";
import { buildReaderDocument } from "./readerDocument";
import {
  DEFAULT_READER_SETTINGS,
  resetReaderSettings,
  themeColors,
  type ReaderSettings,
  type ReaderTheme,
  type ReadingMode,
  type SpreadMode,
  type TextAlignMode,
} from "./readerSettings";

type ReaderPageProps = {
  bookId: string;
  onBack: () => void;
};

const COLUMN_GAP = 56;
const PROGRESS_STORAGE_PREFIX = "reading-system:progress:";

export function ReaderPage({ bookId, onBack }: ReaderPageProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const pendingProgressRef = useRef<ReadingLocator | null>(null);
  const latestLocatorRef = useRef<ReadingLocator | null>(null);
  const pageIndexFromScrollRef = useRef(false);
  const [manifest, setManifest] = useState<EpubManifestDto | null>(null);
  const [resource, setResource] = useState<ResourceDto | null>(null);
  const [chapterPageStarts, setChapterPageStarts] = useState<number[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(
    DEFAULT_READER_SETTINGS,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadBook() {
      setIsLoading(true);
      setIsLayoutReady(false);
      latestLocatorRef.current = null;
      try {
        const storedProgress = readStoredProgress(bookId);
        const [loadedManifest, progress] = await Promise.all([
          commands.getBookManifest(bookId),
          commands.getProgress(bookId),
        ]);
        if (cancelled) return;
        const initialProgress = storedProgress ?? progress ?? null;
        pendingProgressRef.current = initialProgress;
        const loadedRendition = await commands.getBookRendition(bookId);
        if (cancelled) return;
        setManifest(loadedManifest);
        setResource(loadedRendition);
        setPageIndex(initialProgress?.displayPageIndex ?? 0);
        setMessage(null);
      } catch (error) {
        if (!cancelled) setMessage(errorMessage(error));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadBook();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  const spineIndex = currentSpineIndex(
    pageIndex,
    chapterPageStarts,
    manifest?.spine.length ?? 0,
  );
  const currentChapter = useMemo(() => {
    if (!manifest) return "";
    const href = manifest.spine[spineIndex]?.href;
    const tocItem = findTocItemByHref(manifest.toc, href);
    return (
      tocItem?.label ??
      manifest.spine[spineIndex]?.title ??
      `Capitulo ${spineIndex + 1}`
    );
  }, [manifest, spineIndex]);
  const totalProgression =
    pageCount <= 1 ? 0 : pageIndex / Math.max(1, pageCount - 1);
  const chapterStats = chapterPageStats(
    pageIndex,
    pageCount,
    chapterPageStarts,
    spineIndex,
  );
  const totalRemainingPages = Math.max(0, pageCount - pageIndex - 1);

  const repaginate = useCallback(() => {
    const frame = frameRef.current;
    const document = frame?.contentDocument;
    const stage = document?.getElementById("reader-stage");
    const clip = document?.getElementById("reader-clip");
    const root = document?.getElementById("reader-root");
    if (!frame || !document || !stage || !clip || !root) return;

    const width = Math.max(320, frame.clientWidth);
    const height = Math.max(360, frame.clientHeight);
    const colors = themeColors(readerSettings.theme);
    const margin = Math.min(
      Math.floor((width - 280) / 2),
      readerSettings.margin,
    );
    const availableWidth = Math.max(260, width - margin * 2);
    const contentHeight = Math.max(320, height - margin * 2);
    const isSpread =
      readerSettings.readingMode === "paginated" &&
      readerSettings.spreadMode === "spread";
    const columnWidth = isSpread
      ? Math.max(260, Math.floor((availableWidth - COLUMN_GAP) / 2))
      : availableWidth;
    const clipWidth = isSpread ? columnWidth * 2 + COLUMN_GAP : availableWidth;
    const pageStep =
      readerSettings.readingMode === "paginated"
        ? isSpread
          ? (columnWidth + COLUMN_GAP) * 2
          : columnWidth + COLUMN_GAP
        : 1;

    document.documentElement.style.setProperty(
      "--reader-background",
      colors.background,
    );
    document.documentElement.style.setProperty("--reader-ink", colors.ink);
    document.documentElement.style.overflow =
      readerSettings.readingMode === "scroll" ? "auto" : "hidden";
    document.body.style.overflow =
      readerSettings.readingMode === "scroll" ? "auto" : "hidden";
    document.body.style.background = colors.background;
    document.body.style.color = colors.ink;
    stage.style.setProperty("--reader-margin", `${margin}px`);
    stage.style.setProperty("--reader-background", colors.background);
    stage.style.setProperty("--reader-ink", colors.ink);
    stage.style.setProperty("--reader-content-width", `${columnWidth}px`);
    stage.style.setProperty("--reader-content-height", `${contentHeight}px`);
    stage.style.setProperty("--reader-column-gap", `${COLUMN_GAP}px`);
    stage.style.background = colors.background;
    stage.style.height =
      readerSettings.readingMode === "scroll" ? "auto" : "100vh";
    stage.style.minHeight = "100vh";
    stage.style.overflow =
      readerSettings.readingMode === "scroll" ? "visible" : "hidden";
    clip.style.background = colors.background;
    root.style.fontFamily = readerSettings.fontFamily;
    root.style.fontSize = `${readerSettings.fontSize}px`;
    root.style.lineHeight = String(readerSettings.lineHeight);
    root.style.color = colors.ink;
    root.style.textAlign = readerSettings.textAlign;
    root.style.hyphens = readerSettings.hyphenationEnabled ? "auto" : "none";
    root.style.fontVariantLigatures = readerSettings.ligaturesEnabled
      ? "common-ligatures"
      : "none";
    root.style.setProperty(
      "--reader-paragraph-spacing",
      `${readerSettings.paragraphSpacing}em`,
    );
    clip.style.width =
      readerSettings.readingMode === "scroll"
        ? `${availableWidth}px`
        : `${clipWidth}px`;
    clip.style.height =
      readerSettings.readingMode === "scroll" ? "auto" : `${contentHeight}px`;
    clip.style.overflow =
      readerSettings.readingMode === "scroll" ? "visible" : "hidden";

    if (readerSettings.readingMode === "scroll") {
      root.style.width = `${availableWidth}px`;
      root.style.height = "auto";
      root.style.columnWidth = "auto";
      root.style.columnGap = "0";
      root.style.transform = "translateX(0)";
      const measuredPages = Math.max(
        1,
        Math.ceil(root.scrollHeight / Math.max(1, height)),
      );
      const measuredChapterStarts = measureChapterStarts(
        root,
        measuredPages,
        "scroll",
        height,
      );
      setPageCount(measuredPages);
      setPageIndex((current) =>
        resolvePageAfterReflow(
          current,
          measuredPages,
          pendingProgressRef,
          measuredChapterStarts,
        ),
      );
      setChapterPageStarts(measuredChapterStarts);
      setIsLayoutReady(true);
      return;
    }

    root.style.width = `${columnWidth}px`;
    root.style.height = `${contentHeight}px`;
    root.style.columnWidth = `${columnWidth}px`;
    root.style.columnGap = `${COLUMN_GAP}px`;
    root.style.transform = `translateX(-${Math.min(pageIndex, pageCount - 1) * pageStep}px)`;

    const measuredPages = Math.max(1, Math.ceil(root.scrollWidth / pageStep));
    const measuredChapterStarts = measureChapterStarts(
      root,
      measuredPages,
      "paginated",
      pageStep,
    );
    setPageCount(measuredPages);
    setPageIndex((current) =>
      resolvePageAfterReflow(
        current,
        measuredPages,
        pendingProgressRef,
        measuredChapterStarts,
      ),
    );
    setChapterPageStarts(measuredChapterStarts);
    setIsLayoutReady(true);
  }, [pageCount, pageIndex, readerSettings]);

  useEffect(() => {
    repaginate();
  }, [resource, readerSettings, repaginate]);

  useEffect(() => {
    const handleResize = () => {
      window.setTimeout(repaginate, 180);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [repaginate]);

  useEffect(() => {
    const frame = frameRef.current;
    const root = frame?.contentDocument?.getElementById("reader-root");
    const stage = frame?.contentDocument?.getElementById("reader-stage");
    if (!frame || !root || !stage) return;
    if (readerSettings.readingMode === "scroll") {
      root.style.transform = "translateX(0)";
      if (pageIndexFromScrollRef.current) {
        pageIndexFromScrollRef.current = false;
        return;
      }
      frame.contentDocument?.documentElement.scrollTo({
        top: pageIndex * Math.max(1, frame.clientHeight),
        left: 0,
        behavior: "auto",
      });
      return;
    }
    const margin =
      Number.parseFloat(stage.style.getPropertyValue("--reader-margin")) || 0;
    const availableWidth = Math.max(260, frame.clientWidth - margin * 2);
    const isSpread = readerSettings.spreadMode === "spread";
    const columnWidth = isSpread
      ? Math.max(260, Math.floor((availableWidth - COLUMN_GAP) / 2))
      : availableWidth;
    const pageStep = isSpread
      ? (columnWidth + COLUMN_GAP) * 2
      : columnWidth + COLUMN_GAP;
    root.style.transform = `translateX(-${pageIndex * pageStep}px)`;
  }, [pageIndex, readerSettings.readingMode, readerSettings.spreadMode]);

  useEffect(() => {
    const frame = frameRef.current;
    const document = frame?.contentDocument;
    if (!document || readerSettings.readingMode !== "scroll") return;

    function handleScroll() {
      const nextPage = Math.min(
        pageCount - 1,
        Math.max(
          0,
          Math.round(
            document!.documentElement.scrollTop /
              Math.max(1, frame!.clientHeight),
          ),
        ),
      );
      setPageIndex((current) => {
        if (current === nextPage) {
          pageIndexFromScrollRef.current = false;
          return current;
        }
        pageIndexFromScrollRef.current = true;
        rememberPagePosition(nextPage);
        return nextPage;
      });
    }

    document.addEventListener("scroll", handleScroll);
    return () => document.removeEventListener("scroll", handleScroll);
  }, [pageCount, readerSettings.readingMode, resource]);

  useEffect(() => {
    const settings: ReadingSettingsDto = {
      id: "default",
      name: "Default",
      fontFamily: readerSettings.fontFamily,
      fontSize: readerSettings.fontSize,
      lineHeight: readerSettings.lineHeight,
      margin: readerSettings.margin,
      paragraphSpacing: readerSettings.paragraphSpacing,
      theme: readerSettings.theme,
      textAlign: readerSettings.textAlign,
      hyphenationEnabled: readerSettings.hyphenationEnabled,
      ligaturesEnabled: readerSettings.ligaturesEnabled,
    };
    const handle = window.setTimeout(() => {
      void commands.updateReadingSettings(settings).catch(() => undefined);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [readerSettings]);

  useEffect(() => {
    if (!isLayoutReady || !manifest || !resource) return;
    const currentSpine = manifest.spine[spineIndex];
    if (!currentSpine) return;
    const locator: ReadingLocator = {
      bookId,
      href: currentSpine.href,
      spineIndex,
      progression: chapterStats.progression,
      totalProgression,
      displayPageIndex: pageIndex,
      displayPageCount: pageCount,
    };
    latestLocatorRef.current = locator;
    writeStoredProgress(locator);
    const handle = window.setTimeout(() => {
      void commands.saveProgress(bookId, locator);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [
    bookId,
    chapterStats.progression,
    isLayoutReady,
    manifest,
    pageCount,
    pageIndex,
    resource,
    spineIndex,
    totalProgression,
  ]);

  useEffect(() => {
    return () => {
      const locator = latestLocatorRef.current;
      if (locator) {
        void commands.saveProgress(bookId, locator).catch(() => undefined);
      }
    };
  }, [bookId]);

  async function persistLatestProgress() {
    const locator = latestLocatorRef.current;
    if (locator) {
      writeStoredProgress(locator);
      await commands.saveProgress(bookId, locator).catch(() => undefined);
    }
  }

  function locatorForPage(targetPageIndex: number): ReadingLocator | null {
    if (!isLayoutReady || !manifest || !resource) return null;
    const targetSpineIndex = currentSpineIndex(
      targetPageIndex,
      chapterPageStarts,
      manifest.spine.length,
    );
    const currentSpine = manifest.spine[targetSpineIndex];
    if (!currentSpine) return null;
    const targetChapterStats = chapterPageStats(
      targetPageIndex,
      pageCount,
      chapterPageStarts,
      targetSpineIndex,
    );

    return {
      bookId,
      href: currentSpine.href,
      spineIndex: targetSpineIndex,
      progression: targetChapterStats.progression,
      totalProgression:
        pageCount <= 1 ? 0 : targetPageIndex / Math.max(1, pageCount - 1),
      displayPageIndex: targetPageIndex,
      displayPageCount: pageCount,
    };
  }

  function rememberPagePosition(targetPageIndex: number) {
    const locator = locatorForPage(targetPageIndex);
    if (!locator) return;
    latestLocatorRef.current = locator;
    writeStoredProgress(locator);
  }

  function updatePagePosition(
    nextPageIndex: number | ((currentPageIndex: number) => number),
  ) {
    setPageIndex((current) => {
      const requested =
        typeof nextPageIndex === "function"
          ? nextPageIndex(current)
          : nextPageIndex;
      const next = clampPageIndex(requested, Math.max(0, pageCount - 1));
      rememberPagePosition(next);
      return next;
    });
  }

  function goToSpine(nextIndex: number) {
    if (!manifest) return;
    const item = manifest.spine[nextIndex];
    if (!item) return;
    updatePagePosition(chapterPageStarts[nextIndex] ?? 0);
    setTocOpen(false);
  }

  function goToTocItem(item: TocItemDto) {
    if (!manifest) return;
    const href = normalizeHrefForMatch(item.href);
    const nextIndex = manifest.spine.findIndex(
      (spineItem) => normalizeHrefForMatch(spineItem.href) === href,
    );
    if (nextIndex >= 0) {
      goToSpine(nextIndex);
    }
  }

  function previousPage() {
    updatePagePosition((current) => current - 1);
  }

  function nextPage() {
    updatePagePosition((current) => current + 1);
  }

  function updateReaderSettings(next: Partial<ReaderSettings>) {
    setReaderSettings((current) => ({ ...current, ...next }));
  }

  function resetRenditionSettings() {
    setReaderSettings(resetReaderSettings());
    updatePagePosition(0);
  }

  const currentThemeColors = themeColors(readerSettings.theme);

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#151412] text-neutral-100">
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-white/10 bg-black/25 px-5">
        <button
          type="button"
          onClick={async () => {
            await persistLatestProgress();
            onBack();
          }}
          className="grid h-10 w-10 place-items-center rounded-md text-neutral-300 transition hover:bg-white/10 hover:text-white"
          title="Voltar para biblioteca"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">
            {manifest?.title ?? "Livro"}
          </h1>
          <p className="truncate text-xs text-neutral-400">
            {manifest?.author ?? currentChapter}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setTocOpen((open) => !open);
            setSettingsOpen(false);
          }}
          className="grid h-10 w-10 place-items-center rounded-md border border-white/10 text-neutral-200 transition hover:bg-white/10"
          title="Sumario"
        >
          <ListTree size={18} />
        </button>
        <button
          type="button"
          onClick={() => {
            setSettingsOpen((open) => !open);
            setTocOpen(false);
          }}
          className="grid h-10 w-10 place-items-center rounded-md border border-white/10 text-neutral-200"
          title="Rendition Settings"
        >
          <Settings2 size={18} />
        </button>
      </header>

      {settingsOpen ? (
        <ReadingSettingsPopover
          settings={readerSettings}
          onChange={updateReaderSettings}
          onReset={resetRenditionSettings}
        />
      ) : null}
      {tocOpen && manifest ? (
        <TocPopover
          toc={manifest.toc}
          currentHref={manifest.spine[spineIndex]?.href}
          onNavigate={goToTocItem}
        />
      ) : null}

      <section className="relative flex min-h-0 flex-1 items-stretch justify-center overflow-hidden bg-black/55 p-5">
        <button
          type="button"
          onClick={previousPage}
          className="absolute left-5 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/35 text-neutral-200 transition hover:bg-black/55"
          title="Pagina anterior"
        >
          <ChevronLeft size={24} />
        </button>

        <div
          className={`h-full min-h-0 w-full overflow-hidden rounded-lg border border-white/10 shadow-2xl shadow-black/30 ${
            readerSettings.readingMode === "paginated" &&
            readerSettings.spreadMode === "spread"
              ? "max-w-6xl"
              : "max-w-4xl"
          }`}
          style={{ backgroundColor: currentThemeColors.background }}
        >
          {message ? (
            <div className="grid h-full place-items-center p-8 text-center text-red-950">
              {message}
            </div>
          ) : (
            <iframe
              ref={frameRef}
              title={manifest?.title ?? "Leitor EPUB"}
              sandbox="allow-same-origin"
              srcDoc={buildReaderDocument(resource?.contents ?? "")}
              onLoad={repaginate}
              className="block h-full w-full overflow-hidden border-0"
              style={{ backgroundColor: currentThemeColors.background }}
            />
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

      <footer className="grid min-h-20 shrink-0 grid-cols-[minmax(0,1fr)_minmax(18rem,2fr)_minmax(0,1fr)] items-center gap-5 border-t border-white/10 bg-black/25 px-7 py-3 text-sm text-neutral-300">
        <div className="min-w-0">
          <span className="block truncate font-medium text-neutral-100">
            {currentChapter}
          </span>
          <span className="block truncate text-xs text-neutral-500">
            Página: {chapterStats.chapterPageIndex + 1} /{" "}
            {chapterStats.chapterPageCount}
          </span>
        </div>
        <label className="min-w-0">
          <span className="mb-2 flex items-center justify-center gap-2 text-xs text-neutral-400">
            <span>Página</span>
            <span className="text-neutral-200">
              {pageIndex + 1} / {pageCount}
            </span>
            <span>
              {totalRemainingPages == 1
                ? `resta ${totalRemainingPages} página`
                : `restam ${totalRemainingPages} páginas`}
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(0, pageCount - 1)}
            value={pageIndex}
            onChange={(event) => updatePagePosition(Number(event.target.value))}
            className="block w-full accent-amber-300"
            aria-label="Escolher pagina do livro"
          />
        </label>
        <span className="text-right">
          {Math.round(totalProgression * 100)}% do livro
        </span>
      </footer>
    </main>
  );
}

function ReadingSettingsPopover({
  settings,
  onChange,
  onReset,
}: {
  settings: ReaderSettings;
  onChange: (settings: Partial<ReaderSettings>) => void;
  onReset: () => void;
}) {
  return (
    <aside className="absolute right-5 top-20 z-30 max-h-[calc(100vh-6rem)] w-80 overflow-y-auto rounded-lg border border-white/10 bg-[#1f1d1a] p-4 text-sm text-neutral-100 shadow-2xl shadow-black/40">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Configurações de Exibição</h2>
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
          <option value="Georgia, Times New Roman, serif">Georgia</option>
          <option value="Lora, Georgia, serif">Lora</option>
          <option value="Arial, Helvetica, sans-serif">Arial</option>
          <option value="Verdana, Geneva, sans-serif">Verdana</option>
          <option value="OpenDyslexic, Arial, sans-serif">OpenDyslexic</option>
        </select>
      </label>

      <SettingSlider
        label="Tamanho da fonte"
        value={settings.fontSize}
        min={14}
        max={32}
        step={1}
        suffix="px"
        onChange={(fontSize) => onChange({ fontSize })}
      />
      <SettingSlider
        label="Margem"
        value={settings.margin}
        min={24}
        max={140}
        step={4}
        suffix="px"
        onChange={(margin) => onChange({ margin })}
      />
      <SettingSlider
        label="Espacamento entre linhas"
        value={settings.lineHeight}
        min={1.2}
        max={2.2}
        step={0.05}
        onChange={(lineHeight) => onChange({ lineHeight })}
      />
      <SettingSlider
        label="Espacamento de paragrafo"
        value={settings.paragraphSpacing}
        min={0.4}
        max={2}
        step={0.05}
        suffix="em"
        onChange={(paragraphSpacing) => onChange({ paragraphSpacing })}
      />

      <ThemeButtons
        value={settings.theme}
        onChange={(theme) => onChange({ theme })}
      />
      <SegmentedButtons<TextAlignMode>
        label="Alinhamento"
        value={settings.textAlign}
        options={[
          ["left", "Esquerda"],
          ["justify", "Justificado"],
        ]}
        onChange={(textAlign) => onChange({ textAlign })}
      />
      <SegmentedButtons<ReadingMode>
        label="Modo de leitura"
        value={settings.readingMode}
        options={[
          ["paginated", "Paginado"],
          ["scroll", "Rolagem continua"],
        ]}
        onChange={(readingMode) => onChange({ readingMode })}
      />
      <SegmentedButtons<SpreadMode>
        label="Modo"
        value={settings.spreadMode}
        options={[
          ["single", "Uma pagina"],
          ["spread", "Duas paginas"],
        ]}
        disabled={settings.readingMode === "scroll"}
        onChange={(spreadMode) => onChange({ spreadMode })}
      />
    </aside>
  );
}

function TocPopover({
  toc,
  currentHref,
  onNavigate,
}: {
  toc: TocItemDto[];
  currentHref?: string;
  onNavigate: (item: TocItemDto) => void;
}) {
  const items = flattenToc(toc);

  return (
    <aside className="absolute right-5 top-20 z-30 max-h-[calc(100vh-7rem)] w-80 overflow-y-auto rounded-lg border border-white/10 bg-[#1f1d1a] p-4 text-sm text-neutral-100 shadow-2xl shadow-black/40">
      <div className="mb-4">
        <h2 className="font-semibold">Sumario</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Navegue pelo TOC do EPUB sem sair do fluxo reflowable.
        </p>
      </div>
      {items.length > 0 ? (
        <div className="space-y-1">
          {items.map(({ item, depth }) => {
            const isCurrent =
              normalizeHrefForMatch(item.href) ===
              normalizeHrefForMatch(currentHref ?? "");

            return (
              <button
                key={`${item.id}-${item.href}`}
                type="button"
                onClick={() => onNavigate(item)}
                className={`block w-full rounded-md px-3 py-2 text-left text-xs transition ${
                  isCurrent
                    ? "bg-amber-300/15 text-amber-100"
                    : "text-neutral-300 hover:bg-white/[0.07] hover:text-white"
                }`}
                style={{ paddingLeft: `${12 + depth * 14}px` }}
              >
                <span className="line-clamp-2">{item.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-xs text-neutral-400">
          Este EPUB nao informou um sumario navegavel.
        </p>
      )}
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
          const colors = themeColors(theme);
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
  options: Array<[TValue, string]>;
  disabled?: boolean;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="mt-4">
      <span className="text-xs text-neutral-400">{label}</span>
      <div
        className={`mt-2 grid gap-2 ${options.length > 2 ? "grid-cols-3" : "grid-cols-2"}`}
      >
        {options.map(([optionValue, optionLabel]) => {
          const isSelected = value === optionValue;
          return (
            <button
              key={optionValue}
              type="button"
              disabled={disabled}
              onClick={() => onChange(optionValue)}
              aria-pressed={isSelected}
              className={`min-h-10 rounded-md border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
                isSelected
                  ? "border-amber-300 bg-amber-300/15 text-amber-100"
                  : "border-white/10 bg-white/[0.03] text-neutral-300 hover:bg-white/[0.07]"
              }`}
            >
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

type TocListItem = {
  item: TocItemDto;
  depth: number;
};

type ChapterPageStats = {
  chapterPageIndex: number;
  chapterPageCount: number;
  chapterRemaining: number;
  progression: number;
};

function normalizeHrefForMatch(href: string) {
  return href.split("#")[0].replace(/^\.\//, "");
}

function progressStorageKey(bookId: string) {
  return `${PROGRESS_STORAGE_PREFIX}${bookId}`;
}

function readStoredProgress(bookId: string): ReadingLocator | null {
  try {
    const value = window.localStorage.getItem(progressStorageKey(bookId));
    if (!value) return null;
    const parsed = JSON.parse(value) as ReadingLocator;
    if (
      parsed.bookId !== bookId ||
      typeof parsed.href !== "string" ||
      typeof parsed.spineIndex !== "number" ||
      typeof parsed.progression !== "number" ||
      typeof parsed.totalProgression !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredProgress(locator: ReadingLocator) {
  try {
    window.localStorage.setItem(
      progressStorageKey(locator.bookId),
      JSON.stringify(locator),
    );
  } catch {
    // LocalStorage can be unavailable in restricted WebViews; SQLite remains the fallback.
  }
}

function findTocItemByHref(
  items: TocItemDto[],
  href: string | undefined,
): TocItemDto | undefined {
  if (!href) return undefined;
  const normalized = normalizeHrefForMatch(href);
  for (const item of items) {
    if (normalizeHrefForMatch(item.href) === normalized) {
      return item;
    }
    const child = findTocItemByHref(item.children, href);
    if (child) return child;
  }
  return undefined;
}

function flattenToc(items: TocItemDto[], depth = 0): TocListItem[] {
  return items.flatMap((item) => [
    { item, depth },
    ...flattenToc(item.children, depth + 1),
  ]);
}

function currentSpineIndex(
  pageIndex: number,
  chapterPageStarts: number[],
  spineCount: number,
) {
  if (spineCount <= 0) return 0;
  let current = 0;
  for (let index = 0; index < spineCount; index += 1) {
    const start = chapterPageStarts[index] ?? 0;
    if (start <= pageIndex) {
      current = index;
    }
  }
  return Math.min(current, spineCount - 1);
}

function resolvePageAfterReflow(
  currentPageIndex: number,
  measuredPageCount: number,
  pendingProgressRef: { current: ReadingLocator | null },
  measuredChapterStarts: number[],
) {
  const maxPage = Math.max(0, measuredPageCount - 1);
  const pending = pendingProgressRef.current;
  if (!pending) return Math.min(currentPageIndex, maxPage);

  pendingProgressRef.current = null;
  if (
    pending.displayPageIndex !== undefined &&
    pending.displayPageCount === measuredPageCount
  ) {
    return clampPageIndex(pending.displayPageIndex, maxPage);
  }

  const chapterStart = measuredChapterStarts[pending.spineIndex];
  if (chapterStart !== undefined) {
    const nextChapterStart =
      measuredChapterStarts.find(
        (candidate, index) =>
          index > pending.spineIndex && candidate > chapterStart,
      ) ?? measuredPageCount;
    const chapterPageCount = Math.max(1, nextChapterStart - chapterStart);
    return clampPageIndex(
      Math.round(
        chapterStart +
          pending.progression * Math.max(0, chapterPageCount - 1),
      ),
      maxPage,
    );
  }

  return clampPageIndex(Math.round(pending.totalProgression * maxPage), maxPage);
}

function clampPageIndex(pageIndex: number, maxPage: number) {
  return Math.min(maxPage, Math.max(0, pageIndex));
}

function chapterPageStats(
  pageIndex: number,
  pageCount: number,
  chapterPageStarts: number[],
  spineIndex: number,
): ChapterPageStats {
  const start = Math.min(
    pageCount - 1,
    Math.max(0, chapterPageStarts[spineIndex] ?? 0),
  );
  const nextStart =
    chapterPageStarts.find(
      (candidate, index) => index > spineIndex && candidate > start,
    ) ?? pageCount;
  const chapterPageCount = Math.max(1, nextStart - start);
  const chapterPageIndex = Math.min(
    chapterPageCount - 1,
    Math.max(0, pageIndex - start),
  );
  const chapterRemaining = Math.max(0, chapterPageCount - chapterPageIndex - 1);

  return {
    chapterPageIndex,
    chapterPageCount,
    chapterRemaining,
    progression:
      chapterPageCount <= 1
        ? 0
        : chapterPageIndex / Math.max(1, chapterPageCount - 1),
  };
}

function measureChapterStarts(
  root: HTMLElement,
  pageCount: number,
  mode: ReadingMode,
  pageSize: number,
) {
  const sections = Array.from(
    root.querySelectorAll<HTMLElement>("[data-reader-spine-index]"),
  );
  const starts: number[] = [];

  for (const section of sections) {
    const index = Number(section.dataset.readerSpineIndex ?? 0);
    const offset =
      mode === "scroll"
        ? section.offsetTop
        : section.getBoundingClientRect().left -
          root.getBoundingClientRect().left;
    const page = Math.min(
      pageCount - 1,
      Math.max(0, Math.floor(offset / Math.max(1, pageSize))),
    );
    starts[index] = page;
  }

  const sectionCount = Math.max(1, sections.length);
  for (let index = 0; index < sectionCount; index += 1) {
    if (starts[index] === undefined) {
      starts[index] = Math.min(
        pageCount - 1,
        Math.floor((index / sectionCount) * pageCount),
      );
    }
  }

  return starts;
}
