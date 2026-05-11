import { describe, expect, it } from "vitest";
import type { ReadingLocator, SpineItemDto } from "../../shared/types/books";
import {
  buildReadingLocator,
  bookPageStats,
  clampPageIndex,
  resolveBookPageTarget,
  resolveLazyInitialPage,
  resolveInitialPage,
  shouldDeferSavedPositionRestore,
  shouldSaveReadingPosition,
  totalProgressionForSpine,
} from "./readerPosition";

const spine: SpineItemDto[] = [
  {
    idref: "c1",
    href: "OPS/chapter-1.xhtml",
    mediaType: "application/xhtml+xml",
  },
  {
    idref: "c2",
    href: "OPS/chapter-2.xhtml",
    mediaType: "application/xhtml+xml",
  },
  {
    idref: "c3",
    href: "OPS/chapter-3.xhtml",
    mediaType: "application/xhtml+xml",
  },
];

const savedLocator: ReadingLocator = {
  bookId: "book-1",
  href: "OPS/chapter-2.xhtml",
  spineIndex: 1,
  progression: 0.5,
  totalProgression: 0.6,
  displayPageIndex: 42,
  displayPageCount: 100,
};

describe("readerPosition", () => {
  it("builds a persistent locator for the current visual page", () => {
    const locator = buildReadingLocator({
      bookId: "book-1",
      spine,
      pageIndex: 30,
      pageCount: 60,
      chapterPageStarts: [0, 10, 50],
    });

    expect(locator).toMatchObject({
      bookId: "book-1",
      href: "OPS/chapter-2.xhtml",
      spineIndex: 1,
      displayPageIndex: 30,
      displayPageCount: 60,
    });
    expect(locator?.progression).toBeCloseTo(20 / 39);
    expect(locator?.totalProgression).toBeCloseTo(30 / 59);
  });

  it("restores the exact visual page when the saved layout still matches", () => {
    expect(resolveInitialPage(savedLocator, 100, [0, 20, 70], 0)).toBe(42);
  });

  it("builds a locator from an explicit active spine for lazy resources", () => {
    const locator = buildReadingLocator({
      bookId: "book-1",
      spine,
      spineIndex: 1,
      pageIndex: 4,
      pageCount: 9,
      chapterPageStarts: [0],
    });

    expect(locator).toMatchObject({
      bookId: "book-1",
      href: "OPS/chapter-2.xhtml",
      spineIndex: 1,
      displayPageIndex: 4,
      displayPageCount: 9,
    });
    expect(locator?.progression).toBeCloseTo(0.5);
    expect(locator?.totalProgression).toBeCloseTo((1 + 0.5) / 3);
  });

  it("calculates total progression from active spine and chapter progression", () => {
    expect(totalProgressionForSpine(0, 4, 0)).toBe(0);
    expect(totalProgressionForSpine(2, 4, 0.5)).toBeCloseTo(0.625);
    expect(totalProgressionForSpine(3, 4, 1)).toBe(1);
  });

  it("restores by total progression when the visual page count changed", () => {
    expect(resolveInitialPage(savedLocator, 60, [0, 10, 50], 0)).toBe(35);
  });

  it("restores lazy chapter position by exact display page when layout matches", () => {
    expect(
      resolveLazyInitialPage({
        savedLocator,
        measuredPageCount: 100,
        activeSpineIndex: 1,
        currentPageIndex: 0,
      }),
    ).toBe(42);
  });

  it("restores lazy chapter position by chapter progression when layout changed", () => {
    expect(
      resolveLazyInitialPage({
        savedLocator,
        measuredPageCount: 41,
        activeSpineIndex: 1,
        currentPageIndex: 0,
      }),
    ).toBe(20);
  });

  it("keeps current lazy page when saved locator belongs to another spine", () => {
    expect(
      resolveLazyInitialPage({
        savedLocator,
        measuredPageCount: 41,
        activeSpineIndex: 2,
        currentPageIndex: 7,
      }),
    ).toBe(7);
  });

  it("calculates visible book page stats from measured spine pages", () => {
    expect(
      bookPageStats({
        spineIndex: 1,
        pageIndex: 4,
        pageCount: 10,
        spineCount: 3,
        measuredSpinePageCounts: { 0: 8, 1: 10 },
      }),
    ).toEqual({ currentPage: 13, totalPages: 27 });
  });

  it("estimates visible book pages from spine text lengths without loading all content", () => {
    expect(
      bookPageStats({
        spineIndex: 1,
        pageIndex: 4,
        pageCount: 10,
        spineCount: 3,
        measuredSpinePageCounts: {},
        spineTextLengths: [500, 1000, 1500],
      }),
    ).toEqual({ currentPage: 10, totalPages: 30 });
  });

  it("maps a whole-book slider page to the target spine and local page", () => {
    expect(
      resolveBookPageTarget({
        targetPageIndex: 22,
        activeSpineIndex: 1,
        activePageCount: 10,
        spineCount: 3,
        measuredSpinePageCounts: {},
        spineTextLengths: [500, 1000, 1500],
      }),
    ).toEqual({ spineIndex: 2, pageIndex: 7, progression: 0.5 });
  });

  it("uses total progression when stale chapter metadata points near the end", () => {
    expect(
      resolveInitialPage(
        {
          ...savedLocator,
          spineIndex: 26,
          progression: 0.9,
          totalProgression: 29 / 174,
          displayPageIndex: 29,
          displayPageCount: 175,
        },
        108,
        [0, 3, 8, 13, 18, 23, 29, 35, 41, 47, 52, 58, 64, 70, 76, 82, 88, 93, 99, 105],
        0,
      ),
    ).toBe(18);
  });

  it("falls back to total progression when the saved spine is stale", () => {
    expect(
      resolveInitialPage(
        { ...savedLocator, spineIndex: 9, totalProgression: 0.25 },
        60,
        [0, 10, 50],
        0,
      ),
    ).toBe(15);
  });

  it("ignores saved locators with invalid numeric progression", () => {
    expect(
      resolveInitialPage(
        { ...savedLocator, progression: Number.NaN, totalProgression: Number.NaN },
        60,
        [0, 10, 50],
        12,
      ),
    ).toBe(12);
  });

  it("keeps the current page clamped when there is no saved locator", () => {
    expect(resolveInitialPage(null, 8, [0, 4], 20)).toBe(7);
  });

  it("waits to restore non-zero progress until the book layout has real pages", () => {
    expect(shouldDeferSavedPositionRestore(savedLocator, 1)).toBe(true);
    expect(shouldDeferSavedPositionRestore(savedLocator, 60)).toBe(false);
    expect(
      shouldDeferSavedPositionRestore(
        { ...savedLocator, totalProgression: 0, displayPageIndex: 0 },
        1,
      ),
    ).toBe(false);
  });

  it("saves only valid positions after user navigation", () => {
    expect(shouldSaveReadingPosition(savedLocator, false)).toBe(false);
    expect(shouldSaveReadingPosition(savedLocator, true)).toBe(true);
    expect(
      shouldSaveReadingPosition(
        { ...savedLocator, totalProgression: Number.NaN },
        true,
      ),
    ).toBe(false);
  });

  it("clamps visual page indexes to the measured layout", () => {
    expect(clampPageIndex(-5, 10)).toBe(0);
    expect(clampPageIndex(25, 10)).toBe(10);
    expect(clampPageIndex(4, 10)).toBe(4);
  });
});
