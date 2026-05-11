use crate::error::AppError;
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File},
    io::{BufReader, Read},
    path::Path,
};

pub fn sha256_file(path: &Path) -> Result<String, AppError> {
    let file = File::open(path)?;
    let mut reader = BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 16 * 1024];

    loop {
        let read = reader.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }

    Ok(hex::encode(hasher.finalize()))
}

pub fn remove_book_storage(books_dir: &Path, book_id: &str) -> Result<(), AppError> {
    let book_dir = books_dir.join(book_id);
    if !book_dir.exists() {
        return Ok(());
    }

    let books_root = books_dir.canonicalize()?;
    let target = book_dir.canonicalize()?;
    if target == books_root || !target.starts_with(&books_root) {
        return Err(AppError::new(
            "invalid_book_storage_path",
            "Caminho de armazenamento do livro invalido",
        ));
    }

    fs::remove_dir_all(target)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::remove_book_storage;

    #[test]
    fn remove_book_storage_deletes_only_book_directory() {
        let temp = tempfile::tempdir().expect("tempdir");
        let books_dir = temp.path().join("books");
        let book_dir = books_dir.join("book-1");
        std::fs::create_dir_all(book_dir.join("extracted")).expect("create book dir");
        std::fs::write(book_dir.join("original.epub"), b"epub").expect("write epub");

        remove_book_storage(&books_dir, "book-1").expect("remove book storage");

        assert!(!book_dir.exists());
        assert!(books_dir.exists());
    }

    #[test]
    fn remove_book_storage_rejects_path_escape() {
        let temp = tempfile::tempdir().expect("tempdir");
        let books_dir = temp.path().join("books");
        std::fs::create_dir_all(&books_dir).expect("create books dir");

        let error = remove_book_storage(&books_dir, "..").expect_err("reject escape");

        assert_eq!(error.code, "invalid_book_storage_path");
        assert!(books_dir.exists());
    }
}
