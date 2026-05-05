use crate::{
    db::repositories::{books, progress},
    epub::{parser::parse_epub, resources::read_zip_text, sanitizer::sanitize_xhtml},
    error::AppError,
    models::{EpubManifestDto, LocatorDto, ResourceDto, SearchResultDto},
    AppState,
};
use tauri::State;

#[tauri::command]
pub fn get_book_manifest(
    book_id: String,
    state: State<'_, AppState>,
) -> Result<EpubManifestDto, AppError> {
    let connection = state.db.connect()?;
    let book = books::get_book(&connection, &book_id)?
        .ok_or_else(|| AppError::new("book_not_found", "Livro nao encontrado"))?;
    Ok(parse_epub(book.file_path.as_ref())?.dto(&book_id))
}

#[tauri::command]
pub fn get_spine_resource(
    book_id: String,
    href: String,
    state: State<'_, AppState>,
) -> Result<ResourceDto, AppError> {
    let connection = state.db.connect()?;
    let book = books::get_book(&connection, &book_id)?
        .ok_or_else(|| AppError::new("book_not_found", "Livro nao encontrado"))?;
    let parsed = parse_epub(book.file_path.as_ref())?;
    let item = parsed
        .spine
        .iter()
        .find(|item| item.href == href)
        .ok_or_else(|| AppError::new("resource_not_found", "Recurso fora do spine"))?;
    let contents = sanitize_xhtml(&read_zip_text(book.file_path.as_ref(), &href)?);
    Ok(ResourceDto {
        href,
        media_type: item.media_type.clone(),
        contents,
    })
}

#[tauri::command]
pub fn get_cover(book_id: String, state: State<'_, AppState>) -> Result<Vec<u8>, AppError> {
    let connection = state.db.connect()?;
    let book = books::get_book(&connection, &book_id)?
        .ok_or_else(|| AppError::new("book_not_found", "Livro nao encontrado"))?;
    let Some(path) = book.cover_path else {
        return Ok(Vec::new());
    };
    Ok(std::fs::read(path)?)
}

#[tauri::command]
pub fn save_progress(
    book_id: String,
    locator: LocatorDto,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    if book_id != locator.book_id {
        return Err(AppError::new(
            "locator_mismatch",
            "Locator pertence a outro livro",
        ));
    }
    let connection = state.db.connect()?;
    progress::save_progress(&connection, &locator)
}

#[tauri::command]
pub fn get_progress(
    book_id: String,
    state: State<'_, AppState>,
) -> Result<Option<LocatorDto>, AppError> {
    let connection = state.db.connect()?;
    progress::get_progress(&connection, &book_id)
}

#[tauri::command]
pub fn search_in_book(
    book_id: String,
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<SearchResultDto>, AppError> {
    let connection = state.db.connect()?;
    let book = books::get_book(&connection, &book_id)?
        .ok_or_else(|| AppError::new("book_not_found", "Livro nao encontrado"))?;
    let parsed = parse_epub(book.file_path.as_ref())?;
    let needle = query.to_lowercase();
    if needle.trim().is_empty() {
        return Ok(Vec::new());
    }

    let mut results = Vec::new();
    for (index, item) in parsed.spine.iter().enumerate() {
        let text = read_zip_text(book.file_path.as_ref(), &item.href).unwrap_or_default();
        let normalized = text.to_lowercase();
        if let Some(position) = normalized.find(&needle) {
            let start = position.saturating_sub(80);
            let end = (position + needle.len() + 80).min(text.len());
            results.push(SearchResultDto {
                href: item.href.clone(),
                spine_index: index as i64,
                progression: 0.0,
                total_progression: index as f64 / parsed.spine.len().max(1) as f64,
                snippet: text[start..end].replace('\n', " "),
            });
        }
    }
    Ok(results)
}
