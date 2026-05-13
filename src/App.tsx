import { LibraryPage } from "./features/library/LibraryPage";
import { Suspense, lazy, useState } from "react";

const ReaderPage = lazy(() =>
  import("./features/reader/ReaderPage").then((module) => ({
    default: module.ReaderPage,
  })),
);

export function App() {
  const [openBookId, setOpenBookId] = useState<string | null>(null);

  if (openBookId) {
    return (
      <Suspense
        fallback={
          <div className="grid h-screen place-items-center bg-[#151412] text-neutral-100">
            Abrindo livro...
          </div>
        }
      >
        <ReaderPage bookId={openBookId} onBack={() => setOpenBookId(null)} />
      </Suspense>
    );
  }

  return <LibraryPage onOpenBook={(book) => setOpenBookId(book.id)} />;
}
