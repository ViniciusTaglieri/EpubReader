use crate::error::AppError;
use std::{
    fs,
    path::{Path, PathBuf},
};
use uuid::Uuid;

#[derive(Debug)]
pub struct ImportStaging {
    path: PathBuf,
    promoted: bool,
}

impl ImportStaging {
    pub fn new(cache_dir: &Path) -> Result<Self, AppError> {
        let path = cache_dir.join(format!("import-{}", Uuid::new_v4()));
        fs::create_dir_all(&path)?;
        Ok(Self {
            path,
            promoted: false,
        })
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn promote(mut self, final_path: &Path) -> Result<(), AppError> {
        if final_path.exists() {
            fs::remove_dir_all(final_path)?;
        }
        if let Some(parent) = final_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::rename(&self.path, final_path)?;
        self.promoted = true;
        Ok(())
    }
}

impl Drop for ImportStaging {
    fn drop(&mut self) {
        if !self.promoted {
            let _ = fs::remove_dir_all(&self.path);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::ImportStaging;

    #[test]
    fn import_staging_removes_unpromoted_directory_on_drop() {
        let temp = tempfile::tempdir().expect("tempdir");
        let staging_path = {
            let staging = ImportStaging::new(temp.path()).expect("staging");
            let path = staging.path().to_path_buf();
            std::fs::write(path.join("original.epub"), b"epub").expect("write");
            assert!(path.exists());
            path
        };

        assert!(!staging_path.exists());
    }

    #[test]
    fn import_staging_promotes_directory_and_keeps_files() {
        let temp = tempfile::tempdir().expect("tempdir");
        let final_path = temp.path().join("books").join("book-1");
        let staging = ImportStaging::new(temp.path()).expect("staging");
        std::fs::write(staging.path().join("original.epub"), b"epub").expect("write");

        staging.promote(&final_path).expect("promote");

        assert!(final_path.join("original.epub").exists());
    }
}
