import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ListTree,
  Loader2,
  Settings2,
} from "lucide-react";
import { commands } from "../../shared/tauri/commands";
import type {
  ReadingLocator,
  ReadingSettingsDto,
  TocItemDto,
} from "../../shared/types/books";
import {
  DEFAULT_READER_SETTINGS,
  resetReaderSettings,
  readerSettingsFromDto,
  themeColors,
  type ReaderSettings,
  type ReadingMode,
} from "./readerSettings";
import {
  buildReadingLocator,
  bookPageStats,
  chapterPageStats,
  clampPageIndex,
  resolveBookPageTarget,
  resolveLazyInitialPage,
  resolveInitialPage,
  shouldDeferSavedPositionRestore,
  shouldSaveReadingPosition,
} from "./readerPosition";
import { ReaderFrame } from "./ReaderFrame";
import { ReadingSettingsPopover } from "./ReadingSettingsPopover";
import {
  findTocItemByHref,
  normalizeHrefForMatch,
  TocPopover,
} from "./TocPopover";
import { useReaderBook } from "./useReaderBook";

type ReaderPageProps = {
  bookId: string;
  onBack: () => void;
};

const COLUMN_GAP = 56;
const RESTORE_LAYOUT_RETRY_LIMIT = 8;

export function ReaderPage({ bookId, onBack }: ReaderPageProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const pendingProgressRef = useRef<ReadingLocator | null>(null);
  const latestLocatorRef = useRef<ReadingLocator | null>(null);
  const restoreRetryCountRef = useRef(0);
  const hasUserNavigatedRef = useRef(false);
  const pageIndexFromScrollRef = useRef(false);
  const {
    manifest,
    resource,
    savedLocator,
    spineIndex,
    isLoading,
    message,
    setMessage,
    goToSpine: loadSpine,
  } = useReaderBook(bookId);
  const [chapterPageStarts, setChapterPageStarts] = useState<number[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [measuredSpinePageCounts, setMeasuredSpinePageCounts] = useState<
    Record<number, number>
  >({});
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(
    DEFAULT_READER_SETTINGS,
  );

  useEffect(() => {
    pendingProgressRef.current = savedLocator;
    latestLocatorRef.current = savedLocator;
    restoreRetryCountRef.current = 0;
    hasUserNavigatedRef.current = false;
    setPageIndex(0);
    setPageCount(1);
    setChapterPageStarts([0]);
    setIsLayoutReady(false);
  }, [savedLocator]);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const savedSettings = await commands.getReadingSettings("default");
        if (cancelled) return;
        if (savedSettings) {
          setReaderSettings(readerSettingsFromDto(savedSettings));
        }
      } catch {
        // Defaults remain usable if persisted settings cannot be loaded.
      } finally {
        if (!cancelled) setSettingsLoaded(true);
      }
    }

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

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
  const chapterStats = chapterPageStats(
    pageIndex,
    pageCount,
    chapterPageStarts,
    spineIndex,
  );
  const totalProgression =
    manifest && manifest.spine.length > 0
      ? (spineIndex + chapterStats.progression) / manifest.spine.length
      : 0;
  const visibleBookPages = bookPageStats({
    spineIndex,
    pageIndex,
    pageCount,
    spineCount: manifest?.spine.length ?? 1,
    measuredSpinePageCounts,
    spineTextLengths: manifest?.spine.map((item) => item.textLength ?? 0) ?? [],
  });
  const totalRemainingPages = Math.max(
    0,
    visibleBookPages.totalPages - visibleBookPages.currentPage,
  );

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
      rememberMeasuredPageCount(measuredPages);
      setPageIndex((current) =>
        resolvePageForLayout(current, measuredPages, measuredChapterStarts),
      );
      setChapterPageStarts(measuredChapterStarts);
      setIsLayoutReady(true);
      scheduleRestoreRetry(measuredPages);
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
    rememberMeasuredPageCount(measuredPages);
    setPageIndex((current) =>
      resolvePageForLayout(current, measuredPages, measuredChapterStarts),
    );
    setChapterPageStarts(measuredChapterStarts);
    setIsLayoutReady(true);
    scheduleRestoreRetry(measuredPages);
  }, [pageCount, pageIndex, readerSettings, spineIndex]);

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
        hasUserNavigatedRef.current = true;
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
    const locator = buildReadingLocator({
      bookId,
      spine: manifest.spine,
      spineIndex,
      pageIndex,
      pageCount,
      chapterPageStarts,
    });
    if (!locator) return;
    latestLocatorRef.current = locator;
    if (!shouldSaveReadingPosition(locator, hasUserNavigatedRef.current)) {
      return;
    }
    void commands.saveProgress(bookId, locator).catch(() => undefined);
  }, [
    bookId,
    chapterPageStarts,
    isLayoutReady,
    manifest,
    pageCount,
    pageIndex,
    resource,
    spineIndex,
  ]);

  useEffect(() => {
    return () => {
      const locator = latestLocatorRef.current;
      if (
        locator &&
        shouldSaveReadingPosition(locator, hasUserNavigatedRef.current)
      ) {
        void commands.saveProgress(bookId, locator).catch(() => undefined);
      }
    };
  }, [bookId]);

  async function persistLatestProgress() {
    const locator = latestLocatorRef.current;
    if (
      locator &&
      shouldSaveReadingPosition(locator, hasUserNavigatedRef.current)
    ) {
      await commands.saveProgress(bookId, locator).catch(() => undefined);
    }
  }

  function locatorForPage(targetPageIndex: number): ReadingLocator | null {
    if (!isLayoutReady || !manifest || !resource) return null;
    return buildReadingLocator({
      bookId,
      spine: manifest.spine,
      spineIndex,
      pageIndex: targetPageIndex,
      pageCount,
      chapterPageStarts,
    });
  }

  function rememberPagePosition(targetPageIndex: number) {
    const locator = locatorForPage(targetPageIndex);
    if (!locator) return;
    latestLocatorRef.current = locator;
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
      hasUserNavigatedRef.current = true;
      rememberPagePosition(next);
      return next;
    });
  }

  function updateBookPagePosition(targetPageIndex: number) {
    if (!manifest) {
      updatePagePosition(targetPageIndex);
      return;
    }
    const target = resolveBookPageTarget({
      targetPageIndex,
      activeSpineIndex: spineIndex,
      activePageCount: pageCount,
      spineCount: manifest.spine.length,
      measuredSpinePageCounts,
      spineTextLengths: manifest.spine.map((item) => item.textLength ?? 0),
    });
    if (target.spineIndex === spineIndex) {
      updatePagePosition(target.pageIndex);
      return;
    }
    void goToSpine(target.spineIndex, target.progression);
  }

  async function goToSpine(nextIndex: number, progression = 0) {
    if (!manifest) return;
    const item = manifest.spine[nextIndex];
    if (!item) return;
    hasUserNavigatedRef.current = true;
    pendingProgressRef.current = {
      bookId,
      href: item.href,
      spineIndex: nextIndex,
      progression,
      totalProgression: (nextIndex + progression) / manifest.spine.length,
    };
    await loadSpine(nextIndex);
    setTocOpen(false);
  }

  function goToTocItem(item: TocItemDto) {
    if (!manifest) return;
    const href = normalizeHrefForMatch(item.href);
    const nextIndex = manifest.spine.findIndex(
      (spineItem) => normalizeHrefForMatch(spineItem.href) === href,
    );
    if (nextIndex >= 0) {
      void goToSpine(nextIndex);
    }
  }

  function previousPage() {
    if (pageIndex <= 0 && spineIndex > 0) {
      void goToSpine(spineIndex - 1, 1);
      return;
    }
    updatePagePosition((current) => current - 1);
  }

  function nextPage() {
    if (pageIndex >= pageCount - 1 && manifest && spineIndex < manifest.spine.length - 1) {
      void goToSpine(spineIndex + 1);
      return;
    }
    updatePagePosition((current) => current + 1);
  }

  function updateReaderSettings(next: Partial<ReaderSettings>) {
    setReaderSettings((current) => ({ ...current, ...next }));
  }

  function resetRenditionSettings() {
    setReaderSettings(resetReaderSettings());
    updatePagePosition(0);
  }

  function rememberMeasuredPageCount(measuredPages: number) {
    setMeasuredSpinePageCounts((current) => {
      if (current[spineIndex] === measuredPages) return current;
      return { ...current, [spineIndex]: measuredPages };
    });
  }

  function resolvePageForLayout(
    currentPageIndex: number,
    measuredPageCount: number,
    measuredChapterStarts: number[],
  ) {
    const locator = pendingProgressRef.current ?? latestLocatorRef.current;
    if (locator && shouldDeferSavedPositionRestore(locator, measuredPageCount)) {
      return currentPageIndex;
    }
    pendingProgressRef.current = null;
    restoreRetryCountRef.current = 0;
    if (locator?.spineIndex === spineIndex) {
      return resolveLazyInitialPage({
        savedLocator: locator,
        measuredPageCount,
        activeSpineIndex: spineIndex,
        currentPageIndex,
      });
    }
    return resolveInitialPage(
      locator,
      measuredPageCount,
      measuredChapterStarts,
      currentPageIndex,
    );
  }

  function scheduleRestoreRetry(measuredPageCount: number) {
    const locator = pendingProgressRef.current;
    if (
      !locator ||
      !shouldDeferSavedPositionRestore(locator, measuredPageCount) ||
      restoreRetryCountRef.current >= RESTORE_LAYOUT_RETRY_LIMIT
    ) {
      return;
    }
    restoreRetryCountRef.current += 1;
    window.setTimeout(repaginate, 80);
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
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
      {tocOpen && manifest ? (
        <TocPopover
          toc={manifest.toc}
          currentHref={manifest.spine[spineIndex]?.href}
          onNavigate={goToTocItem}
          onClose={() => setTocOpen(false)}
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
          {settingsLoaded ? (
            <ReaderFrame
              ref={frameRef}
              manifest={manifest}
              resource={resource}
              message={message}
              background={currentThemeColors.background}
              onDismissMessage={() => setMessage(null)}
              onLoad={repaginate}
            />
          ) : null}
        </div>

        <button
          type="button"
          onClick={nextPage}
          className="absolute right-5 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/35 text-neutral-200 transition hover:bg-black/55"
          title="Proxima pagina"
        >
          <ChevronRight size={24} />
        </button>

        {isLoading || !settingsLoaded ? (
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
              {visibleBookPages.currentPage} / {visibleBookPages.totalPages}
            </span>
            <span>
              {totalRemainingPages === 1
                ? `resta ${totalRemainingPages} página`
                : `restam ${totalRemainingPages} páginas`}
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(0, visibleBookPages.totalPages - 1)}
            value={Math.max(0, visibleBookPages.currentPage - 1)}
            onChange={(event) =>
              updateBookPagePosition(Number(event.target.value))
            }
            className="block w-full accent-amber-300"
            aria-label="Escolher pagina do livro inteiro"
          />
        </label>
        <span className="text-right">
          {Math.round(totalProgression * 100)}% do livro
        </span>
      </footer>
    </main>
  );
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
