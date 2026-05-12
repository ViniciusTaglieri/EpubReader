use crate::{
    db::repositories::{books, progress},
    epub::{parser::parse_epub, resources::read_zip_text},
    error::AppError,
    models::{LocatorDto, SearchResultDto},
    AppState,
};
use tauri::State;

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
pub fn read_book(book_id: String, state: State<'_, AppState>) -> Result<Vec<u8>, AppError> {
    let connection = state.db.connect()?;
    let book = books::get_book(&connection, &book_id)?
        .ok_or_else(|| AppError::new("book_not_found", "Livro nao encontrado"))?;
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
            results.push(SearchResultDto {
                href: item.href.clone(),
                spine_index: index as i64,
                progression: 0.0,
                total_progression: index as f64 / parsed.spine.len().max(1) as f64,
                snippet: snippet_around_match(&text, position, needle.len(), 80),
            });
        }
    }
    Ok(results)
}

fn snippet_around_match(
    text: &str,
    byte_position: usize,
    needle_len: usize,
    context_chars: usize,
) -> String {
    let match_end = byte_position.saturating_add(needle_len).min(text.len());
    let mut boundaries = text
        .char_indices()
        .map(|(index, _)| index)
        .collect::<Vec<_>>();
    boundaries.push(text.len());

    let start_char = boundaries
        .iter()
        .position(|index| *index >= byte_position)
        .unwrap_or(0)
        .saturating_sub(context_chars);
    let end_char = boundaries
        .iter()
        .position(|index| *index >= match_end)
        .unwrap_or_else(|| boundaries.len().saturating_sub(1))
        .saturating_add(context_chars)
        .min(boundaries.len().saturating_sub(1));

    text[boundaries[start_char]..boundaries[end_char]].replace('\n', " ")
}

#[cfg(test)]
mod tests {
    use super::snippet_around_match;

    #[test]
    fn snippet_around_match_handles_accented_text() {
        let text = "Inicio da historia com acao, coracao e cafe no capitulo.";
        let needle = "coracao";
        let position = text.to_lowercase().find(needle).expect("match");

        let snippet = snippet_around_match(text, position, needle.len(), 8);

        assert!(snippet.contains("coracao"));
    }

    #[test]
    fn snippet_around_match_handles_multibyte_boundaries() {
        let text = "Inicio da história com ação, coração e café no capítulo.";
        let needle = "coração";
        let position = text.to_lowercase().find(needle).expect("match");

        let snippet = snippet_around_match(text, position, needle.len(), 8);

        assert!(snippet.contains("coração"));
    }
}
