import { describe, expect, it } from "vitest";
import {
  DEFAULT_READER_SETTINGS,
  readerSettingsFromDto,
  resetReaderSettings,
  themeColors,
} from "./readerSettings";

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

  it("maps persisted settings and preserves layout defaults", () => {
    const settings = readerSettingsFromDto({
      fontFamily: "Arial",
      fontSize: 24,
      lineHeight: 1.9,
      margin: 96,
      paragraphSpacing: 1.25,
      theme: "dark",
      textAlign: "justify",
      hyphenationEnabled: false,
      ligaturesEnabled: true,
    });

    expect(settings).toMatchObject({
      fontFamily: "Arial",
      fontSize: 24,
      lineHeight: 1.9,
      margin: 96,
      paragraphSpacing: 1.25,
      theme: "dark",
      textAlign: "justify",
      hyphenationEnabled: false,
      ligaturesEnabled: true,
      readingMode: DEFAULT_READER_SETTINGS.readingMode,
      spreadMode: DEFAULT_READER_SETTINGS.spreadMode,
    });
  });
});
