import type { ReadingLocator, SpineItemDto } from "../../shared/types/books";

type BuildReadingLocatorInput = {
  bookId: string;
  spine: SpineItemDto[];
  spineIndex?: number;
  pageIndex: number;
  pageCount: number;
  chapterPageStarts: number[];
};

export function buildReadingLocator({
  bookId,
  spine,
  spineIndex: explicitSpineIndex,
  pageIndex,
  pageCount,
  chapterPageStarts,
}: BuildReadingLocatorInput): ReadingLocator | null {
  const spineIndex =
    explicitSpineIndex ?? currentSpineIndex(pageIndex, chapterPageStarts, spine.length);
  const spineItem = spine[spineIndex];
  if (!spineItem) return null;

  const chapterStats = chapterPageStats(
    pageIndex,
    pageCount,
    chapterPageStarts,
    spineIndex,
  );

  return {
    bookId,
    href: spineItem.href,
    spineIndex,
    progression: chapterStats.progression,
    totalProgression:
      explicitSpineIndex === undefined
        ? pageCount <= 1
          ? 0
          : pageIndex / Math.max(1, pageCount - 1)
        : totalProgressionForSpine(
            spineIndex,
            spine.length,
            chapterStats.progression,
          ),
    displayPageIndex: pageIndex,
    displayPageCount: pageCount,
  };
}

export function totalProgressionForSpine(
  spineIndex: number,
  spineCount: number,
  progression: number,
) {
  if (spineCount <= 1) return clampUnit(progression);
  const safeSpineIndex = Math.min(spineCount - 1, Math.max(0, spineIndex));
  const safeProgression = clampUnit(progression);
  return (safeSpineIndex + safeProgression) / spineCount;
}

export function resolveInitialPage(
  savedLocator: ReadingLocator | null,
  measuredPageCount: number,
  measuredChapterStarts: number[],
  currentPageIndex: number,
) {
  const maxPage = Math.max(0, measuredPageCount - 1);
  if (!savedLocator) return clampPageIndex(currentPageIndex, maxPage);
  if (
    !Number.isFinite(savedLocator.progression) ||
    !Number.isFinite(savedLocator.totalProgression)
  ) {
    return clampPageIndex(currentPageIndex, maxPage);
  }

  if (
    savedLocator.displayPageIndex !== undefined &&
    savedLocator.displayPageCount === measuredPageCount
  ) {
    return clampPageIndex(savedLocator.displayPageIndex, maxPage);
  }

  return clampPageIndex(
    Math.round(savedLocator.totalProgression * maxPage),
    maxPage,
  );
}

export function resolveLazyInitialPage({
  savedLocator,
  measuredPageCount,
  activeSpineIndex,
  currentPageIndex,
}: {
  savedLocator: ReadingLocator | null;
  measuredPageCount: number;
  activeSpineIndex: number;
  currentPageIndex: number;
}) {
  const maxPage = Math.max(0, measuredPageCount - 1);
  if (!savedLocator || savedLocator.spineIndex !== activeSpineIndex) {
    return clampPageIndex(currentPageIndex, maxPage);
  }
  if (!Number.isFinite(savedLocator.progression)) {
    return clampPageIndex(currentPageIndex, maxPage);
  }
  if (
    savedLocator.displayPageIndex !== undefined &&
    savedLocator.displayPageCount === measuredPageCount
  ) {
    return clampPageIndex(savedLocator.displayPageIndex, maxPage);
  }
  return clampPageIndex(
    Math.round(savedLocator.progression * maxPage),
    maxPage,
  );
}

export function bookPageStats({
  spineIndex,
  pageIndex,
  pageCount,
  spineCount,
  measuredSpinePageCounts,
  spineTextLengths = [],
}: {
  spineIndex: number;
  pageIndex: number;
  pageCount: number;
  spineCount: number;
  measuredSpinePageCounts: Record<number, number>;
  spineTextLengths?: number[];
}) {
  const estimatedPageCounts = estimateBookPageCounts({
    activeSpineIndex: spineIndex,
    activePageCount: pageCount,
    spineCount,
    measuredSpinePageCounts,
    spineTextLengths,
  });

  let currentPageStart = 0;
  for (let index = 0; index < spineIndex; index += 1) {
    currentPageStart += estimatedPageCounts[index] ?? 1;
  }

  return {
    currentPage: currentPageStart + clampPageIndex(pageIndex, pageCount - 1) + 1,
    totalPages: Math.max(
      1,
      estimatedPageCounts.reduce((total, value) => total + value, 0),
    ),
  };
}

export function resolveBookPageTarget({
  targetPageIndex,
  activeSpineIndex,
  activePageCount,
  spineCount,
  measuredSpinePageCounts,
  spineTextLengths = [],
}: {
  targetPageIndex: number;
  activeSpineIndex: number;
  activePageCount: number;
  spineCount: number;
  measuredSpinePageCounts: Record<number, number>;
  spineTextLengths?: number[];
}) {
  const estimatedPageCounts = estimateBookPageCounts({
    activeSpineIndex,
    activePageCount,
    spineCount,
    measuredSpinePageCounts,
    spineTextLengths,
  });
  const totalPages = Math.max(
    1,
    estimatedPageCounts.reduce((total, value) => total + value, 0),
  );
  let remaining = clampPageIndex(targetPageIndex, totalPages - 1);

  for (let index = 0; index < estimatedPageCounts.length; index += 1) {
    const count = Math.max(1, estimatedPageCounts[index] ?? 1);
    if (remaining < count) {
      return {
        spineIndex: index,
        pageIndex: remaining,
        progression: count <= 1 ? 0 : remaining / Math.max(1, count - 1),
      };
    }
    remaining -= count;
  }

  const lastIndex = Math.max(0, estimatedPageCounts.length - 1);
  const lastCount = Math.max(1, estimatedPageCounts[lastIndex] ?? 1);
  return {
    spineIndex: lastIndex,
    pageIndex: lastCount - 1,
    progression: 1,
  };
}

function estimateBookPageCounts({
  activeSpineIndex,
  activePageCount,
  spineCount,
  measuredSpinePageCounts,
  spineTextLengths,
}: {
  activeSpineIndex: number;
  activePageCount: number;
  spineCount: number;
  measuredSpinePageCounts: Record<number, number>;
  spineTextLengths: number[];
}) {
  const safeSpineCount = Math.max(1, spineCount);
  const knownCounts = {
    ...measuredSpinePageCounts,
    [activeSpineIndex]: activePageCount,
  };
  const activeTextLength = Math.max(1, spineTextLengths[activeSpineIndex] ?? 0);
  const activeDensity = Math.max(1, activePageCount) / activeTextLength;
  const knownValues = Object.values(knownCounts).filter((value) => value > 0);
  const fallbackAverage = knownValues.length
    ? Math.max(
        1,
        Math.round(
          knownValues.reduce((total, value) => total + value, 0) /
            knownValues.length,
        ),
      )
    : Math.max(1, activePageCount);

  const estimated: number[] = [];
  for (let index = 0; index < safeSpineCount; index += 1) {
    if (knownCounts[index]) {
      estimated[index] = Math.max(1, knownCounts[index]);
      continue;
    }
    const textLength = spineTextLengths[index] ?? 0;
    estimated[index] =
      textLength > 0
        ? Math.max(1, Math.round(textLength * activeDensity))
        : fallbackAverage;
  }
  return estimated;
}

export function shouldSaveReadingPosition(
  locator: ReadingLocator,
  hasUserNavigated: boolean,
) {
  return (
    hasUserNavigated &&
    Number.isFinite(locator.progression) &&
    Number.isFinite(locator.totalProgression)
  );
}

export function shouldDeferSavedPositionRestore(
  locator: ReadingLocator,
  measuredPageCount: number,
) {
  const savedPageIndex = locator.displayPageIndex ?? 0;
  return (
    measuredPageCount <= 1 &&
    (locator.totalProgression > 0 || savedPageIndex > 0)
  );
}

export function clampPageIndex(pageIndex: number, maxPage: number) {
  if (!Number.isFinite(pageIndex)) return 0;
  return Math.min(maxPage, Math.max(0, pageIndex));
}

function clampUnit(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function currentSpineIndex(
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

type ChapterPageStats = {
  chapterPageIndex: number;
  chapterPageCount: number;
  chapterRemaining: number;
  progression: number;
};

export function chapterPageStats(
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
