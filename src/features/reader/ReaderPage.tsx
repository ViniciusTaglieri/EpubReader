import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Settings2 } from "lucide-react";
import { commands, errorMessage } from "../../shared/tauri/commands";
import type {
  EpubManifestDto,
  ReadingLocator,
  ReadingSettingsDto,
  ResourceDto
} from "../../shared/types/books";
import {
  resolveInitialSpine,
  resolveTotalProgression,
  type SpinePosition
} from "./readerNavigation";
import { buildReaderDocument } from "./readerDocument";

type ReaderPageProps = {
  bookId: string;
  onBack: () => void;
};

const COLUMN_GAP = 56;
const DEFAULT_READER_SETTINGS = {
  fontFamily: "Georgia, Times New Roman, serif",
  fontSize: 20,
  lineHeight: 1.68,
  margin: 72,
  paragraphSpacing: 1.05
};

type ReaderSettings = typeof DEFAULT_READER_SETTINGS;

export function ReaderPage({ bookId, onBack }: ReaderPageProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const pendingInitialPageIndexRef = useRef<number | null>(null);
  const [manifest, setManifest] = useState<EpubManifestDto | null>(null);
  const [resource, setResource] = useState<ResourceDto | null>(null);
  const [position, setPosition] = useState<SpinePosition | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(DEFAULT_READER_SETTINGS);

  useEffect(() => {
    let cancelled = false;

    async function loadBook() {
      setIsLoading(true);
      try {
        const [loadedManifest, progress] = await Promise.all([
          commands.getBookManifest(bookId),
          commands.getProgress(bookId)
        ]);
        if (cancelled) return;
        const initial = resolveInitialSpine(loadedManifest, progress);
        pendingInitialPageIndexRef.current = progress?.displayPageIndex ?? 0;
        setManifest(loadedManifest);
        setPosition(initial);
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

  useEffect(() => {
    if (!position?.href) return;
    const href = position.href;
    let cancelled = false;

    async function loadResource() {
      setIsLoading(true);
      try {
        const loaded = await commands.getSpineResource(bookId, href);
        if (!cancelled) {
          setResource(loaded);
          setPageIndex(pendingInitialPageIndexRef.current ?? 0);
          pendingInitialPageIndexRef.current = null;
          setMessage(null);
        }
      } catch (error) {
        if (!cancelled) setMessage(errorMessage(error));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadResource();
    return () => {
      cancelled = true;
    };
  }, [bookId, position?.href]);

  const spineIndex = position?.spineIndex ?? 0;
  const currentChapter = useMemo(() => {
    if (!manifest || !position) return "";
    return manifest.toc.find((item) => item.href === position.href)?.label ?? `Spine ${spineIndex + 1}`;
  }, [manifest, position, spineIndex]);
  const totalProgression = resolveTotalProgression(
    spineIndex,
    pageCount <= 1 ? 0 : pageIndex / Math.max(1, pageCount - 1),
    manifest?.spine.length ?? 0
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
    const margin = Math.min(Math.floor((width - 280) / 2), readerSettings.margin);
    const contentWidth = Math.max(260, width - margin * 2);
    const contentHeight = Math.max(320, height - margin * 2);
    const pageStep = contentWidth + COLUMN_GAP;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    stage.style.setProperty("--reader-margin", `${margin}px`);
    stage.style.setProperty("--reader-content-width", `${contentWidth}px`);
    stage.style.setProperty("--reader-content-height", `${contentHeight}px`);
    stage.style.setProperty("--reader-column-gap", `${COLUMN_GAP}px`);
    root.style.fontFamily = readerSettings.fontFamily;
    root.style.fontSize = `${readerSettings.fontSize}px`;
    root.style.lineHeight = String(readerSettings.lineHeight);
    root.style.setProperty("--reader-paragraph-spacing", `${readerSettings.paragraphSpacing}em`);
    clip.style.width = `${contentWidth}px`;
    clip.style.height = `${contentHeight}px`;
    root.style.transform = `translateX(-${Math.min(pageIndex, pageCount - 1) * pageStep}px)`;

    const measuredPages = Math.max(1, Math.ceil(root.scrollWidth / pageStep));
    setPageCount(measuredPages);
    setPageIndex((current) => Math.min(current, measuredPages - 1));
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
    const margin = Number.parseFloat(stage.style.getPropertyValue("--reader-margin")) || 0;
    const contentWidth = Math.max(260, frame.clientWidth - margin * 2);
    root.style.transform = `translateX(-${pageIndex * (contentWidth + COLUMN_GAP)}px)`;
  }, [pageIndex]);

  useEffect(() => {
    const settings: ReadingSettingsDto = {
      id: "default",
      name: "Default",
      fontFamily: readerSettings.fontFamily,
      fontSize: readerSettings.fontSize,
      lineHeight: readerSettings.lineHeight,
      margin: readerSettings.margin,
      paragraphSpacing: readerSettings.paragraphSpacing,
      theme: "sepia",
      textAlign: "left",
      hyphenationEnabled: true,
      ligaturesEnabled: true
    };
    const handle = window.setTimeout(() => {
      void commands.updateReadingSettings(settings).catch(() => undefined);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [readerSettings]);

  useEffect(() => {
    if (!manifest || !position || !resource) return;
    const locator: ReadingLocator = {
      bookId,
      href: position.href,
      spineIndex,
      progression: pageCount <= 1 ? 0 : pageIndex / Math.max(1, pageCount - 1),
      totalProgression,
      displayPageIndex: pageIndex,
      displayPageCount: pageCount
    };
    const handle = window.setTimeout(() => {
      void commands.saveProgress(bookId, locator);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [bookId, manifest, pageCount, pageIndex, position, resource, spineIndex, totalProgression]);

  function goToSpine(nextIndex: number) {
    if (!manifest) return;
    const item = manifest.spine[nextIndex];
    if (!item) return;
    setPosition({ href: item.href, spineIndex: nextIndex });
  }

  function previousPage() {
    if (pageIndex > 0) {
      setPageIndex((current) => current - 1);
    } else if (spineIndex > 0) {
      goToSpine(spineIndex - 1);
    }
  }

  function nextPage() {
    if (pageIndex < pageCount - 1) {
      setPageIndex((current) => current + 1);
    } else if (manifest && spineIndex < manifest.spine.length - 1) {
      goToSpine(spineIndex + 1);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#151412] text-neutral-100">
      <header className="flex h-16 items-center gap-4 border-b border-white/10 bg-black/25 px-5">
        <button
          type="button"
          onClick={onBack}
          className="grid h-10 w-10 place-items-center rounded-md text-neutral-300 transition hover:bg-white/10 hover:text-white"
          title="Voltar para biblioteca"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{manifest?.title ?? "Livro"}</h1>
          <p className="truncate text-xs text-neutral-400">{manifest?.author ?? currentChapter}</p>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen((open) => !open)}
          className="rounded-md border border-white/10 px-3 py-2 text-sm text-neutral-200"
          title="Ajustes de leitura"
        >
          Aa
        </button>
        <button
          type="button"
          onClick={() => setSettingsOpen((open) => !open)}
          className="grid h-10 w-10 place-items-center rounded-md border border-white/10 text-neutral-200"
          title="Rendition Settings"
        >
          <Settings2 size={18} />
        </button>
      </header>

      {settingsOpen ? (
        <ReadingSettingsPopover
          settings={readerSettings}
          onChange={(next) => {
            setReaderSettings((current) => ({ ...current, ...next }));
            window.setTimeout(repaginate, 0);
          }}
        />
      ) : null}

      <section className="relative flex flex-1 items-stretch justify-center overflow-hidden p-5">
        <button
          type="button"
          onClick={previousPage}
          className="absolute left-5 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/35 text-neutral-200 transition hover:bg-black/55"
          title="Pagina anterior"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="w-full max-w-4xl overflow-hidden rounded-lg border border-white/10 bg-[#f3e2bf] shadow-2xl shadow-black/30">
          {message ? (
            <div className="grid h-full min-h-[34rem] place-items-center p-8 text-center text-red-950">
              {message}
            </div>
          ) : (
            <iframe
              ref={frameRef}
              title={manifest?.title ?? "Leitor EPUB"}
              sandbox="allow-same-origin"
              srcDoc={buildReaderDocument(resource?.contents ?? "")}
              onLoad={repaginate}
              className="block h-[calc(100vh-10rem)] w-full overflow-hidden border-0 bg-[#f3e2bf]"
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

      <footer className="grid h-16 grid-cols-3 items-center border-t border-white/10 bg-black/25 px-7 text-sm text-neutral-300">
        <span className="truncate">{currentChapter}</span>
        <span className="text-center">
          Pagina visual {pageIndex + 1} / {pageCount}
        </span>
        <span className="text-right">{Math.round(totalProgression * 100)}% do livro</span>
      </footer>
    </main>
  );
}

function ReadingSettingsPopover({
  settings,
  onChange
}: {
  settings: ReaderSettings;
  onChange: (settings: Partial<ReaderSettings>) => void;
}) {
  return (
    <aside className="absolute right-5 top-20 z-30 w-80 rounded-lg border border-white/10 bg-[#1f1d1a] p-4 text-sm text-neutral-100 shadow-2xl shadow-black/40">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Pagina</h2>
        <span className="text-xs text-neutral-400">Reflow</span>
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
    </aside>
  );
}

function SettingSlider({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  onChange
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
