mod commands;
mod db;
mod epub;
mod error;
mod models;
mod storage;

use db::Db;
use storage::paths::AppPaths;
use tauri::Manager;

pub struct AppState {
    pub paths: AppPaths,
    pub db: Db,
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let paths = AppPaths::new(app.path().app_data_dir()?);
            paths.ensure()?;
            let db = Db::new(paths.database_path())?;
            db.migrate()?;
            app.manage(AppState { paths, db });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::import::import_epub,
            commands::books::list_books,
            commands::books::get_book,
            commands::books::delete_book,
            commands::reader::get_book_manifest,
            commands::reader::get_spine_resource,
            commands::reader::get_cover,
            commands::reader::save_progress,
            commands::reader::get_progress,
            commands::annotations::create_bookmark,
            commands::annotations::list_bookmarks,
            commands::annotations::delete_bookmark,
            commands::annotations::create_highlight,
            commands::annotations::list_highlights,
            commands::annotations::update_highlight_note,
            commands::reader::search_in_book,
            commands::settings::update_reading_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running Reading System");
}
