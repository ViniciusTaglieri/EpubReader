use crate::{error::AppError, models::ReadingSettingsDto};
use chrono::Utc;
use rusqlite::{params, Connection};

pub fn update_reading_settings(
    connection: &Connection,
    settings: ReadingSettingsDto,
) -> Result<(), AppError> {
    let now = Utc::now().to_rfc3339();
    connection.execute(
        r#"
        INSERT INTO reading_settings (
          id, name, font_family, font_size, line_height, margin, paragraph_spacing,
          theme, text_align, hyphenation_enabled, ligatures_enabled, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          font_family = excluded.font_family,
          font_size = excluded.font_size,
          line_height = excluded.line_height,
          margin = excluded.margin,
          paragraph_spacing = excluded.paragraph_spacing,
          theme = excluded.theme,
          text_align = excluded.text_align,
          hyphenation_enabled = excluded.hyphenation_enabled,
          ligatures_enabled = excluded.ligatures_enabled,
          updated_at = excluded.updated_at
        "#,
        params![
            settings.id,
            settings.name,
            settings.font_family,
            settings.font_size,
            settings.line_height,
            settings.margin,
            settings.paragraph_spacing,
            settings.theme,
            settings.text_align,
            settings.hyphenation_enabled as i64,
            settings.ligatures_enabled as i64,
            now
        ],
    )?;
    Ok(())
}
