use crate::error::AppError;
use rusqlite::Connection;

pub fn run(connection: &Connection) -> Result<(), AppError> {
    connection.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS books (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          subtitle TEXT,
          author TEXT,
          publisher TEXT,
          language TEXT,
          description TEXT,
          identifier TEXT,
          published_at TEXT,
          subjects TEXT NOT NULL DEFAULT '[]',
          file_hash TEXT NOT NULL UNIQUE,
          file_path TEXT NOT NULL,
          cover_path TEXT,
          imported_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          last_opened_at TEXT,
          reading_status TEXT NOT NULL DEFAULT 'unread',
          total_progression REAL DEFAULT 0,
          text_length INTEGER NOT NULL DEFAULT 0,
          is_favorite INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS book_progress (
          book_id TEXT PRIMARY KEY,
          href TEXT NOT NULL,
          spine_index INTEGER NOT NULL,
          progression REAL NOT NULL,
          total_progression REAL NOT NULL,
          cfi TEXT,
          css_selector TEXT,
          text_snippet TEXT,
          display_page_index INTEGER,
          display_page_count INTEGER,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS reading_settings (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          font_family TEXT NOT NULL,
          font_size INTEGER NOT NULL,
          line_height REAL NOT NULL,
          margin INTEGER NOT NULL,
          paragraph_spacing REAL NOT NULL,
          theme TEXT NOT NULL,
          text_align TEXT NOT NULL,
          hyphenation_enabled INTEGER NOT NULL DEFAULT 1,
          ligatures_enabled INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bookmarks (
          id TEXT PRIMARY KEY,
          book_id TEXT NOT NULL,
          href TEXT NOT NULL,
          spine_index INTEGER NOT NULL,
          progression REAL NOT NULL,
          total_progression REAL NOT NULL,
          label TEXT,
          text_snippet TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS highlights (
          id TEXT PRIMARY KEY,
          book_id TEXT NOT NULL,
          href TEXT NOT NULL,
          spine_index INTEGER NOT NULL,
          progression REAL NOT NULL,
          total_progression REAL NOT NULL,
          selected_text TEXT NOT NULL,
          color TEXT NOT NULL,
          note TEXT,
          cfi TEXT,
          css_selector TEXT,
          dom_range_json TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS collections (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS collection_books (
          collection_id TEXT NOT NULL,
          book_id TEXT NOT NULL,
          PRIMARY KEY(collection_id, book_id),
          FOREIGN KEY(collection_id) REFERENCES collections(id) ON DELETE CASCADE,
          FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS reading_sessions (
          id TEXT PRIMARY KEY,
          book_id TEXT NOT NULL,
          started_at TEXT NOT NULL,
          ended_at TEXT,
          duration_seconds INTEGER,
          start_total_progression REAL,
          end_total_progression REAL,
          pages_turned INTEGER DEFAULT 0,
          FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
        CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
        CREATE INDEX IF NOT EXISTS idx_books_status ON books(reading_status);
        CREATE INDEX IF NOT EXISTS idx_bookmarks_book ON bookmarks(book_id);
        CREATE INDEX IF NOT EXISTS idx_highlights_book ON highlights(book_id);
        "#,
    )?;
    ensure_book_text_length_column(connection)?;
    ensure_column(
        connection,
        "books",
        "published_at",
        "ALTER TABLE books ADD COLUMN published_at TEXT",
    )?;
    ensure_column(
        connection,
        "books",
        "subjects",
        "ALTER TABLE books ADD COLUMN subjects TEXT NOT NULL DEFAULT '[]'",
    )?;
    ensure_column(
        connection,
        "books",
        "is_favorite",
        "ALTER TABLE books ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0",
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_books_text_length ON books(text_length)",
        [],
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_books_favorite ON books(is_favorite)",
        [],
    )?;
    Ok(())
}

fn ensure_book_text_length_column(connection: &Connection) -> Result<(), AppError> {
    ensure_column(
        connection,
        "books",
        "text_length",
        "ALTER TABLE books ADD COLUMN text_length INTEGER NOT NULL DEFAULT 0",
    )
}

fn ensure_column(
    connection: &Connection,
    table: &str,
    column: &str,
    alter_sql: &str,
) -> Result<(), AppError> {
    let pragma = format!("PRAGMA table_info({table})");
    let mut statement = connection.prepare(&pragma)?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    if !columns.iter().any(|name| name == column) {
        connection.execute(alter_sql, [])?;
    }
    Ok(())
}
