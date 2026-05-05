import { LibraryPage } from "./features/library/LibraryPage";
import { ReaderPage } from "./features/reader/ReaderPage";
import { useState } from "react";

export function App() {
  const [openBookId, setOpenBookId] = useState<string | null>(null);

  if (openBookId) {
    return <ReaderPage bookId={openBookId} onBack={() => setOpenBookId(null)} />;
  }

  return <LibraryPage onOpenBook={(book) => setOpenBookId(book.id)} />;
}
