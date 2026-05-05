use crate::{db::repositories::collections, error::AppError, models::CollectionDto, AppState};
use tauri::State;

#[tauri::command]
pub fn create_collection(
    name: String,
    state: State<'_, AppState>,
) -> Result<CollectionDto, AppError> {
    let connection = state.db.connect()?;
    collections::create_collection(&connection, &name)
}

#[tauri::command]
pub fn list_collections(state: State<'_, AppState>) -> Result<Vec<CollectionDto>, AppError> {
    let connection = state.db.connect()?;
    collections::list_collections(&connection)
}

#[tauri::command]
pub fn update_collection(
    collection_id: String,
    name: String,
    book_ids: Vec<String>,
    state: State<'_, AppState>,
) -> Result<CollectionDto, AppError> {
    let connection = state.db.connect()?;
    collections::update_collection(&connection, &collection_id, &name, &book_ids)
}

#[tauri::command]
pub fn add_book_to_collection(
    collection_id: String,
    book_id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let connection = state.db.connect()?;
    collections::add_book_to_collection(&connection, &collection_id, &book_id)
}

#[tauri::command]
pub fn remove_book_from_collection(
    collection_id: String,
    book_id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let connection = state.db.connect()?;
    collections::remove_book_from_collection(&connection, &collection_id, &book_id)
}

#[tauri::command]
pub fn delete_collection(
    collection_id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let connection = state.db.connect()?;
    collections::delete_collection(&connection, &collection_id)
}
