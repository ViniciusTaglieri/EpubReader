import { describe, expect, it } from "vitest";
import {
  DEFAULT_READER_SETTINGS,
  normalizeReaderSettings,
  pageStatsFromLocation,
  type EpubBook,
} from "./epubCfiReader";

describe("epubCfiReader", () => {
  it("normalizes persisted reader settings", () => {
    const settings = normalizeReaderSettings({
      fontSize: 80,
      fontFamily: "",
      theme: "oled",
      margin: -4,
      flow: "continuous",
      spread: "double",
      textAlign: "justify",
      lineHeight: 9,
      paragraphSpacing: 4,
    });

    expect(settings).toEqual({
      ...DEFAULT_READER_SETTINGS,
      fontSize: 34,
      theme: "oled",
      margin: 0,
      flow: "continuous",
      spread: "double",
      textAlign: "justify",
      lineHeight: 2.2,
      paragraphSpacing: 2.4,
    });
  });

  it("derives page stats from generated epub locations", () => {
    const epub = {
      locations: {
        length: () => 20,
        locationFromCfi: () => 6,
      },
    } as unknown as EpubBook;

    expect(pageStatsFromLocation({}, epub, "epubcfi(/6/2!/4/2/2)")).toEqual({
      currentPage: 7,
      totalPages: 20,
      remainingPages: 13,
    });
  });
});
