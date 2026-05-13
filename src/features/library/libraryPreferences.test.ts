import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIBRARY_PREFERENCES,
  normalizeLibraryPreferences,
} from "./libraryPreferences";

describe("libraryPreferences", () => {
  it("normalizes invalid persisted preferences", () => {
    expect(
      normalizeLibraryPreferences({
        theme: "purple" as never,
        density: "huge" as never,
        wheelPageTurn: "yes" as never,
      }),
    ).toEqual(DEFAULT_LIBRARY_PREFERENCES);
  });

  it("keeps valid persisted preferences", () => {
    expect(
      normalizeLibraryPreferences({
        theme: "light",
        density: "compact",
        wheelPageTurn: false,
      }),
    ).toEqual({
      theme: "light",
      density: "compact",
      wheelPageTurn: false,
    });
  });
});
