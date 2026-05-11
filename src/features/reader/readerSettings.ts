export type ReaderTheme = "light" | "dark" | "sepia" | "oled";
export type TextAlignMode = "left" | "justify";
export type ReadingMode = "paginated" | "scroll";
export type SpreadMode = "single" | "spread";

export type ReaderSettings = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  margin: number;
  paragraphSpacing: number;
  theme: ReaderTheme;
  textAlign: TextAlignMode;
  hyphenationEnabled: boolean;
  ligaturesEnabled: boolean;
  readingMode: ReadingMode;
  spreadMode: SpreadMode;
};

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontFamily: "Georgia, Times New Roman, serif",
  fontSize: 20,
  lineHeight: 1.68,
  margin: 72,
  paragraphSpacing: 1.05,
  theme: "sepia",
  textAlign: "left",
  hyphenationEnabled: true,
  ligaturesEnabled: true,
  readingMode: "paginated",
  spreadMode: "single"
};

export function resetReaderSettings(): ReaderSettings {
  return { ...DEFAULT_READER_SETTINGS };
}

export function readerSettingsFromDto(settings: {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  margin: number;
  paragraphSpacing: number;
  theme: string;
  textAlign: string;
  hyphenationEnabled: boolean;
  ligaturesEnabled: boolean;
}): ReaderSettings {
  return {
    ...DEFAULT_READER_SETTINGS,
    fontFamily: settings.fontFamily,
    fontSize: settings.fontSize,
    lineHeight: settings.lineHeight,
    margin: settings.margin,
    paragraphSpacing: settings.paragraphSpacing,
    theme: isReaderTheme(settings.theme)
      ? settings.theme
      : DEFAULT_READER_SETTINGS.theme,
    textAlign: isTextAlignMode(settings.textAlign)
      ? settings.textAlign
      : DEFAULT_READER_SETTINGS.textAlign,
    hyphenationEnabled: settings.hyphenationEnabled,
    ligaturesEnabled: settings.ligaturesEnabled,
  };
}

export function themeColors(theme: ReaderTheme): { background: string; ink: string } {
  if (theme === "light") {
    return { background: "#f7f3ea", ink: "#171717" };
  }
  if (theme === "dark") {
    return { background: "#1d1f21", ink: "#e8e4dc" };
  }
  if (theme === "oled") {
    return { background: "#000000", ink: "#f1f1f1" };
  }
  return { background: "#f3e2bf", ink: "#21170c" };
}

function isReaderTheme(value: string): value is ReaderTheme {
  return value === "light" || value === "dark" || value === "sepia" || value === "oled";
}

function isTextAlignMode(value: string): value is TextAlignMode {
  return value === "left" || value === "justify";
}
