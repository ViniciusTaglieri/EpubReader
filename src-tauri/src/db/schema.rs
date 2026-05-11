use crate::error::AppError;
use rusqlite::Connection;

pub fn current_version(connection: &Connection) -> Result<i64, AppError> {
    connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(AppError::from)
}

pub fn set_version(connection: &Connection, version: i64) -> Result<(), AppError> {
    connection.execute_batch(&format!("PRAGMA user_version = {version}"))?;
    Ok(())
}
