use crate::{
    db::repositories::annotations,
    error::AppError,
    models::{BookmarkDto, HighlightDto, HighlightRangeDto, LocatorDto},
    AppState,
};
use tauri::State;

#[tauri::command]
pub fn create_bookmark(
    book_id: String,
    locator: LocatorDto,
    label: Option<String>,
    state: State<'_, AppState>,
) -> Result<BookmarkDto, AppError> {
    let connection = state.db.connect()?;
    annotations::create_bookmark(&connection, &book_id, &locator, label)
}

#[tauri::command]
pub fn list_bookmarks(book_id: String, state: State<'_, AppState>) -> Result<Vec<BookmarkDto>, AppError> {
    let connection = state.db.connect()?;
    annotations::list_bookmarks(&connection, &book_id)
}

#[tauri::command]
pub fn delete_bookmark(bookmark_id: String, state: State<'_, AppState>) -> Result<(), AppError> {
    let connection = state.db.connect()?;
    annotations::delete_bookmark(&connection, &bookmark_id)
}

#[tauri::command]
pub fn create_highlight(
    book_id: String,
    range: HighlightRangeDto,
    color: String,
    note: Option<String>,
    state: State<'_, AppState>,
) -> Result<HighlightDto, AppError> {
    let connection = state.db.connect()?;
    annotations::create_highlight(&connection, &book_id, range, color, note)
}

#[tauri::command]
pub fn list_highlights(book_id: String, state: State<'_, AppState>) -> Result<Vec<HighlightDto>, AppError> {
    let connection = state.db.connect()?;
    annotations::list_highlights(&connection, &book_id)
}

#[tauri::command]
pub fn update_highlight_note(
    highlight_id: String,
    note: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let connection = state.db.connect()?;
    annotations::update_highlight_note(&connection, &highlight_id, note)
}
