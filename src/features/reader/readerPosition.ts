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
}: {
  spineIndex: number;
  pageIndex: number;
  pageCount: number;
  spineCount: number;
  measuredSpinePageCounts: Record<number, number>;
}) {
  const safeSpineCount = Math.max(1, spineCount);
  const knownCounts = {
    ...measuredSpinePageCounts,
    [spineIndex]: pageCount,
  };
  const knownValues = Object.values(knownCounts).filter((value) => value > 0);
  const average =
    knownValues.length > 0
      ? Math.max(
          1,
          Math.round(
            knownValues.reduce((total, value) => total + value, 0) /
              knownValues.length,
          ),
        )
      : Math.max(1, pageCount);

  let currentPageStart = 0;
  let totalPageCount = 0;
  for (let index = 0; index < safeSpineCount; index += 1) {
    const count = knownCounts[index] ?? average;
    if (index < spineIndex) {
      currentPageStart += count;
    }
    totalPageCount += count;
  }

  return {
    currentPage: currentPageStart + clampPageIndex(pageIndex, pageCount - 1) + 1,
    totalPages: Math.max(1, totalPageCount),
  };
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
