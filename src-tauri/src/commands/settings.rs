use crate::{
    db::repositories::settings,
    error::AppError,
    models::ReadingSettingsDto,
    AppState,
};
use tauri::State;

#[tauri::command]
pub fn update_reading_settings(
    settings: ReadingSettingsDto,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let connection = state.db.connect()?;
    settings::update_reading_settings(&connection, settings)
}
