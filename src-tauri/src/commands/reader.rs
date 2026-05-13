use crate::{
    db::repositories::{books, progress},
    epub::search_index,
    error::AppError,
    models::{LocatorDto, SearchResultDto},
    AppState,
};
use tauri::State;

#[tauri::command]
pub fn get_cover(book_id: String, state: State<'_, AppState>) -> Result<Vec<u8>, AppError> {
    let connection = state.db.connect()?;
    let book = books::get_book(&connection, &book_id)?
        .ok_or_else(|| AppError::new("book_not_found", "Livro não encontrado"))?;
    let Some(path) = book.cover_path else {
        return Ok(Vec::new());
    };
    Ok(std::fs::read(path)?)
}

#[tauri::command]
pub fn read_book(book_id: String, state: State<'_, AppState>) -> Result<Vec<u8>, AppError> {
    let connection = state.db.connect()?;
    let book = books::get_book(&connection, &book_id)?
        .ok_or_else(|| AppError::new("book_not_found", "Livro não encontrado"))?;
    Ok(std::fs::read(book.file_path)?)
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
    if locator.cfi.trim().is_empty() {
        return Err(AppError::new(
            "missing_cfi",
            "Progresso de leitura precisa de um CFI valido",
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
        .ok_or_else(|| AppError::new("book_not_found", "Livro não encontrado"))?;
    let needle = query.to_lowercase();
    if needle.trim().is_empty() {
        return Ok(Vec::new());
    }

    let search_index_path = std::path::Path::new(&book.file_path)
        .parent()
        .ok_or_else(|| AppError::new("invalid_book_storage_path", "Caminho do livro inválido"))?
        .join("search_index.json");
    let entries = search_index::read_search_index(&search_index_path)?;
    let entry_count = entries.len().max(1);
    let mut results = Vec::new();
    for entry in entries {
        if let Some(snippet) = search_index::snippet_for_query(&entry.text, &needle, 80) {
            let spine_index = entry.spine_index;
            results.push(SearchResultDto {
                href: entry.href,
                spine_index: spine_index as i64,
                progression: 0.0,
                total_progression: spine_index as f64 / entry_count as f64,
                snippet,
            });
        }
        if results.len() >= 50 {
            break;
        }
    }
    Ok(results)
}
