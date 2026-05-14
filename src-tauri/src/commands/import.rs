use crate::{
    db::repositories::books,
    epub::{
        parser::parse_epub,
        resources,
        search_index::{build_search_index, write_search_index},
        text::estimate_epub_text_length,
    },
    error::AppError,
    models::BookDto,
    storage::{files::sha256_file, staging::ImportStaging},
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
    crate::epub::validation::validate_epub_source(&source)?;

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
    let staging = ImportStaging::new(&state.paths.cache_dir())?;
    let staging_dir = staging.path().to_path_buf();
    let extracted_dir = staging_dir.join("extracted");
    fs::create_dir_all(&staging_dir)?;
    let local_epub = staging_dir.join("original.epub");
    fs::copy(&source, &local_epub)?;
    resources::extract_epub(&local_epub, &extracted_dir)?;
    let text_length = estimate_epub_text_length(&local_epub, &parsed);

    let cover_path = if let Some(cover_href) = &parsed.cover_href {
        let bytes = resources::read_zip_bytes(&local_epub, cover_href).ok();
        if let Some(bytes) = bytes {
            let cover = staging_dir.join("cover.jpg");
            resources::write_bytes(&cover, &bytes)?;
            Some(book_dir.join("cover.jpg").to_string_lossy().to_string())
        } else {
            None
        }
    } else {
        None
    };

    let manifest_path = staging_dir.join("manifest.json");
    resources::write_bytes(
        &manifest_path,
        serde_json::to_string_pretty(&parsed.dto(&book_id))?.as_bytes(),
    )?;
    let search_index = build_search_index(&local_epub, &parsed);
    write_search_index(&staging_dir.join("search_index.json"), &search_index)?;

    let now = Utc::now().to_rfc3339();
    let book = BookDto {
        id: book_id,
        title: parsed
            .metadata
            .title
            .unwrap_or_else(|| "Sem título".to_string()),
        subtitle: parsed.metadata.subtitle,
        author: parsed.metadata.author,
        publisher: parsed.metadata.publisher,
        language: parsed.metadata.language,
        description: parsed.metadata.description,
        identifier: parsed.metadata.identifier,
        published_at: parsed.metadata.published_at,
        subjects: parsed.metadata.subjects,
        file_hash,
        file_path: book_dir.join("original.epub").to_string_lossy().to_string(),
        cover_path,
        imported_at: now.clone(),
        updated_at: now,
        last_opened_at: None,
        reading_status: "unread".to_string(),
        total_progression: 0.0,
        text_length,
        is_favorite: false,
    };
    staging.promote(&book_dir)?;
    if let Err(error) = books::insert_book(&connection, &book) {
        let _ = fs::remove_dir_all(&book_dir);
        return Err(error);
    }
    Ok(book)
}

impl From<serde_json::Error> for AppError {
    fn from(error: serde_json::Error) -> Self {
        Self::new("serialization_error", error.to_string())
    }
}
