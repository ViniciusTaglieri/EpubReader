import type { ReadingLocator } from "../../shared/types/books";

export function clampProgression(locator: ReadingLocator): ReadingLocator {
  return {
    ...locator,
    progression: Math.min(1, Math.max(0, locator.progression)),
    totalProgression: Math.min(1, Math.max(0, locator.totalProgression))
  };
}
