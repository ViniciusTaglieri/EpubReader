use crate::{
    db::repositories::books,
    epub::{parser::parse_epub, resources, text::estimate_epub_text_length},
    error::AppError,
    models::BookDto,
    storage::files::sha256_file,
    AppState,
};
use chrono::Utc;
use std::{fs, path::PathBuf};
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn import_epub(path: String, state: State<'_, AppState>) -> Result<BookDto, AppError> {
    let source = PathBuf::from(path);
    if source
        .extension()
        .and_then(|ext| ext.to_str())
        .map(str::to_lowercase)
        != Some("epub".into())
    {
        return Err(AppError::new(
            "invalid_file_type",
            "Selecione um arquivo .epub",
        ));
    }

    let file_hash = sha256_file(&source)?;
    let connection = state.db.connect()?;
    if let Some(existing) = books::get_book_by_hash(&connection, &file_hash)? {
        return Ok(existing);
    }

    let parsed = parse_epub(&source)?;
    if parsed.spine.is_empty() {
        return Err(AppError::new("invalid_epub", "EPUB sem spine de leitura"));
    }

    let book_id = Uuid::new_v4().to_string();
    let book_dir = state.paths.book_dir(&book_id);
    let extracted_dir = book_dir.join("extracted");
    fs::create_dir_all(&book_dir)?;
    let local_epub = book_dir.join("original.epub");
    fs::copy(&source, &local_epub)?;
    resources::extract_epub(&local_epub, &extracted_dir)?;
    let text_length = estimate_epub_text_length(&local_epub, &parsed);

    let cover_path = if let Some(cover_href) = &parsed.cover_href {
        let bytes = resources::read_zip_bytes(&local_epub, cover_href).ok();
        if let Some(bytes) = bytes {
            let cover = book_dir.join("cover.jpg");
            resources::write_bytes(&cover, &bytes)?;
            Some(cover.to_string_lossy().to_string())
        } else {
            None
        }
    } else {
        None
    };

    let manifest_path = book_dir.join("manifest.json");
    resources::write_bytes(
        &manifest_path,
        serde_json::to_string_pretty(&parsed.dto(&book_id))?.as_bytes(),
    )?;
    resources::write_bytes(book_dir.join("search_index.json").as_path(), b"[]")?;

    let now = Utc::now().to_rfc3339();
    let book = BookDto {
        id: book_id,
        title: parsed
            .metadata
            .title
            .unwrap_or_else(|| "Sem titulo".to_string()),
        subtitle: parsed.metadata.subtitle,
        author: parsed.metadata.author,
        publisher: parsed.metadata.publisher,
        language: parsed.metadata.language,
        description: parsed.metadata.description,
        identifier: parsed.metadata.identifier,
        file_hash,
        file_path: local_epub.to_string_lossy().to_string(),
        cover_path,
        imported_at: now.clone(),
        updated_at: now,
        last_opened_at: None,
        reading_status: "unread".to_string(),
        total_progression: 0.0,
        text_length,
    };
    books::insert_book(&connection, &book)?;
    Ok(book)
}

impl From<serde_json::Error> for AppError {
    fn from(error: serde_json::Error) -> Self {
        Self::new("serialization_error", error.to_string())
    }
}
