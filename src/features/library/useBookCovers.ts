import { useEffect, useRef, useState } from "react";
import { commands } from "../../shared/tauri/commands";
import type { BookDto } from "../../shared/types/books";

export type CoverMap = Record<string, string>;

export function useBookCovers(books: BookDto[]) {
  const [covers, setCovers] = useState<CoverMap>({});
  const coversRef = useRef<CoverMap>({});

  useEffect(() => {
    for (const book of books) {
      if (!book.coverPath || coversRef.current[book.id]) continue;
      void commands.getCover(book.id).then((bytes) => {
        if (!bytes.length) return;
        const blob = new Blob([new Uint8Array(bytes)], { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        setCovers((current) => {
          if (current[book.id]) {
            URL.revokeObjectURL(url);
            return current;
          }
          return {
            ...current,
            [book.id]: url,
          };
        });
      });
    }
  }, [books]);

  useEffect(() => {
    coversRef.current = covers;
  }, [covers]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(coversRef.current)) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  return covers;
}
