import { describe, expect, it } from "vitest";
import { DEFAULT_READER_SETTINGS, resetReaderSettings, themeColors } from "./readerSettings";

describe("readerSettings", () => {
  it("enables the requested rendition options by default", () => {
    expect(DEFAULT_READER_SETTINGS.theme).toBe("sepia");
    expect(DEFAULT_READER_SETTINGS.textAlign).toBe("left");
    expect(DEFAULT_READER_SETTINGS.hyphenationEnabled).toBe(true);
    expect(DEFAULT_READER_SETTINGS.ligaturesEnabled).toBe(true);
    expect(DEFAULT_READER_SETTINGS.readingMode).toBe("paginated");
    expect(DEFAULT_READER_SETTINGS.spreadMode).toBe("single");
  });

  it("resolves theme colors for light, dark, sepia and oled", () => {
    expect(themeColors("light")).toEqual({ background: "#f7f3ea", ink: "#171717" });
    expect(themeColors("dark")).toEqual({ background: "#1d1f21", ink: "#e8e4dc" });
    expect(themeColors("sepia")).toEqual({ background: "#f3e2bf", ink: "#21170c" });
    expect(themeColors("oled")).toEqual({ background: "#000000", ink: "#f1f1f1" });
  });

  it("creates a fresh copy when resetting rendition settings", () => {
    const firstReset = resetReaderSettings();
    const secondReset = resetReaderSettings();

    expect(firstReset).toEqual(DEFAULT_READER_SETTINGS);
    expect(firstReset).not.toBe(DEFAULT_READER_SETTINGS);
    expect(firstReset).not.toBe(secondReset);
  });
});
