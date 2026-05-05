export type ReadingStatus = "unread" | "reading" | "finished";

export type BookDto = {
  id: string;
  title: string;
  subtitle?: string | null;
  author?: string | null;
  publisher?: string | null;
  language?: string | null;
  description?: string | null;
  identifier?: string | null;
  fileHash: string;
  filePath: string;
  coverPath?: string | null;
  importedAt: string;
  updatedAt: string;
  lastOpenedAt?: string | null;
  readingStatus: ReadingStatus;
  totalProgression: number;
};

export type BookDetailDto = BookDto & {
  manifest?: EpubManifestDto | null;
};

export type TocItemDto = {
  id: string;
  label: string;
  href: string;
  children: TocItemDto[];
};

export type SpineItemDto = {
  idref: string;
  href: string;
  mediaType: string;
  title?: string | null;
};

export type EpubManifestDto = {
  bookId: string;
  title: string;
  author?: string | null;
  spine: SpineItemDto[];
  toc: TocItemDto[];
};

export type ResourceDto = {
  href: string;
  mediaType: string;
  contents: string;
};

export type ReadingLocator = {
  bookId: string;
  href: string;
  spineIndex: number;
  progression: number;
  totalProgression: number;
  cfi?: string;
  cssSelector?: string;
  textSnippet?: string;
  displayPageIndex?: number;
  displayPageCount?: number;
};

export type ReadingSettingsDto = {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  margin: number;
  paragraphSpacing: number;
  theme: "light" | "dark" | "sepia" | "oled";
  textAlign: "left" | "justify";
  hyphenationEnabled: boolean;
  ligaturesEnabled: boolean;
};
