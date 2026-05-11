import { useCallback, useEffect, useState } from "react";
import { commands, errorMessage } from "../../shared/tauri/commands";
import type {
  EpubManifestDto,
  ReadingLocator,
  ResourceDto,
} from "../../shared/types/books";
import type { AppMessageData } from "../../shared/components/AppMessage";

type UseReaderBookState = {
  manifest: EpubManifestDto | null;
  resource: ResourceDto | null;
  savedLocator: ReadingLocator | null;
  spineIndex: number;
  isLoading: boolean;
  message: AppMessageData | null;
};

export function useReaderBook(bookId: string) {
  const [state, setState] = useState<UseReaderBookState>({
    manifest: null,
    resource: null,
    savedLocator: null,
    spineIndex: 0,
    isLoading: true,
    message: null,
  });

  const loadSpine = useCallback(
    async (manifest: EpubManifestDto, nextSpineIndex: number) => {
      const item = manifest.spine[nextSpineIndex];
      if (!item) return;
      setState((current) => ({ ...current, isLoading: true }));
      try {
        const resource = await commands.getSpineResource(bookId, item.href);
        setState((current) => ({
          ...current,
          resource: wrapSpineResource(resource, nextSpineIndex),
          spineIndex: nextSpineIndex,
          isLoading: false,
          message: null,
        }));
      } catch (error) {
        setState((current) => ({
          ...current,
          isLoading: false,
          message: { text: errorMessage(error), variant: "error" },
        }));
      }
    },
    [bookId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadBook() {
      setState((current) => ({ ...current, isLoading: true, message: null }));
      try {
        const [manifest, progress] = await Promise.all([
          commands.getBookManifest(bookId),
          commands.getProgress(bookId),
        ]);
        if (cancelled) return;
        const spineIndex = resolveInitialSpineIndex(manifest, progress);
        const item = manifest.spine[spineIndex];
        if (!item) {
          setState({
            manifest,
            resource: null,
            savedLocator: progress ?? null,
            spineIndex: 0,
            isLoading: false,
            message: { text: "Livro sem spine de leitura.", variant: "error" },
          });
          return;
        }
        const resource = await commands.getSpineResource(bookId, item.href);
        if (cancelled) return;
        setState({
          manifest,
          resource: wrapSpineResource(resource, spineIndex),
          savedLocator: progress ?? null,
          spineIndex,
          isLoading: false,
          message: null,
        });
      } catch (error) {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            isLoading: false,
            message: { text: errorMessage(error), variant: "error" },
          }));
        }
      }
    }

    void loadBook();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  const goToSpine = useCallback(
    async (nextSpineIndex: number) => {
      if (!state.manifest) return;
      await loadSpine(state.manifest, nextSpineIndex);
    },
    [loadSpine, state.manifest],
  );

  return {
    ...state,
    setMessage: (message: AppMessageData | null) =>
      setState((current) => ({ ...current, message })),
    goToSpine,
  };
}

function resolveInitialSpineIndex(
  manifest: EpubManifestDto,
  progress: ReadingLocator | null,
) {
  if (!progress) return 0;
  const byHref = manifest.spine.findIndex((item) => item.href === progress.href);
  if (byHref >= 0) return byHref;
  if (progress.spineIndex >= 0 && progress.spineIndex < manifest.spine.length) {
    return progress.spineIndex;
  }
  return 0;
}

function wrapSpineResource(resource: ResourceDto, spineIndex: number): ResourceDto {
  return {
    ...resource,
    contents: `<section class="reader-spine-section" data-reader-spine-index="${spineIndex}" data-reader-href="${escapeAttr(resource.href)}">${resource.contents}</section>`,
  };
}

function escapeAttr(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
