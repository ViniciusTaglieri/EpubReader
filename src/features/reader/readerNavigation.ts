import type { EpubManifestDto, ReadingLocator } from "../../shared/types/books";

export type SpinePosition = {
  href: string;
  spineIndex: number;
};

export function resolveInitialSpine(
  manifest: EpubManifestDto,
  progress: ReadingLocator | null
): SpinePosition {
  if (progress) {
    const matchingIndex = manifest.spine.findIndex((item) => item.href === progress.href);
    if (matchingIndex >= 0) {
      return {
        href: manifest.spine[matchingIndex].href,
        spineIndex: matchingIndex
      };
    }
  }

  const first = manifest.spine[0];
  return {
    href: first?.href ?? "",
    spineIndex: first ? 0 : -1
  };
}

export function resolveTotalProgression(
  spineIndex: number,
  chapterProgression: number,
  spineCount: number
): number {
  if (spineCount <= 0) return 0;
  const clampedChapterProgression = Math.min(1, Math.max(0, chapterProgression));
  const value = (spineIndex + clampedChapterProgression) / spineCount;
  return Math.min(1, Math.max(0, value));
}
