import type { ReadingLocator } from "../../shared/types/books";

export type EpubBook = {
  open: (data: ArrayBuffer, type: "binary") => Promise<void>;
  renderTo: (element: HTMLElement, options: Record<string, unknown>) => Rendition;
  destroy?: () => void;
  locations?: {
    generate?: (chars: number) => Promise<unknown>;
    length?: () => number;
    percentageFromCfi?: (cfi: string) => number;
    locationFromCfi?: (cfi: string) => number;
  };
};

export type Rendition = {
  display: (target?: string) => Promise<unknown>;
  prev: () => Promise<unknown>;
  next: () => Promise<unknown>;
  on: (event: "relocated", handler: (location: EpubLocation) => void) => void;
  resize?: (width?: number | string, height?: number | string, cfi?: string) => void;
  flow?: (flow: "paginated" | "scrolled-doc") => void;
  spread?: (spread: "none" | "auto") => void;
  themes?: {
    default: (rules: Record<string, Record<string, string>>) => void;
    font?: (font: string) => void;
    fontSize?: (size: string) => void;
  };
  destroy?: () => void;
};

export type EpubLocation = {
  start?: {
    cfi?: string;
    href?: string;
    index?: number;
    percentage?: number;
    displayed?: {
      page?: number;
      total?: number;
    };
  };
};

export type ReaderTheme = "light" | "dark" | "sepia" | "oled";
export type ReaderFlow = "paginated" | "continuous";
export type ReaderSpread = "single" | "double";
export type ReaderTextAlign = "left" | "justify";

export type ReaderSettings = {
  fontSize: number;
  fontFamily: string;
  theme: ReaderTheme;
  margin: number;
  flow: ReaderFlow;
  spread: ReaderSpread;
  textAlign: ReaderTextAlign;
  lineHeight: number;
  paragraphSpacing: number;
};

export type ReaderPageStats = {
  currentPage: number;
  totalPages: number;
  remainingPages: number;
};

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSize: 18,
  fontFamily: "Georgia, serif",
  theme: "sepia",
  margin: 32,
  flow: "paginated",
  spread: "single",
  textAlign: "left",
  lineHeight: 1.6,
  paragraphSpacing: 0.8,
};

const READER_SETTINGS_KEY = "epub-reader:reader-settings";

export function numbersToArrayBuffer(bytes: number[]) {
  return new Uint8Array(bytes).buffer;
}

export function loadReaderSettings(): ReaderSettings {
  try {
    const raw = window.localStorage.getItem(READER_SETTINGS_KEY);
    if (!raw) return DEFAULT_READER_SETTINGS;
    return normalizeReaderSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_READER_SETTINGS;
  }
}

export function saveReaderSettings(settings: ReaderSettings) {
  window.localStorage.setItem(READER_SETTINGS_KEY, JSON.stringify(settings));
}

export function normalizeReaderSettings(input: Partial<ReaderSettings>): ReaderSettings {
  return {
    fontSize: clampNumber(input.fontSize, 12, 34, DEFAULT_READER_SETTINGS.fontSize),
    fontFamily: isNonEmptyString(input.fontFamily)
      ? input.fontFamily
      : DEFAULT_READER_SETTINGS.fontFamily,
    theme: oneOf(input.theme, ["light", "dark", "sepia", "oled"], DEFAULT_READER_SETTINGS.theme),
    margin: clampNumber(input.margin, 0, 96, DEFAULT_READER_SETTINGS.margin),
    flow: oneOf(input.flow, ["paginated", "continuous"], DEFAULT_READER_SETTINGS.flow),
    spread: oneOf(input.spread, ["single", "double"], DEFAULT_READER_SETTINGS.spread),
    textAlign: oneOf(input.textAlign, ["left", "justify"], DEFAULT_READER_SETTINGS.textAlign),
    lineHeight: clampNumber(input.lineHeight, 1.1, 2.2, DEFAULT_READER_SETTINGS.lineHeight),
    paragraphSpacing: clampNumber(
      input.paragraphSpacing,
      0,
      2.4,
      DEFAULT_READER_SETTINGS.paragraphSpacing,
    ),
  };
}

export function applyReaderSettings(rendition: Rendition, settings: ReaderSettings) {
  rendition.flow?.(settings.flow === "continuous" ? "scrolled-doc" : "paginated");
  rendition.spread?.(settings.spread === "double" ? "auto" : "none");
  rendition.themes?.font?.(settings.fontFamily);
  rendition.themes?.fontSize?.(`${settings.fontSize}px`);
  rendition.themes?.default({
    "*": {
      "box-sizing": "border-box !important",
      "font-family": `${settings.fontFamily} !important`,
      "font-size": `${settings.fontSize}px !important`,
      "line-height": `${settings.lineHeight} !important`,
    },
    html: {
      background: `${themePalette(settings.theme).background} !important`,
      "margin": "0 !important",
      "padding": "0 !important",
      "box-sizing": "border-box !important",
    },
    body: {
      color: `${themePalette(settings.theme).ink} !important`,
      background: `${themePalette(settings.theme).background} !important`,
      "font-family": `${settings.fontFamily} !important`,
      "font-size": `${settings.fontSize}px !important`,
      "line-height": `${settings.lineHeight} !important`,
      "text-align": `${settings.textAlign} !important`,
      "box-sizing": "border-box !important",
      "margin": "0 !important",
    },
    p: {
      "margin-bottom": `${settings.paragraphSpacing}em !important`,
      "line-height": `${settings.lineHeight} !important`,
      "text-align": `${settings.textAlign} !important`,
      "max-width": "100% !important",
      "overflow-wrap": "break-word !important",
    },
    img: {
      "max-width": "100% !important",
      "height": "auto !important",
    },
    svg: {
      "max-width": "100% !important",
      "height": "auto !important",
    },
    video: {
      "max-width": "100% !important",
      "height": "auto !important",
    },
    a: {
      color: themePalette(settings.theme).link,
    },
  });
}

export function readerShellColors(theme: ReaderTheme) {
  return themePalette(theme);
}

export function pageStatsFromLocation(
  location: EpubLocation,
  epub: EpubBook | null,
  cfi: string,
): ReaderPageStats {
  const totalLocations = Math.max(0, epub?.locations?.length?.() ?? 0);
  const locationIndex = Math.max(0, epub?.locations?.locationFromCfi?.(cfi) ?? 0);

  if (totalLocations > 0) {
    const currentPage = Math.min(totalLocations, locationIndex + 1);
    return {
      currentPage,
      totalPages: totalLocations,
      remainingPages: Math.max(0, totalLocations - currentPage),
    };
  }

  const currentPage = Math.max(1, location.start?.displayed?.page ?? 1);
  const totalPages = Math.max(currentPage, location.start?.displayed?.total ?? currentPage);
  return {
    currentPage,
    totalPages,
    remainingPages: Math.max(0, totalPages - currentPage),
  };
}

export function locatorFromCfi(
  bookId: string,
  cfi: string,
  location: EpubLocation,
  epub: EpubBook,
): ReadingLocator {
  const spineIndex = Math.max(0, location.start?.index ?? 0);
  const progression = clampUnit(location.start?.percentage ?? 0);
  const totalProgression = clampUnit(
    epub.locations?.percentageFromCfi?.(cfi) ?? progression,
  );

  return {
    bookId,
    href: location.start?.href ?? "",
    spineIndex,
    progression,
    totalProgression,
    cfi,
  };
}

function clampUnit(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function themePalette(theme: ReaderTheme) {
  if (theme === "dark") {
    return { background: "#181715", ink: "#e7e2d8", link: "#d7b46a" };
  }
  if (theme === "oled") {
    return { background: "#000000", ink: "#e8e8e8", link: "#f4c45f" };
  }
  if (theme === "light") {
    return { background: "#fbfaf7", ink: "#1f2933", link: "#8a5a12" };
  }
  return { background: "#f4ead8", ink: "#2d251b", link: "#8a5a12" };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}
