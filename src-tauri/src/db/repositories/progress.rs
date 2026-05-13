use crate::{error::AppError, models::LocatorDto};
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};

pub fn save_progress(connection: &Connection, locator: &LocatorDto) -> Result<(), AppError> {
    let now = Utc::now().to_rfc3339();
    connection.execute(
        r#"
        INSERT INTO book_progress (
          book_id, href, spine_index, progression, total_progression, cfi,
          css_selector, text_snippet, display_page_index, display_page_count, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
        ON CONFLICT(book_id) DO UPDATE SET
          href = excluded.href,
          spine_index = excluded.spine_index,
          progression = excluded.progression,
          total_progression = excluded.total_progression,
          cfi = excluded.cfi,
          css_selector = excluded.css_selector,
          text_snippet = excluded.text_snippet,
          display_page_index = excluded.display_page_index,
          display_page_count = excluded.display_page_count,
          updated_at = excluded.updated_at
        "#,
        params![
            locator.book_id,
            locator.href,
            locator.spine_index,
            locator.progression,
            locator.total_progression,
            locator.cfi,
            locator.css_selector,
            locator.text_snippet,
            locator.display_page_index,
            locator.display_page_count,
            now
        ],
    )?;
    connection.execute(
        "UPDATE books SET total_progression = ?1, reading_status = ?2, updated_at = ?3, last_opened_at = ?3 WHERE id = ?4",
        params![
            locator.total_progression,
            status_for_progress(locator.total_progression),
            now,
            locator.book_id
        ],
    )?;
    Ok(())
}

pub fn get_progress(
    connection: &Connection,
    book_id: &str,
) -> Result<Option<LocatorDto>, AppError> {
    connection
        .query_row(
            r#"
            SELECT book_id, href, spine_index, progression, total_progression, cfi,
                   css_selector, text_snippet, display_page_index, display_page_count
            FROM book_progress
            WHERE book_id = ?1
            "#,
            params![book_id],
            |row| {
                Ok(LocatorDto {
                    book_id: row.get(0)?,
                    href: row.get(1)?,
                    spine_index: row.get(2)?,
                    progression: row.get(3)?,
                    total_progression: row.get(4)?,
                    cfi: row.get::<_, Option<String>>(5)?.unwrap_or_default(),
                    css_selector: row.get(6)?,
                    text_snippet: row.get(7)?,
                    display_page_index: row.get(8)?,
                    display_page_count: row.get(9)?,
                })
            },
        )
        .optional()
        .map_err(AppError::from)
}

fn status_for_progress(total_progression: f64) -> &'static str {
    if total_progression >= 0.995 {
        "finished"
    } else if total_progression > 0.0 {
        "reading"
    } else {
        "unread"
    }
}
