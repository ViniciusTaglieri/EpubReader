use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct AppPaths {
    root: PathBuf,
}

impl AppPaths {
    pub fn new(root: PathBuf) -> Self {
        Self { root }
    }

    pub fn ensure(&self) -> std::io::Result<()> {
        std::fs::create_dir_all(self.books_dir())?;
        std::fs::create_dir_all(self.cache_dir())?;
        std::fs::create_dir_all(self.exports_dir())?;
        Ok(())
    }

    pub fn database_path(&self) -> PathBuf {
        self.root.join("reader.db")
    }

    pub fn books_dir(&self) -> PathBuf {
        self.root.join("books")
    }

    pub fn book_dir(&self, book_id: &str) -> PathBuf {
        self.books_dir().join(book_id)
    }

    pub fn cache_dir(&self) -> PathBuf {
        self.root.join("cache")
    }

    pub fn exports_dir(&self) -> PathBuf {
        self.root.join("exports")
    }

    pub fn root(&self) -> &Path {
        &self.root
    }
}
