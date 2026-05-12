import type { ReadingLocator } from "../../shared/types/books";

export type EpubBook = {
  open: (data: ArrayBuffer, type: "binary") => Promise<void>;
  renderTo: (element: HTMLElement, options: Record<string, unknown>) => Rendition;
  destroy?: () => void;
  locations?: {
    percentageFromCfi?: (cfi: string) => number;
  };
};

export type Rendition = {
  display: (target?: string) => Promise<unknown>;
  prev: () => Promise<unknown>;
  next: () => Promise<unknown>;
  on: (event: "relocated", handler: (location: EpubLocation) => void) => void;
  destroy?: () => void;
};

export type EpubLocation = {
  start?: {
    cfi?: string;
    href?: string;
    index?: number;
    percentage?: number;
  };
};

export function numbersToArrayBuffer(bytes: number[]) {
  return new Uint8Array(bytes).buffer;
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
