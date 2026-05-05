export type DialogSelection = string | string[] | null;

type DroppedFile = {
  name?: string;
  path?: string;
};

export function normalizePickedEpubPaths(selection: DialogSelection): string[] {
  const paths = Array.isArray(selection) ? selection : selection ? [selection] : [];
  return paths.filter(isEpubPath);
}

export function epubPathsFromDrop(files: Iterable<DroppedFile>): string[] {
  return Array.from(files)
    .map((file) => file.path)
    .filter((path): path is string => Boolean(path && isEpubPath(path)));
}

export function epubPathsFromTauriDragDrop(event: { type: string; paths?: string[] }): string[] {
  if (event.type !== "drop") return [];
  return (event.paths ?? []).filter(isEpubPath);
}

function isEpubPath(path: string): boolean {
  return path.toLocaleLowerCase().endsWith(".epub");
}
