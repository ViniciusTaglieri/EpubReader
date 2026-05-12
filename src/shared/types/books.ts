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
  publishedAt?: string | null;
  subjects: string[];
  fileHash: string;
  filePath: string;
  coverPath?: string | null;
  importedAt: string;
  updatedAt: string;
  lastOpenedAt?: string | null;
  readingStatus: ReadingStatus;
  totalProgression: number;
  textLength: number;
  isFavorite: boolean;
};

export type CollectionDto = {
  id: string;
  name: string;
  createdAt: string;
  bookIds: string[];
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
  textLength?: number;
};

export type EpubManifestDto = {
  bookId: string;
  title: string;
  author?: string | null;
  spine: SpineItemDto[];
  toc: TocItemDto[];
};

export type ReadingLocator = {
  bookId: string;
  href: string;
  spineIndex: number;
  progression: number;
  totalProgression: number;
  cfi: string;
  cssSelector?: string;
  textSnippet?: string;
  displayPageIndex?: number;
  displayPageCount?: number;
};

export type BookmarkDto = {
  id: string;
  bookId: string;
  href: string;
  spineIndex: number;
  progression: number;
  totalProgression: number;
  label?: string | null;
  textSnippet?: string | null;
  createdAt: string;
};

export type HighlightRangeDto = {
  locator: ReadingLocator;
  selectedText: string;
  textSnippet?: string | null;
  cfi?: string | null;
  cssSelector?: string | null;
  domRangeJson?: string | null;
};

export type HighlightDto = {
  id: string;
  bookId: string;
  href: string;
  spineIndex: number;
  progression: number;
  totalProgression: number;
  selectedText: string;
  color: string;
  note?: string | null;
  cfi?: string | null;
  cssSelector?: string | null;
  domRangeJson?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SearchResultDto = {
  href: string;
  spineIndex: number;
  progression: number;
  totalProgression: number;
  snippet: string;
};
