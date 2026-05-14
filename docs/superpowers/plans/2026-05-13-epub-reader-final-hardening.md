# EPUB Reader Final Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the EPUB Reader for final release by fixing security, performance, reliability, UX, persistence, accessibility, test coverage, and production-readiness issues found in the review.

**Architecture:** Prioritize backend hardening first because EPUB files are untrusted input. Then make the reader safer/lighter, split large frontend components into focused hooks/components, normalize persistence and copy, and finish with tests/build/release checks. Each task is intended to be independently reviewable and shippable.

**Tech Stack:** Tauri 2, Rust, rusqlite, zip, roxmltree, React 19, TypeScript, Vite, epubjs, Tailwind CSS, Vitest.

---

## File Structure

Planned new files:

- `src-tauri/src/epub/validation.rs`: EPUB source and ZIP-entry validation limits.
- `src-tauri/src/epub/sanitize.rs`: HTML/XML content filtering rules for unsafe EPUB content.
- `src-tauri/src/epub/search_index.rs`: plain-text extraction/search-index builder or SQLite FTS adapter.
- `src/features/reader/useEpubReader.ts`: reader loading, rendition lifecycle, progress saving.
- `src/features/reader/components/TocPanel.tsx`: table-of-contents panel.
- `src/features/reader/components/ReaderSettingsPanel.tsx`: reader settings UI.
- `src/features/reader/components/ReaderFooter.tsx`: progress slider/footer.
- `src/features/library/useLibrary.ts`: library loading, import, delete, favorites, collections.
- `src/features/library/components/CollectionDialog.tsx`: create/edit collection dialog.
- `src/features/library/components/CollectionsOverview.tsx`: collection grid.
- `src/shared/copy/ptBr.ts`: centralized PT-BR interface copy and error text.
- `src/shared/components/ConfirmDialog.tsx`: accessible confirmation dialog.

Planned modified files:

- `src-tauri/src/commands/import.rs`
- `src-tauri/src/commands/reader.rs`
- `src-tauri/src/commands/books.rs`
- `src-tauri/src/db/mod.rs`
- `src-tauri/src/db/migrations.rs`
- `src-tauri/src/epub/mod.rs`
- `src-tauri/src/epub/resources.rs`
- `src-tauri/src/error.rs`
- `src/App.tsx`
- `src/features/reader/ReaderPage.tsx`
- `src/features/reader/epubCfiReader.ts`
- `src/features/library/LibraryPage.tsx`
- `src/features/library/BookCard.tsx`
- `src/features/library/LibraryToolbar.tsx`
- `src/features/library/LibrarySidebar.tsx`
- `src/shared/tauri/commands.ts`
- `src-tauri/tauri.conf.json`
- `package.json`

---

## Milestone 1: EPUB Import Security Hardening

### Task 1: Add EPUB Validation Limits

**Files:**
- Create: `src-tauri/src/epub/validation.rs`
- Modify: `src-tauri/src/epub/mod.rs`
- Modify: `src-tauri/src/commands/import.rs`
- Test: `src-tauri/src/epub/validation.rs`

- [ ] **Step 1: Write validation tests**

Add tests covering:

```rust
#[test]
fn validate_epub_source_rejects_non_file_or_empty_file() {
    let temp = tempfile::tempdir().expect("tempdir");
    let empty = temp.path().join("empty.epub");
    std::fs::write(&empty, b"").expect("write empty");

    let error = validate_epub_source(&empty).expect_err("reject empty epub");

    assert_eq!(error.code, "invalid_epub_size");
}

#[test]
fn validate_zip_entry_limits_rejects_too_many_entries() {
    let result = validate_zip_entry_limits(MAX_ZIP_ENTRIES + 1, 1, 1);

    let error = result.expect_err("reject too many entries");
    assert_eq!(error.code, "epub_too_many_files");
}

#[test]
fn validate_zip_entry_limits_rejects_large_uncompressed_total() {
    let result = validate_zip_entry_limits(10, MAX_EXTRACTED_BYTES + 1, 10);

    let error = result.expect_err("reject zip bomb");
    assert_eq!(error.code, "epub_expanded_too_large");
}
```

- [ ] **Step 2: Run Rust tests and confirm failure**

Run:

```powershell
cargo test epub::validation
```

Expected: compile failure because `validation` does not exist yet.

- [ ] **Step 3: Implement `validation.rs`**

Implement:

```rust
use crate::error::AppError;
use std::path::Path;

pub const MAX_EPUB_BYTES: u64 = 250 * 1024 * 1024;
pub const MAX_EXTRACTED_BYTES: u64 = 800 * 1024 * 1024;
pub const MAX_SINGLE_ENTRY_BYTES: u64 = 150 * 1024 * 1024;
pub const MAX_ZIP_ENTRIES: usize = 20_000;

pub fn validate_epub_source(path: &Path) -> Result<(), AppError> {
    let metadata = std::fs::metadata(path)?;
    if !metadata.is_file() {
        return Err(AppError::new("invalid_file", "Selecione um arquivo EPUB válido."));
    }
    if metadata.len() == 0 || metadata.len() > MAX_EPUB_BYTES {
        return Err(AppError::new(
            "invalid_epub_size",
            "O arquivo EPUB está vazio ou é grande demais para importação segura.",
        ));
    }
    Ok(())
}

pub fn validate_zip_entry_limits(
    entries: usize,
    total_uncompressed: u64,
    entry_uncompressed: u64,
) -> Result<(), AppError> {
    if entries > MAX_ZIP_ENTRIES {
        return Err(AppError::new(
            "epub_too_many_files",
            "O EPUB contém arquivos demais e não pode ser importado com segurança.",
        ));
    }
    if entry_uncompressed > MAX_SINGLE_ENTRY_BYTES {
        return Err(AppError::new(
            "epub_entry_too_large",
            "Um arquivo interno do EPUB é grande demais.",
        ));
    }
    if total_uncompressed > MAX_EXTRACTED_BYTES {
        return Err(AppError::new(
            "epub_expanded_too_large",
            "O EPUB expande para um tamanho grande demais.",
        ));
    }
    Ok(())
}
```

- [ ] **Step 4: Wire validation into import**

In `src-tauri/src/epub/mod.rs`:

```rust
pub mod validation;
```

In `src-tauri/src/commands/import.rs`, after extension validation and before hashing:

```rust
crate::epub::validation::validate_epub_source(&source)?;
```

- [ ] **Step 5: Run tests**

Run:

```powershell
cargo test
```

Expected: all Rust tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src-tauri/src/epub/mod.rs src-tauri/src/epub/validation.rs src-tauri/src/commands/import.rs
git commit -m "fix: validate epub source before import"
```

### Task 2: Add ZIP Bomb Guards to Extraction and Read Helpers

**Files:**
- Modify: `src-tauri/src/epub/resources.rs`
- Test: `src-tauri/src/epub/resources.rs`

- [ ] **Step 1: Add extraction-limit tests**

Add tests for `safe_zip_path` behavior already implied by extraction:

```rust
#[test]
fn safe_zip_path_rejects_parent_directory() {
    assert!(safe_zip_path("../escape.xhtml").is_none());
}

#[test]
fn safe_zip_path_rejects_absolute_path() {
    assert!(safe_zip_path("/tmp/escape.xhtml").is_none());
}

#[test]
fn safe_zip_path_accepts_nested_relative_path() {
    assert_eq!(
        safe_zip_path("OPS/chapter.xhtml").expect("safe path"),
        std::path::PathBuf::from("OPS").join("chapter.xhtml")
    );
}
```

- [ ] **Step 2: Run targeted tests**

```powershell
cargo test epub::resources
```

Expected: tests pass or reveal private visibility adjustments needed.

- [ ] **Step 3: Update `extract_epub` to validate totals**

Track entry count and total uncompressed bytes:

```rust
let mut total_uncompressed = 0_u64;

for index in 0..archive.len() {
    let mut item = archive.by_index(index)?;
    crate::epub::validation::validate_zip_entry_limits(
        archive.len(),
        total_uncompressed.saturating_add(item.size()),
        item.size(),
    )?;
    total_uncompressed = total_uncompressed.saturating_add(item.size());
    // existing safe path and copy logic
}
```

- [ ] **Step 4: Bound `read_zip_bytes`**

Before `read_to_end`, reject large entries:

```rust
crate::epub::validation::validate_zip_entry_limits(
    archive.len(),
    entry.size(),
    entry.size(),
)?;
```

- [ ] **Step 5: Run tests**

```powershell
cargo test
npm test
```

Expected: both pass.

- [ ] **Step 6: Commit**

```powershell
git add src-tauri/src/epub/resources.rs
git commit -m "fix: guard epub zip extraction limits"
```

---

## Milestone 2: Safer Reader Rendering

### Task 3: Sanitize EPUB Content Rendered by epubjs

**Files:**
- Modify: `src/features/reader/epubCfiReader.ts`
- Modify: `src/features/reader/ReaderPage.tsx`
- Test: `src/features/reader/epubCfiReader.test.ts`

- [ ] **Step 1: Add sanitizer tests**

Add tests for a new exported helper:

```ts
import { sanitizeRenderedEpubDocument } from "./epubCfiReader";

it("removes active content from rendered epub documents", () => {
  document.body.innerHTML = `
    <script>alert("x")</script>
    <iframe src="https://example.com"></iframe>
    <a href="javascript:alert(1)" onclick="alert(2)">bad</a>
    <a href="https://example.com">external</a>
    <a href="chapter.xhtml">internal</a>
  `;

  sanitizeRenderedEpubDocument(document);

  expect(document.querySelector("script")).toBeNull();
  expect(document.querySelector("iframe")).toBeNull();
  expect(document.querySelector("[onclick]")).toBeNull();
  expect(document.querySelectorAll("a")[0]).toHaveAttribute("href", "#");
  expect(document.querySelectorAll("a")[1]).toHaveAttribute("href", "#");
  expect(document.querySelectorAll("a")[2]).toHaveAttribute("href", "chapter.xhtml");
});
```

- [ ] **Step 2: Run failing frontend test**

```powershell
npm test -- src/features/reader/epubCfiReader.test.ts
```

Expected: failure because helper is missing.

- [ ] **Step 3: Implement sanitizer**

In `epubCfiReader.ts`:

```ts
const UNSAFE_SELECTOR = "script, iframe, object, embed, form";
const UNSAFE_PROTOCOL = /^(https?:|file:|javascript:|data:text\/html)/i;

export function sanitizeRenderedEpubDocument(doc: Document) {
  doc.querySelectorAll(UNSAFE_SELECTOR).forEach((node) => node.remove());

  doc.querySelectorAll("*").forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      if (attribute.name.toLowerCase().startsWith("on")) {
        node.removeAttribute(attribute.name);
      }
    }
  });

  doc.querySelectorAll<HTMLElement>("[href]").forEach((node) => {
    const href = node.getAttribute("href") ?? "";
    if (UNSAFE_PROTOCOL.test(href.trim())) {
      node.setAttribute("href", "#");
    }
  });
}
```

- [ ] **Step 4: Hook sanitizer into rendition render lifecycle**

In `ReaderPage.tsx`, import and call:

```ts
rendition.on("rendered", (_section, view) => {
  const renderedDocument = view?.document;
  if (renderedDocument) sanitizeRenderedEpubDocument(renderedDocument);
});
```

Update the local `Rendition` type in `epubCfiReader.ts` to include:

```ts
on: (
  event: "relocated" | "rendered",
  handler: (payload: unknown, view?: { document?: Document }) => void,
) => void;
```

- [ ] **Step 5: Run tests/build**

```powershell
npm test
npm run build
```

Expected: tests and TypeScript build pass.

- [ ] **Step 6: Commit**

```powershell
git add src/features/reader/epubCfiReader.ts src/features/reader/epubCfiReader.test.ts src/features/reader/ReaderPage.tsx
git commit -m "fix: sanitize rendered epub content"
```

### Task 4: Avoid Loading Reader Bundle on Library Startup

**Files:**
- Modify: `src/App.tsx`
- Test: manual build output

- [ ] **Step 1: Lazy-load the reader page**

Change `App.tsx`:

```tsx
import { Suspense, lazy, useState } from "react";
import { LibraryPage } from "./features/library/LibraryPage";

const ReaderPage = lazy(() =>
  import("./features/reader/ReaderPage").then((module) => ({
    default: module.ReaderPage,
  })),
);
```

Render:

```tsx
if (openBookId) {
  return (
    <Suspense fallback={<div className="grid h-screen place-items-center bg-[#151412] text-neutral-100">Abrindo livro...</div>}>
      <ReaderPage bookId={openBookId} onBack={() => setOpenBookId(null)} />
    </Suspense>
  );
}
```

- [ ] **Step 2: Run build**

```powershell
npm run build
```

Expected: production build passes and creates separate chunks.

- [ ] **Step 3: Commit**

```powershell
git add src/App.tsx
git commit -m "perf: lazy load reader page"
```

---

## Milestone 3: Error Strategy and Persistence Reliability

### Task 5: Normalize User-Facing Error Messages

**Files:**
- Create: `src/shared/copy/ptBr.ts`
- Modify: `src/shared/tauri/commands.ts`
- Modify: `src-tauri/src/error.rs`
- Test: `src/shared/tauri/commands.test.ts`

- [ ] **Step 1: Add frontend error-message tests**

Create `src/shared/tauri/commands.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { errorMessage } from "./commands";

describe("errorMessage", () => {
  it("maps known backend error codes to friendly text", () => {
    expect(errorMessage({ code: "epub_zip_error", message: "invalid zip" })).toBe(
      "Não foi possível abrir este EPUB. O arquivo pode estar corrompido ou protegido.",
    );
  });

  it("uses a safe fallback for unknown errors", () => {
    expect(errorMessage(new Error("C:\\secret\\db.sqlite"))).toBe(
      "Não foi possível concluir a operação. Tente novamente.",
    );
  });
});
```

- [ ] **Step 2: Run failing test**

```powershell
npm test -- src/shared/tauri/commands.test.ts
```

Expected: failure because mapping does not exist yet.

- [ ] **Step 3: Add copy map**

Create `src/shared/copy/ptBr.ts`:

```ts
export const ERROR_COPY: Record<string, string> = {
  invalid_file_type: "Selecione um arquivo EPUB válido.",
  invalid_file: "Selecione um arquivo EPUB válido.",
  invalid_epub: "Este arquivo não parece ser um EPUB válido.",
  invalid_epub_size: "O arquivo EPUB está vazio ou é grande demais.",
  epub_zip_error: "Não foi possível abrir este EPUB. O arquivo pode estar corrompido ou protegido.",
  epub_xml_error: "Não foi possível ler a estrutura deste EPUB.",
  epub_too_many_files: "O EPUB contém arquivos demais e não pode ser importado com segurança.",
  epub_expanded_too_large: "O EPUB expande para um tamanho grande demais.",
  database_error: "Não foi possível salvar os dados agora. Tente novamente.",
  book_not_found: "Este livro não está mais disponível na biblioteca.",
};

export const GENERIC_ERROR_COPY = "Não foi possível concluir a operação. Tente novamente.";
```

Update `errorMessage`:

```ts
import { ERROR_COPY, GENERIC_ERROR_COPY } from "../copy/ptBr";

export function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as AppError).code);
    return ERROR_COPY[code] ?? GENERIC_ERROR_COPY;
  }
  return GENERIC_ERROR_COPY;
}
```

- [ ] **Step 4: Run tests**

```powershell
npm test
```

Expected: all frontend tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/shared/copy/ptBr.ts src/shared/tauri/commands.ts src/shared/tauri/commands.test.ts
git commit -m "fix: normalize user facing errors"
```

### Task 6: Enable SQLite WAL and Busy Timeout

**Files:**
- Modify: `src-tauri/src/db/mod.rs`
- Test: `src-tauri/src/db/mod.rs`

- [ ] **Step 1: Add DB pragma test**

Add a test that opens a temporary database and verifies `busy_timeout`:

```rust
#[test]
fn connect_sets_sqlite_pragmas() {
    let temp = tempfile::tempdir().expect("tempdir");
    let db = Db::new(temp.path().join("reader.sqlite")).expect("db");
    let connection = db.connect().expect("connect");

    let foreign_keys: i64 = connection
        .query_row("PRAGMA foreign_keys", [], |row| row.get(0))
        .expect("foreign_keys");
    let busy_timeout: i64 = connection
        .query_row("PRAGMA busy_timeout", [], |row| row.get(0))
        .expect("busy_timeout");

    assert_eq!(foreign_keys, 1);
    assert!(busy_timeout >= 5000);
}
```

- [ ] **Step 2: Update connection pragmas**

In `Db::connect`:

```rust
connection.execute_batch(
    "PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;",
)?;
```

- [ ] **Step 3: Run Rust tests**

```powershell
cargo test db
```

Expected: pass.

- [ ] **Step 4: Commit**

```powershell
git add src-tauri/src/db/mod.rs
git commit -m "fix: configure sqlite for desktop writes"
```

---

## Milestone 4: Frontend Decomposition

### Task 7: Extract Library Business Logic into `useLibrary`

**Files:**
- Create: `src/features/library/useLibrary.ts`
- Modify: `src/features/library/LibraryPage.tsx`
- Test: existing tests plus manual smoke

- [ ] **Step 1: Create hook with current library operations**

Move these responsibilities out of `LibraryPage.tsx`:

- `books`, `collections`, `isLoading`, `isImporting`, `message`
- `refreshLibrary`, `refreshBooks`, `refreshCollections`
- `importBooks`, `toggleFavorite`, `deleteBook`
- collection create/update/delete helpers

Hook shape:

```ts
export function useLibrary() {
  return {
    books,
    collections,
    isLoading,
    isImporting,
    message,
    setMessage,
    refreshLibrary,
    importBooks,
    toggleFavorite,
    deleteBook,
    createCollection,
    updateCollection,
    deleteCollection,
    addBookToCollection,
    removeBookFromCollection,
  };
}
```

- [ ] **Step 2: Replace direct logic in `LibraryPage.tsx`**

`LibraryPage.tsx` should keep:

- selected section/view/filter state
- dialog open/editing state
- rendering composition

- [ ] **Step 3: Run verification**

```powershell
npm test
npm run build
```

Expected: pass.

- [ ] **Step 4: Commit**

```powershell
git add src/features/library/useLibrary.ts src/features/library/LibraryPage.tsx
git commit -m "refactor: extract library state hook"
```

### Task 8: Extract Collection Components

**Files:**
- Create: `src/features/library/components/CollectionDialog.tsx`
- Create: `src/features/library/components/CollectionsOverview.tsx`
- Modify: `src/features/library/LibraryPage.tsx`

- [ ] **Step 1: Move `CollectionDialog` unchanged**

Move the component and its helper types from `LibraryPage.tsx` to `components/CollectionDialog.tsx`.

- [ ] **Step 2: Move `CollectionsOverview` and actions menu**

Move:

- `CollectionsOverview`
- `CollectionActionsMenu`
- `CollectionMenuButton`

to `components/CollectionsOverview.tsx`.

- [ ] **Step 3: Update imports**

`LibraryPage.tsx` imports:

```ts
import { CollectionDialog } from "./components/CollectionDialog";
import { CollectionsOverview } from "./components/CollectionsOverview";
```

- [ ] **Step 4: Run verification**

```powershell
npm test
npm run build
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add src/features/library/LibraryPage.tsx src/features/library/components/CollectionDialog.tsx src/features/library/components/CollectionsOverview.tsx
git commit -m "refactor: split collection library components"
```

### Task 9: Extract Reader Lifecycle into `useEpubReader`

**Files:**
- Create: `src/features/reader/useEpubReader.ts`
- Modify: `src/features/reader/ReaderPage.tsx`

- [ ] **Step 1: Move reader refs and effects into hook**

Hook should own:

- `viewerRef`
- `epubRef`
- `renditionRef`
- `latestLocatorRef`
- `saveChainRef`
- `book`, `isLoading`, `message`
- `tocItems`, `currentTocIndex`
- `pageStats`, `chapterPageStats`
- `openBook`, cleanup, resize, `flushAndBack`
- `previousPage`, `nextPage`, `goToTocItem`, `goToPage`

Hook shape:

```ts
export function useEpubReader(bookId: string, readerSettings: ReaderSettings) {
  return {
    viewerRef,
    book,
    isLoading,
    message,
    setMessage,
    tocItems,
    currentTocIndex,
    pageStats,
    chapterPageStats,
    previousPage,
    nextPage,
    goToTocItem,
    goToPage,
    flushProgress,
  };
}
```

- [ ] **Step 2: Keep `ReaderPage.tsx` as composition**

`ReaderPage.tsx` should mainly render:

- header
- `TocPanel`
- `ReaderSettingsPanel`
- viewer shell
- footer

- [ ] **Step 3: Run verification**

```powershell
npm test
npm run build
```

Expected: pass.

- [ ] **Step 4: Commit**

```powershell
git add src/features/reader/useEpubReader.ts src/features/reader/ReaderPage.tsx
git commit -m "refactor: extract epub reader lifecycle hook"
```

---

## Milestone 5: UX, Copy, and Accessibility

### Task 10: Replace `window.confirm` with Accessible Confirm Dialog

**Files:**
- Create: `src/shared/components/ConfirmDialog.tsx`
- Modify: `src/features/library/LibraryPage.tsx`

- [ ] **Step 1: Create reusable dialog**

```tsx
type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="w-full max-w-md rounded-lg border border-white/10 bg-[#1f1d1a] p-5 text-neutral-100 shadow-2xl"
      >
        <h2 id="confirm-dialog-title" className="text-base font-semibold">
          {title}
        </h2>
        <p id="confirm-dialog-description" className="mt-2 text-sm text-neutral-300">
          {description}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-md border border-white/10 px-4 py-2 text-sm">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${
              danger ? "bg-red-300 text-red-950" : "bg-amber-300 text-neutral-950"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Replace delete confirmation flows**

Use state:

```ts
const [pendingDeleteBook, setPendingDeleteBook] = useState<BookDto | null>(null);
const [pendingDeleteCollection, setPendingDeleteCollection] = useState<CollectionDto | null>(null);
```

Render dialog when either is set and call the existing async delete implementation on confirm.

- [ ] **Step 3: Run verification**

```powershell
npm run build
```

Expected: pass.

- [ ] **Step 4: Commit**

```powershell
git add src/shared/components/ConfirmDialog.tsx src/features/library/LibraryPage.tsx
git commit -m "ux: replace native confirms with app dialog"
```

### Task 11: Standardize PT-BR Copy

**Files:**
- Modify: `src/features/library/LibraryPage.tsx`
- Modify: `src/features/library/BookCard.tsx`
- Modify: `src/features/library/LibraryToolbar.tsx`
- Modify: `src/features/library/LibrarySidebar.tsx`
- Modify: `src/features/reader/ReaderPage.tsx`

- [ ] **Step 1: Replace known bad copy**

Use these replacements:

- `Sua Bookshelf ainda esta vazia.` → `Sua biblioteca ainda está vazia.`
- `Use Importar EPUB ou arraste um ou mais arquivos .epub para iniciar o Ingestion Pipeline.` → `Importe um EPUB ou arraste arquivos para começar.`
- `Sumario` → `Sumário`
- `Configuracoes` → `Configurações`
- `Pagina` → `Página`
- `Proxima pagina` → `Próxima página`
- `Rolagem continua` → `Rolagem contínua`
- `Uma pagina` → `Uma página`
- `Duas paginas` → `Duas páginas`
- `colecao` → `coleção`
- `Acoes` → `Ações`
- `Texto nao estimado` → `Tamanho ainda não calculado`
- `Não Iniciado` → `Não iniciado`

- [ ] **Step 2: Search for remaining unaccented UI text**

Run:

```powershell
rg -n "Sumario|Configuracoes|Pagina|Proxima|continua|pagina|colecao|Acoes|nao|esta|Bookshelf|Ingestion" src
```

Expected: no user-facing bad copy remains, except intentional code identifiers.

- [ ] **Step 3: Run build**

```powershell
npm run build
```

Expected: pass.

- [ ] **Step 4: Commit**

```powershell
git add src
git commit -m "ux: standardize portuguese interface copy"
```

---

## Milestone 6: Search and Performance

### Task 12: Replace Synchronous ZIP Search with Indexed Search

**Files:**
- Create: `src-tauri/src/epub/search_index.rs`
- Modify: `src-tauri/src/epub/mod.rs`
- Modify: `src-tauri/src/commands/import.rs`
- Modify: `src-tauri/src/commands/reader.rs`
- Test: `src-tauri/src/epub/search_index.rs`

- [ ] **Step 1: Add search index tests**

```rust
#[test]
fn snippet_finds_case_insensitive_match() {
    let text = "Capítulo inicial com uma palavra importante no meio.";
    let result = snippet_for_query(text, "IMPORTANTE", 12).expect("snippet");

    assert!(result.contains("importante") || result.contains("importante"));
}

#[test]
fn snippet_returns_none_for_blank_query() {
    assert!(snippet_for_query("texto", "   ", 12).is_none());
}
```

- [ ] **Step 2: Implement a minimal index builder**

Build `search_index.json` during import with entries:

```rust
#[derive(serde::Serialize, serde::Deserialize)]
pub struct SearchIndexEntry {
    pub href: String,
    pub spine_index: usize,
    pub text: String,
}
```

Extract text with existing `estimate_epub_text_length`-style stripping, but store normalized chapter text.

- [ ] **Step 3: Update `search_in_book`**

Read `search_index.json` from book storage, search entries, limit to 50 results, and avoid reopening/parsing the EPUB for every query.

- [ ] **Step 4: Run Rust tests**

```powershell
cargo test
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add src-tauri/src/epub/search_index.rs src-tauri/src/epub/mod.rs src-tauri/src/commands/import.rs src-tauri/src/commands/reader.rs
git commit -m "perf: search books using import-time index"
```

### Task 13: Debounce Progress Saves

**Files:**
- Modify: `src/features/reader/useEpubReader.ts` or `src/features/reader/ReaderPage.tsx`
- Test: `src/features/reader/epubCfiReader.test.ts`

- [ ] **Step 1: Add helper test**

Create/export a helper:

```ts
export function shouldSaveLocator(previousCfi: string | null, nextCfi: string) {
  return previousCfi !== nextCfi;
}
```

Test:

```ts
it("does not save identical CFI repeatedly", () => {
  expect(shouldSaveLocator("epubcfi(/6/2)", "epubcfi(/6/2)")).toBe(false);
  expect(shouldSaveLocator("epubcfi(/6/2)", "epubcfi(/6/4)")).toBe(true);
});
```

- [ ] **Step 2: Use helper in relocated handler**

Keep the latest saved CFI in a ref and skip save when unchanged. Keep final flush on back.

- [ ] **Step 3: Run tests**

```powershell
npm test
```

Expected: pass.

- [ ] **Step 4: Commit**

```powershell
git add src/features/reader
git commit -m "perf: avoid duplicate progress saves"
```

---

## Milestone 7: Test and Release Coverage

### Task 14: Add Critical Import Fixtures and Tests

**Files:**
- Modify: `src-tauri/src/commands/import.rs`
- Modify: `src-tauri/src/epub/parser.rs`
- Test: Rust test modules

- [ ] **Step 1: Add tests for invalid EPUB cases**

Cover:

- wrong extension
- empty file
- ZIP without `META-INF/container.xml`
- EPUB without spine
- duplicate hash returns existing book

- [ ] **Step 2: Run Rust tests**

```powershell
cargo test
```

Expected: pass.

- [ ] **Step 3: Commit**

```powershell
git add src-tauri/src
git commit -m "test: cover critical epub import failures"
```

### Task 15: Add Frontend Reader Smoke Tests

**Files:**
- Test: `src/features/reader/ReaderPage.test.tsx`
- Test: `src/test/setup.ts`

- [ ] **Step 1: Mock Tauri commands and epubjs**

Mock:

- `commands.getBook`
- `commands.getProgress`
- `commands.readBook`
- `commands.saveProgress`
- `epubjs`

- [ ] **Step 2: Test loading, error, and settings UI**

Required scenarios:

- renders loading state
- shows friendly error when `readBook` rejects
- opens settings panel
- calls `saveProgress` when leaving reader

- [ ] **Step 3: Run frontend tests**

```powershell
npm test
```

Expected: pass.

- [ ] **Step 4: Commit**

```powershell
git add src/features/reader/ReaderPage.test.tsx src/test/setup.ts
git commit -m "test: add reader smoke coverage"
```

### Task 16: Add Release Scripts

**Files:**
- Modify: `package.json`
- Optional create: `.github/workflows/ci.yml`

- [ ] **Step 1: Add scripts**

```json
{
  "scripts": {
    "check": "npm run test && npm run build",
    "tauri:build": "tauri build"
  }
}
```

- [ ] **Step 2: Add CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - uses: dtolnay/rust-toolchain@stable
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: cargo test
        working-directory: src-tauri
```

- [ ] **Step 3: Run local checks**

```powershell
npm run check
cargo test
```

Expected: pass.

- [ ] **Step 4: Commit**

```powershell
git add package.json .github/workflows/ci.yml
git commit -m "ci: add release validation checks"
```

---

## Final Verification

- [ ] Run frontend tests:

```powershell
npm test
```

- [ ] Run frontend build:

```powershell
npm run build
```

- [ ] Run Rust tests:

```powershell
cargo test
```

- [ ] Run Tauri build:

```powershell
npm run tauri -- build
```

- [ ] Manual smoke checklist:

- Import valid EPUB.
- Import corrupt EPUB and verify friendly message.
- Import same EPUB twice and verify duplicate handling.
- Open book and navigate next/previous.
- Change font size, theme, margin, line height.
- Close reader and reopen; progress restores.
- Delete a book; app remains consistent after restart.
- Create/edit/delete collection.
- Drag-and-drop EPUB import.
- Try a large EPUB and confirm app remains responsive or rejects safely.
- Verify keyboard navigation for menus/dialogs.
- Verify dark/light/sepia/OLED contrast.

---

## Recommended Execution Order

1. Milestone 1: Security hardening.
2. Milestone 2: Reader rendering and bundle loading.
3. Milestone 3: Errors and database reliability.
4. Milestone 4: Component decomposition.
5. Milestone 5: UX, copy, accessibility.
6. Milestone 6: Search/performance.
7. Milestone 7: tests, CI, release checks.

Do not start broad component refactors before Milestones 1-3 are done. Those are the risks most likely to create production bugs or user data problems.

