use crate::{error::AppError, models::ReadingSettingsDto};
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};

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

pub fn get_reading_settings(
    connection: &Connection,
    settings_id: &str,
) -> Result<Option<ReadingSettingsDto>, AppError> {
    connection
        .query_row(
            r#"
            SELECT id, name, font_family, font_size, line_height, margin, paragraph_spacing,
                   theme, text_align, hyphenation_enabled, ligatures_enabled
            FROM reading_settings
            WHERE id = ?1
            "#,
            params![settings_id],
            |row| {
                Ok(ReadingSettingsDto {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    font_family: row.get(2)?,
                    font_size: row.get(3)?,
                    line_height: row.get(4)?,
                    margin: row.get(5)?,
                    paragraph_spacing: row.get(6)?,
                    theme: row.get(7)?,
                    text_align: row.get(8)?,
                    hyphenation_enabled: row.get(9)?,
                    ligatures_enabled: row.get(10)?,
                })
            },
        )
        .optional()
        .map_err(AppError::from)
}

#[cfg(test)]
mod tests {
    use super::{get_reading_settings, update_reading_settings};
    use crate::{db::migrations, models::ReadingSettingsDto};
    use rusqlite::Connection;

    #[test]
    fn reading_settings_round_trip() {
        let connection = Connection::open_in_memory().expect("connection");
        migrations::run(&connection).expect("migrate");
        let settings = ReadingSettingsDto {
            id: "default".to_string(),
            name: "Default".to_string(),
            font_family: "Georgia".to_string(),
            font_size: 22,
            line_height: 1.8,
            margin: 88,
            paragraph_spacing: 1.2,
            theme: "dark".to_string(),
            text_align: "justify".to_string(),
            hyphenation_enabled: false,
            ligatures_enabled: true,
        };

        update_reading_settings(&connection, settings).expect("save");

        let loaded = get_reading_settings(&connection, "default")
            .expect("load")
            .expect("settings");
        assert_eq!(loaded.font_size, 22);
        assert_eq!(loaded.theme, "dark");
        assert!(!loaded.hyphenation_enabled);
    }
}
