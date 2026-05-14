pub mod migrations;
pub mod repositories;
pub mod schema;

use crate::error::AppError;
use rusqlite::Connection;
use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct Db {
    path: PathBuf,
}

impl Db {
    pub fn new(path: PathBuf) -> Result<Self, AppError> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        Ok(Self { path })
    }

    pub fn connect(&self) -> Result<Connection, AppError> {
        let connection = Connection::open(&self.path)?;
        connection.execute_batch(
            "PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;",
        )?;
        Ok(connection)
    }

    pub fn migrate(&self) -> Result<(), AppError> {
        let connection = self.connect()?;
        migrations::run(&connection)
    }
}

#[cfg(test)]
mod tests {
    use super::Db;

    #[test]
    fn connect_sets_sqlite_pragmas() {
        let temp = tempfile::tempdir().expect("tempdir");
        let db = Db::new(temp.path().join("reader.sqlite")).expect("db");
        let connection = db.connect().expect("connect");

        let foreign_keys: i64 = connection
            .query_row("PRAGMA foreign_keys", [], |row| row.get(0))
            .expect("foreign_keys");
        let busy_timeout: i64 = connection
            .query_row("PRAGMA busy_timeout", [], |row| row.get(0))
            .expect("busy_timeout");
        let journal_mode: String = connection
            .query_row("PRAGMA journal_mode", [], |row| row.get(0))
            .expect("journal_mode");

        assert_eq!(foreign_keys, 1);
        assert!(busy_timeout >= 5000);
        assert_eq!(journal_mode, "wal");
    }
}
