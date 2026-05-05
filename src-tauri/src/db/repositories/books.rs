use crate::{error::AppError, models::BookDto};
use rusqlite::{params, Connection, OptionalExtension, Row};

pub fn insert_book(connection: &Connection, book: &BookDto) -> Result<(), AppError> {
    connection.execute(
        r#"
        INSERT INTO books (
          id, title, subtitle, author, publisher, language, description, identifier,
          published_at, subjects, file_hash, file_path, cover_path, imported_at, updated_at,
          last_opened_at, reading_status, total_progression, text_length, is_favorite
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)
        "#,
        params![
            book.id,
            book.title,
            book.subtitle,
            book.author,
            book.publisher,
            book.language,
            book.description,
            book.identifier,
            book.published_at,
            subjects_json(&book.subjects),
            book.file_hash,
            book.file_path,
            book.cover_path,
            book.imported_at,
            book.updated_at,
            book.last_opened_at,
            book.reading_status,
            book.total_progression,
            book.text_length,
            book.is_favorite
        ],
    )?;
    Ok(())
}

pub fn list_books(connection: &Connection) -> Result<Vec<BookDto>, AppError> {
    let mut statement = connection.prepare(
        r#"
        SELECT id, title, subtitle, author, publisher, language, description, identifier,
               published_at, subjects, file_hash, file_path, cover_path, imported_at, updated_at,
               last_opened_at, reading_status, total_progression, text_length, is_favorite
        FROM books
        ORDER BY COALESCE(last_opened_at, imported_at) DESC
        "#,
    )?;

    let rows = statement.query_map([], book_from_row)?;
    let mut books = Vec::new();
    for row in rows {
        books.push(row?);
    }
    Ok(books)
}

pub fn get_book(connection: &Connection, book_id: &str) -> Result<Option<BookDto>, AppError> {
    connection
        .query_row(
            r#"
            SELECT id, title, subtitle, author, publisher, language, description, identifier,
                   published_at, subjects, file_hash, file_path, cover_path, imported_at, updated_at,
                   last_opened_at, reading_status, total_progression, text_length, is_favorite
            FROM books
            WHERE id = ?1
            "#,
            params![book_id],
            book_from_row,
        )
        .optional()
        .map_err(AppError::from)
}

pub fn get_book_by_hash(connection: &Connection, hash: &str) -> Result<Option<BookDto>, AppError> {
    connection
        .query_row(
            r#"
            SELECT id, title, subtitle, author, publisher, language, description, identifier,
                   published_at, subjects, file_hash, file_path, cover_path, imported_at, updated_at,
                   last_opened_at, reading_status, total_progression, text_length, is_favorite
            FROM books
            WHERE file_hash = ?1
            "#,
            params![hash],
            book_from_row,
        )
        .optional()
        .map_err(AppError::from)
}

pub fn delete_book(connection: &Connection, book_id: &str) -> Result<(), AppError> {
    connection.execute("DELETE FROM books WHERE id = ?1", params![book_id])?;
    Ok(())
}

pub fn update_text_length(
    connection: &Connection,
    book_id: &str,
    text_length: i64,
) -> Result<(), AppError> {
    connection.execute(
        "UPDATE books SET text_length = ?1 WHERE id = ?2",
        params![text_length, book_id],
    )?;
    Ok(())
}

pub fn set_favorite(
    connection: &Connection,
    book_id: &str,
    is_favorite: bool,
) -> Result<(), AppError> {
    connection.execute(
        "UPDATE books SET is_favorite = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![is_favorite, book_id],
    )?;
    Ok(())
}

fn book_from_row(row: &Row<'_>) -> rusqlite::Result<BookDto> {
    Ok(BookDto {
        id: row.get(0)?,
        title: row.get(1)?,
        subtitle: row.get(2)?,
        author: row.get(3)?,
        publisher: row.get(4)?,
        language: row.get(5)?,
        description: row.get(6)?,
        identifier: row.get(7)?,
        published_at: row.get(8)?,
        subjects: subjects_from_json(row.get(9)?),
        file_hash: row.get(10)?,
        file_path: row.get(11)?,
        cover_path: row.get(12)?,
        imported_at: row.get(13)?,
        updated_at: row.get(14)?,
        last_opened_at: row.get(15)?,
        reading_status: row.get(16)?,
        total_progression: row.get(17)?,
        text_length: row.get(18)?,
        is_favorite: row.get(19)?,
    })
}

fn subjects_json(subjects: &[String]) -> String {
    serde_json::to_string(subjects).unwrap_or_else(|_| "[]".to_string())
}

fn subjects_from_json(value: String) -> Vec<String> {
    serde_json::from_str(&value).unwrap_or_default()
}
