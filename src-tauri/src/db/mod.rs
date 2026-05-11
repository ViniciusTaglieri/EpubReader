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
        connection.execute_batch("PRAGMA foreign_keys = ON;")?;
        Ok(connection)
    }

    pub fn migrate(&self) -> Result<(), AppError> {
        let connection = self.connect()?;
        migrations::run(&connection)
    }
}
