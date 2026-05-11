# EPUB Reader Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden and productize the EPUB Reader MVP by improving security, memory usage, persistence consistency, maintainability, accessibility, and delivery hygiene.

**Architecture:** Keep Rust responsible for filesystem, EPUB parsing, sanitization, database, persistence and IPC validation. Keep React responsible for user interaction, Reader UI, Synthetic Pagination, Rendition Settings and visual state, with Locator remaining the source of truth for progress.

**Tech Stack:** Tauri v2, Rust, rusqlite, zip, roxmltree, React 19, TypeScript, Vite, Tailwind CSS, Vitest.

---

## File Structure

### Create

- `docs/plans/2026-05-11-epub-reader-hardening-plan.md`: this implementation plan.
- `src/features/library/useLibraryBooks.ts`: library book loading, import, delete, cover object URL lifecycle.
- `src/features/library/useLibraryCollections.ts`: collection CRUD and collection membership orchestration.
- `src/features/library/LibrarySidebar.tsx`: sidebar navigation.
- `src/features/library/LibraryToolbar.tsx`: search, filters, sort and view toggle.
- `src/features/library/CollectionDialog.tsx`: collection modal with accessibility.
- `src/features/reader/useReaderBook.ts`: manifest, progress, current spine resource loading.
- `src/features/reader/useReaderPagination.ts`: Synthetic Pagination, Reflow, resize/debounce.
- `src/features/reader/useReaderProgress.ts`: Locator construction and persistence.
- `src/features/reader/ReaderFrame.tsx`: iframe rendering boundary.
- `src/features/reader/TocPopover.tsx`: TOC UI.
- `src/features/reader/ReadingSettingsPopover.tsx`: settings UI extracted from page.
- `src-tauri/src/db/schema.rs`: schema versioning helpers.
- `src-tauri/src/storage/staging.rs`: import staging directory lifecycle.

### Modify

- `src/features/library/LibraryPage.tsx`: reduce to page composition.
- `src/features/library/BookCard.tsx`: remove nested interactive semantics and extract action menu if needed.
- `src/features/reader/ReaderPage.tsx`: reduce to page composition.
- `src/features/reader/readerDocument.ts`: keep only document template helpers.
- `src/shared/tauri/commands.ts`: expose annotation/search/settings commands completely.
- `src/shared/types/books.ts`: add missing bookmark/highlight/search DTO types.
- `src-tauri/tauri.conf.json`: define CSP.
- `src-tauri/src/commands/import.rs`: staging + transactional import.
- `src-tauri/src/commands/books.rs`: consistent delete flow.
- `src-tauri/src/commands/reader.rs`: load single spine resource, safe Unicode search, avoid whole-book rendition.
- `src-tauri/src/commands/annotations.rs`: validate locator/book consistency.
- `src-tauri/src/db/migrations.rs`: versioned migrations and indexes.
- `src-tauri/src/epub/sanitizer.rs`: robust sanitizer and clippy fix.
- `src-tauri/src/epub/parser.rs`: TOC hierarchy improvements.
- `README.md`: setup, scripts, architecture and troubleshooting.
- `.github/workflows/ci.yml`: CI checks.

---

## Task 1: Baseline Hygiene and CI Gates

**Files:**
- Modify: `src-tauri/src/epub/sanitizer.rs`
- Create: `.github/workflows/ci.yml`
- Create: `README.md`

- [ ] **Step 1: Fix the current clippy failure**

In `src-tauri/src/epub/sanitizer.rs`, replace the inner loop:

```rust
while let Some(quoted) = chars.next() {
    if quoted == quote {
        break;
    }
}
```

with:

```rust
for quoted in chars.by_ref() {
    if quoted == quote {
        break;
    }
}
```

- [ ] **Step 2: Run Rust checks**

Run:

```powershell
cargo fmt --check
cargo test
cargo clippy -- -D warnings
```

Expected: all pass.

- [ ] **Step 3: Add CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

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
        with:
          components: rustfmt, clippy

      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: cargo fmt --check
        working-directory: src-tauri
      - run: cargo test
        working-directory: src-tauri
      - run: cargo clippy -- -D warnings
        working-directory: src-tauri
```

- [ ] **Step 4: Add README**

Create `README.md` with:

```markdown
# EPUB Reader

Local desktop EPUB reader built with Tauri v2, Rust, React, TypeScript, SQLite and Tailwind CSS.

## Requirements

- Node.js 22+
- Rust stable
- Windows WebView2 runtime

## Setup

```powershell
npm ci
npm test
npm run build
cd src-tauri
cargo test
cargo clippy -- -D warnings
```

## Development

```powershell
npm run dev
npm run tauri dev
```

## Architecture

- Rust owns filesystem, SQLite, EPUB parsing, sanitization and persistence.
- React owns UI, reader interaction, Synthetic Pagination and Rendition Settings.
- SQLite is the persistent source of truth.
- Reading progress is stored as a Locator. Viewport pages are derived from the current layout.

## Quality Gates

- `npm test`
- `npm run build`
- `cargo fmt --check`
- `cargo test`
- `cargo clippy -- -D warnings`
```

- [ ] **Step 5: Verify all baseline commands**

Run:

```powershell
npm test
npm run build
cd src-tauri
cargo fmt --check
cargo test
cargo clippy -- -D warnings
```

Expected: all pass.

---

## Task 2: EPUB Security Boundary

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/src/epub/sanitizer.rs`
- Modify: `src-tauri/src/commands/reader.rs`
- Test: `src-tauri/src/epub/sanitizer.rs`

- [ ] **Step 1: Add sanitizer tests for dangerous markup**

Add tests covering:

```rust
#[test]
fn sanitize_xhtml_removes_embedded_active_content() {
    let html = r#"
        <body>
          <iframe src="https://example.com"></iframe>
          <object data="x"></object>
          <embed src="x"></embed>
          <svg><script>alert(1)</script></svg>
          <a href="javascript:alert(1)">bad</a>
          <img src="javascript:alert(2)" onerror="alert(3)" />
        </body>
    "#;

    let sanitized = sanitize_xhtml(html);

    assert!(!sanitized.to_ascii_lowercase().contains("<iframe"));
    assert!(!sanitized.to_ascii_lowercase().contains("<object"));
    assert!(!sanitized.to_ascii_lowercase().contains("<embed"));
    assert!(!sanitized.to_ascii_lowercase().contains("<script"));
    assert!(!sanitized.to_ascii_lowercase().contains("javascript:"));
    assert!(!sanitized.to_ascii_lowercase().contains("onerror"));
}
```

- [ ] **Step 2: Implement minimum robust stripping**

Until a dedicated sanitizer crate is introduced, extend `sanitize_xhtml` to strip:

```rust
pub fn sanitize_xhtml(input: &str) -> String {
    let mut output = input.to_string();
    for element in ["script", "iframe", "object", "embed", "link", "meta"] {
        output = strip_element(&output, element);
    }
    output = strip_event_handlers(&output);
    output = strip_dangerous_url_values(&output);
    output
}
```

Add `strip_dangerous_url_values` that removes `javascript:` values from `href=`, `src=` and `xlink:href=`.

- [ ] **Step 3: Configure CSP**

Replace `csp: null` in `src-tauri/tauri.conf.json` with:

```json
"csp": "default-src 'self'; img-src 'self' data: asset: blob:; style-src 'self' 'unsafe-inline'; frame-src 'self'; connect-src ipc: http://ipc.localhost; script-src 'self'"
```

- [ ] **Step 4: Verify security tests**

Run:

```powershell
cd src-tauri
cargo test epub::sanitizer
cargo clippy -- -D warnings
```

Expected: tests and clippy pass.

---

## Task 3: Safe Unicode Search

**Files:**
- Modify: `src-tauri/src/commands/reader.rs`
- Test: add tests near search helper functions or extract to `src-tauri/src/epub/text.rs`

- [ ] **Step 1: Extract snippet helper**

Add helper:

```rust
fn snippet_around_match(text: &str, byte_position: usize, needle_len: usize, context_chars: usize) -> String {
    let match_end = byte_position.saturating_add(needle_len);
    let mut spans = text.char_indices().map(|(index, _)| index).collect::<Vec<_>>();
    spans.push(text.len());

    let start_char = spans
        .iter()
        .position(|index| *index >= byte_position)
        .unwrap_or(0)
        .saturating_sub(context_chars);
    let end_char = spans
        .iter()
        .position(|index| *index >= match_end)
        .unwrap_or(spans.len().saturating_sub(1))
        .saturating_add(context_chars)
        .min(spans.len().saturating_sub(1));

    text[spans[start_char]..spans[end_char]].replace('\n', " ")
}
```

- [ ] **Step 2: Add tests**

Add:

```rust
#[test]
fn snippet_around_match_handles_accented_text() {
    let text = "Inicio da história com ação, coração e café no capítulo.";
    let needle = "coração";
    let position = text.to_lowercase().find(needle).expect("match");

    let snippet = snippet_around_match(text, position, needle.len(), 8);

    assert!(snippet.contains("coração"));
}
```

- [ ] **Step 3: Use helper in search**

Replace direct slicing:

```rust
snippet: text[start..end].replace('\n', " "),
```

with:

```rust
snippet: snippet_around_match(&text, position, needle.len(), 80),
```

- [ ] **Step 4: Verify**

Run:

```powershell
cd src-tauri
cargo test
```

Expected: all Rust tests pass.

---

## Task 4: Transactional Import and Delete

**Files:**
- Create: `src-tauri/src/storage/staging.rs`
- Modify: `src-tauri/src/storage/mod.rs`
- Modify: `src-tauri/src/commands/import.rs`
- Modify: `src-tauri/src/commands/books.rs`
- Modify: `src-tauri/src/db/repositories/books.rs`
- Test: `src-tauri/src/storage/staging.rs`

- [ ] **Step 1: Create staging helper**

Create `src-tauri/src/storage/staging.rs`:

```rust
use crate::error::AppError;
use std::{fs, path::{Path, PathBuf}};
use uuid::Uuid;

pub struct ImportStaging {
    path: PathBuf,
    promoted: bool,
}

impl ImportStaging {
    pub fn new(cache_dir: &Path) -> Result<Self, AppError> {
        let path = cache_dir.join(format!("import-{}", Uuid::new_v4()));
        fs::create_dir_all(&path)?;
        Ok(Self { path, promoted: false })
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn promote(mut self, final_path: &Path) -> Result<(), AppError> {
        if final_path.exists() {
            fs::remove_dir_all(final_path)?;
        }
        if let Some(parent) = final_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::rename(&self.path, final_path)?;
        self.promoted = true;
        Ok(())
    }
}

impl Drop for ImportStaging {
    fn drop(&mut self) {
        if !self.promoted {
            let _ = fs::remove_dir_all(&self.path);
        }
    }
}
```

- [ ] **Step 2: Register module**

In `src-tauri/src/storage/mod.rs`, add:

```rust
pub mod staging;
```

- [ ] **Step 3: Refactor import to write into staging**

In `import_epub`, create staging under `state.paths.cache_dir()` or add `cache_dir()` to `AppPaths` if missing. Write `original.epub`, `cover.jpg`, `manifest.json`, `search_index.json` into staging. Insert DB record only after parsing succeeds. Promote staging to final `book_dir` after DB insert succeeds.

- [ ] **Step 4: Wrap DB insert in transaction**

Change repository APIs as needed so `insert_book` accepts `&Transaction` or use `Connection::transaction`. Ensure duplicate hash returns existing book before staging work.

- [ ] **Step 5: Make delete consistent**

Delete DB row first inside a transaction, then remove storage. If storage removal fails, return error and leave the DB deletion decision explicit in code comments. Preferred follow-up: soft-delete or cleanup queue.

- [ ] **Step 6: Verify**

Run:

```powershell
cd src-tauri
cargo test
cargo clippy -- -D warnings
```

Expected: all pass.

---

## Task 5: Reader Loads Spine Resources Lazily

**Files:**
- Modify: `src-tauri/src/commands/reader.rs`
- Modify: `src/shared/tauri/commands.ts`
- Create: `src/features/reader/useReaderBook.ts`
- Modify: `src/features/reader/ReaderPage.tsx`

- [ ] **Step 1: Stop using `get_book_rendition` as primary path**

Keep `get_spine_resource(book_id, href)` as the primary resource command. Mark `get_book_rendition` as temporary or remove frontend usage.

- [ ] **Step 2: Create `useReaderBook`**

Create a hook that:

```ts
export function useReaderBook(bookId: string) {
  // state: manifest, progress, resource, spineIndex, loading, message
  // load manifest + progress
  // resolve initial spineIndex from progress.href
  // call commands.getSpineResource(bookId, href)
  // expose goToSpine(index)
}
```

Implementation should use cancellation flags in effects and avoid loading all spine items.

- [ ] **Step 3: Update ReaderPage**

Replace the `commands.getBookRendition(bookId)` call with the hook. Repaginate only the current resource. When navigating beyond current chapter page bounds, call `goToSpine(nextIndex)`.

- [ ] **Step 4: Verify behavior**

Run:

```powershell
npm test
npm run build
```

Expected: TypeScript build passes and existing tests remain green.

---

## Task 6: Refactor Library Page

**Files:**
- Create: `src/features/library/useLibraryBooks.ts`
- Create: `src/features/library/useLibraryCollections.ts`
- Create: `src/features/library/LibrarySidebar.tsx`
- Create: `src/features/library/LibraryToolbar.tsx`
- Create: `src/features/library/CollectionDialog.tsx`
- Modify: `src/features/library/LibraryPage.tsx`
- Modify: `src/features/library/BookCard.tsx`

- [ ] **Step 1: Extract book orchestration**

Move `books`, `covers`, `isLoading`, `isImporting`, `refreshBooks`, `importBooks`, `deleteBook` and cover URL cleanup into `useLibraryBooks`.

- [ ] **Step 2: Add object URL cleanup**

In the hook, keep created URLs in state and revoke removed URLs:

```ts
useEffect(() => {
  return () => {
    for (const url of Object.values(covers)) {
      URL.revokeObjectURL(url);
    }
  };
}, [covers]);
```

When replacing one cover URL, revoke the old URL first.

- [ ] **Step 3: Extract collections orchestration**

Move collection CRUD and membership operations into `useLibraryCollections`.

- [ ] **Step 4: Extract UI components**

Move sidebar, toolbar and dialog markup into dedicated files. Props should be plain data + callbacks only.

- [ ] **Step 5: Fix nested interactive card semantics**

Replace `article role="button"` with a layout where the cover/title open button is a real `button`, and the actions menu is a sibling. Avoid a clickable parent containing clickable children.

- [ ] **Step 6: Verify**

Run:

```powershell
npm test
npm run build
```

Expected: all tests and build pass.

---

## Task 7: Versioned Migrations and Indexes

**Files:**
- Create: `src-tauri/src/db/schema.rs`
- Modify: `src-tauri/src/db/mod.rs`
- Modify: `src-tauri/src/db/migrations.rs`
- Test: `src-tauri/src/db/migrations.rs`

- [ ] **Step 1: Add schema version helpers**

Create helpers for:

```rust
pub fn current_version(connection: &Connection) -> Result<i64, AppError>
pub fn set_version(connection: &Connection, version: i64) -> Result<(), AppError>
```

Use `PRAGMA user_version`.

- [ ] **Step 2: Split migration into versioned functions**

Create:

```rust
fn migrate_v1(connection: &Connection) -> Result<(), AppError>
fn migrate_v2_indexes(connection: &Connection) -> Result<(), AppError>
```

`run` should apply migrations in order and update `user_version`.

- [ ] **Step 3: Add missing indexes**

Add:

```sql
CREATE INDEX IF NOT EXISTS idx_books_last_opened ON books(last_opened_at);
CREATE INDEX IF NOT EXISTS idx_books_imported_at ON books(imported_at);
CREATE INDEX IF NOT EXISTS idx_books_status_favorite ON books(reading_status, is_favorite);
CREATE INDEX IF NOT EXISTS idx_collection_books_book ON collection_books(book_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_book_started ON reading_sessions(book_id, started_at);
```

- [ ] **Step 4: Verify**

Run:

```powershell
cd src-tauri
cargo test
```

Expected: migrations run on an empty temp DB and user_version reaches latest version.

---

## Task 8: Frontend Annotation Surface

**Files:**
- Modify: `src/shared/types/books.ts`
- Modify: `src/shared/tauri/commands.ts`
- Modify: `src/features/annotations/HighlightLayer.tsx`
- Modify: `src/features/annotations/AnnotationPopup.tsx`
- Modify: `src/features/reader/ReaderPage.tsx`

- [ ] **Step 1: Add missing TypeScript DTOs**

Add `BookmarkDto`, `HighlightRangeDto`, `HighlightDto`, `SearchResultDto`.

- [ ] **Step 2: Expose commands**

Add wrappers for:

```ts
createBookmark
listBookmarks
deleteBookmark
createHighlight
listHighlights
updateHighlightNote
searchInBook
```

- [ ] **Step 3: Add minimal bookmarks UI**

Add a reader button to create bookmark at current Locator and a panel listing bookmarks for the current book.

- [ ] **Step 4: Add minimal highlights UI**

Implement text selection detection inside the reader frame only if safe with iframe access. Store selected text, color and current Locator. If iframe selection is unreliable, ship bookmarks first and leave highlights behind a disabled UI state with clear code comments.

- [ ] **Step 5: Verify**

Run:

```powershell
npm test
npm run build
```

Expected: build passes and reader still opens.

---

## Task 9: Accessibility Pass

**Files:**
- Modify: `src/features/library/BookCard.tsx`
- Modify: `src/features/library/CollectionDialog.tsx`
- Modify: `src/features/reader/ReadingSettingsPopover.tsx`
- Modify: `src/features/reader/TocPopover.tsx`

- [ ] **Step 1: Add dialog semantics**

Collection dialog root section should include:

```tsx
role="dialog"
aria-modal="true"
aria-labelledby="collection-dialog-title"
```

The heading should use `id="collection-dialog-title"`.

- [ ] **Step 2: Add Escape close behavior**

For dialogs/popovers, add keydown handling:

```ts
if (event.key === "Escape") onCancel();
```

- [ ] **Step 3: Ensure icon buttons have labels**

Every icon-only button must have `aria-label` or meaningful visible text.

- [ ] **Step 4: Verify keyboard navigation manually**

Manual checks:

- Tab reaches import, search, filters, book open action and actions menu.
- Enter/Space opens a book from a card.
- Escape closes dialogs/popovers.
- Focus is visible.

---

## Task 10: Final Verification

**Files:**
- All touched files

- [ ] **Step 1: Run full frontend verification**

Run:

```powershell
npm test
npm run build
```

Expected: pass.

- [ ] **Step 2: Run full Rust verification**

Run:

```powershell
cd src-tauri
cargo fmt --check
cargo test
cargo clippy -- -D warnings
```

Expected: pass.

- [ ] **Step 3: Manual smoke test**

Run:

```powershell
npm run tauri dev
```

Smoke test:

- Import one valid `.epub`.
- Confirm the book appears in Library.
- Open book.
- Navigate forward/back.
- Change font size and theme.
- Return to Library.
- Reopen book and confirm position restoration.
- Delete book and confirm it disappears.

- [ ] **Step 4: Document residual risks**

Update README with any known limitations that remain, especially:

- EPUB compatibility limitations.
- Highlights limitations if selection in iframe is incomplete.
- Lack of cloud sync/DRM.

---

## Execution Notes

- Prefer one commit per task.
- Do not mix refactors with behavior changes unless the task explicitly calls for it.
- Preserve current user-facing behavior unless the task states a change.
- Treat existing uncommitted changes as user work; do not revert them.
- Keep Locator as source of truth. Never persist page index as the only progress value.

