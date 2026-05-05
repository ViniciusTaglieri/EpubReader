use crate::{
    db::repositories::books,
    epub::parser::parse_epub,
    error::AppError,
    models::{BookDetailDto, BookDto},
    AppState,
};
use tauri::State;

#[tauri::command]
pub fn list_books(state: State<'_, AppState>) -> Result<Vec<BookDto>, AppError> {
    let connection = state.db.connect()?;
    books::list_books(&connection)
}

#[tauri::command]
pub fn get_book(book_id: String, state: State<'_, AppState>) -> Result<BookDetailDto, AppError> {
    let connection = state.db.connect()?;
    let book = books::get_book(&connection, &book_id)?
        .ok_or_else(|| AppError::new("book_not_found", "Livro nao encontrado"))?;
    let manifest = parse_epub(book.file_path.as_ref())
        .ok()
        .map(|parsed| parsed.dto(&book_id));
    Ok(BookDetailDto { book, manifest })
}

#[tauri::command]
pub fn delete_book(book_id: String, delete_file: bool, state: State<'_, AppState>) -> Result<(), AppError> {
    let connection = state.db.connect()?;
    books::delete_book(&connection, &book_id)?;
    if delete_file {
        let book_dir = state.paths.book_dir(&book_id);
        if book_dir.exists() {
            std::fs::remove_dir_all(book_dir)?;
        }
    }
    Ok(())
}
