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
