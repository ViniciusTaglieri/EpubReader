use crate::{
    error::AppError,
    models::{BookmarkDto, HighlightDto, HighlightRangeDto, LocatorDto},
};
use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

pub fn create_bookmark(
    connection: &Connection,
    book_id: &str,
    locator: &LocatorDto,
    label: Option<String>,
) -> Result<BookmarkDto, AppError> {
    validate_locator_book(book_id, locator)?;
    let bookmark = BookmarkDto {
        id: Uuid::new_v4().to_string(),
        book_id: book_id.to_string(),
        href: locator.href.clone(),
        spine_index: locator.spine_index,
        progression: locator.progression,
        total_progression: locator.total_progression,
        label,
        text_snippet: locator.text_snippet.clone(),
        created_at: Utc::now().to_rfc3339(),
    };
    connection.execute(
        r#"
        INSERT INTO bookmarks (
          id, book_id, href, spine_index, progression, total_progression, label, text_snippet, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        "#,
        params![
            bookmark.id,
            bookmark.book_id,
            bookmark.href,
            bookmark.spine_index,
            bookmark.progression,
            bookmark.total_progression,
            bookmark.label,
            bookmark.text_snippet,
            bookmark.created_at
        ],
    )?;
    Ok(bookmark)
}

pub fn list_bookmarks(
    connection: &Connection,
    book_id: &str,
) -> Result<Vec<BookmarkDto>, AppError> {
    let mut statement = connection.prepare(
        r#"
        SELECT id, book_id, href, spine_index, progression, total_progression, label, text_snippet, created_at
        FROM bookmarks
        WHERE book_id = ?1
        ORDER BY total_progression ASC
        "#,
    )?;
    let rows = statement.query_map(params![book_id], |row| {
        Ok(BookmarkDto {
            id: row.get(0)?,
            book_id: row.get(1)?,
            href: row.get(2)?,
            spine_index: row.get(3)?,
            progression: row.get(4)?,
            total_progression: row.get(5)?,
            label: row.get(6)?,
            text_snippet: row.get(7)?,
            created_at: row.get(8)?,
        })
    })?;
    let mut bookmarks = Vec::new();
    for row in rows {
        bookmarks.push(row?);
    }
    Ok(bookmarks)
}

pub fn delete_bookmark(connection: &Connection, bookmark_id: &str) -> Result<(), AppError> {
    connection.execute("DELETE FROM bookmarks WHERE id = ?1", params![bookmark_id])?;
    Ok(())
}

pub fn create_highlight(
    connection: &Connection,
    book_id: &str,
    range: HighlightRangeDto,
    color: String,
    note: Option<String>,
) -> Result<HighlightDto, AppError> {
    validate_locator_book(book_id, &range.locator)?;
    let now = Utc::now().to_rfc3339();
    let highlight = HighlightDto {
        id: Uuid::new_v4().to_string(),
        book_id: book_id.to_string(),
        href: range.locator.href,
        spine_index: range.locator.spine_index,
        progression: range.locator.progression,
        total_progression: range.locator.total_progression,
        selected_text: range.selected_text,
        color,
        note,
        cfi: range.cfi,
        css_selector: range.css_selector,
        dom_range_json: range.dom_range_json,
        created_at: now.clone(),
        updated_at: now,
    };
    connection.execute(
        r#"
        INSERT INTO highlights (
          id, book_id, href, spine_index, progression, total_progression, selected_text,
          color, note, cfi, css_selector, dom_range_json, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
        "#,
        params![
            highlight.id,
            highlight.book_id,
            highlight.href,
            highlight.spine_index,
            highlight.progression,
            highlight.total_progression,
            highlight.selected_text,
            highlight.color,
            highlight.note,
            highlight.cfi,
            highlight.css_selector,
            highlight.dom_range_json,
            highlight.created_at,
            highlight.updated_at
        ],
    )?;
    Ok(highlight)
}

pub fn list_highlights(
    connection: &Connection,
    book_id: &str,
) -> Result<Vec<HighlightDto>, AppError> {
    let mut statement = connection.prepare(
        r#"
        SELECT id, book_id, href, spine_index, progression, total_progression, selected_text,
               color, note, cfi, css_selector, dom_range_json, created_at, updated_at
        FROM highlights
        WHERE book_id = ?1
        ORDER BY total_progression ASC
        "#,
    )?;
    let rows = statement.query_map(params![book_id], |row| {
        Ok(HighlightDto {
            id: row.get(0)?,
            book_id: row.get(1)?,
            href: row.get(2)?,
            spine_index: row.get(3)?,
            progression: row.get(4)?,
            total_progression: row.get(5)?,
            selected_text: row.get(6)?,
            color: row.get(7)?,
            note: row.get(8)?,
            cfi: row.get(9)?,
            css_selector: row.get(10)?,
            dom_range_json: row.get(11)?,
            created_at: row.get(12)?,
            updated_at: row.get(13)?,
        })
    })?;
    let mut highlights = Vec::new();
    for row in rows {
        highlights.push(row?);
    }
    Ok(highlights)
}

pub fn update_highlight_note(
    connection: &Connection,
    highlight_id: &str,
    note: String,
) -> Result<(), AppError> {
    connection.execute(
        "UPDATE highlights SET note = ?1, updated_at = ?2 WHERE id = ?3",
        params![note, Utc::now().to_rfc3339(), highlight_id],
    )?;
    Ok(())
}

fn validate_locator_book(book_id: &str, locator: &LocatorDto) -> Result<(), AppError> {
    if book_id != locator.book_id {
        return Err(AppError::new(
            "locator_mismatch",
            "Locator pertence a outro livro",
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{create_bookmark, create_highlight};
    use crate::models::{HighlightRangeDto, LocatorDto};
    use rusqlite::Connection;

    fn locator(book_id: &str) -> LocatorDto {
        LocatorDto {
            book_id: book_id.to_string(),
            href: "chapter.xhtml".to_string(),
            spine_index: 0,
            progression: 0.2,
            total_progression: 0.2,
            cfi: None,
            css_selector: None,
            text_snippet: None,
            display_page_index: Some(1),
            display_page_count: Some(5),
        }
    }

    #[test]
    fn create_bookmark_rejects_locator_for_another_book() {
        let connection = Connection::open_in_memory().expect("connection");

        let error = create_bookmark(&connection, "book-a", &locator("book-b"), None)
            .expect_err("locator mismatch");

        assert_eq!(error.code, "locator_mismatch");
    }

    #[test]
    fn create_highlight_rejects_locator_for_another_book() {
        let connection = Connection::open_in_memory().expect("connection");
        let range = HighlightRangeDto {
            locator: locator("book-b"),
            selected_text: "selected".to_string(),
            text_snippet: None,
            cfi: None,
            css_selector: None,
            dom_range_json: None,
        };

        let error = create_highlight(&connection, "book-a", range, "yellow".to_string(), None)
            .expect_err("locator mismatch");

        assert_eq!(error.code, "locator_mismatch");
    }
}
