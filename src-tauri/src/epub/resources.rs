use crate::error::AppError;
use std::{
    fs::{self, File},
    io::{Read, Write},
    path::{Component, Path, PathBuf},
};
use zip::ZipArchive;

pub fn extract_epub(epub_path: &Path, destination: &Path) -> Result<(), AppError> {
    fs::create_dir_all(destination)?;
    let file = File::open(epub_path)?;
    let mut archive = ZipArchive::new(file)?;
    let entry_count = archive.len();
    let mut total_uncompressed = 0_u64;

    for index in 0..entry_count {
        let mut item = archive.by_index(index)?;
        if item.is_dir() {
            continue;
        }
        total_uncompressed = total_uncompressed.saturating_add(item.size());
        crate::epub::validation::validate_zip_entry_limits(
            entry_count,
            total_uncompressed,
            item.size(),
        )?;
        let Some(relative_path) = safe_zip_path(item.name()) else {
            continue;
        };
        let target = destination.join(relative_path);
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent)?;
        }
        let mut output = File::create(target)?;
        std::io::copy(&mut item, &mut output)?;
    }

    Ok(())
}

pub fn read_zip_text(epub_path: &Path, href: &str) -> Result<String, AppError> {
    let bytes = read_zip_bytes(epub_path, href)?;
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

pub fn read_zip_bytes(epub_path: &Path, href: &str) -> Result<Vec<u8>, AppError> {
    let file = File::open(epub_path)?;
    let mut archive = ZipArchive::new(file)?;
    let entry_count = archive.len();
    let mut entry = archive.by_name(href)?;
    crate::epub::validation::validate_zip_entry_limits(entry_count, entry.size(), entry.size())?;
    let mut bytes = Vec::new();
    entry.read_to_end(&mut bytes)?;
    Ok(bytes)
}

pub fn write_bytes(path: &Path, bytes: &[u8]) -> Result<(), AppError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let mut file = File::create(path)?;
    file.write_all(bytes)?;
    Ok(())
}

fn safe_zip_path(name: &str) -> Option<PathBuf> {
    let path = Path::new(name);
    if path.is_absolute() {
        return None;
    }
    let mut safe = PathBuf::new();
    for component in path.components() {
        match component {
            Component::Normal(part) => safe.push(part),
            _ => return None,
        }
    }
    Some(safe)
}

#[cfg(test)]
mod tests {
    use super::safe_zip_path;
    use std::path::PathBuf;

    #[test]
    fn safe_zip_path_rejects_parent_directory() {
        assert!(safe_zip_path("../escape.xhtml").is_none());
    }

    #[test]
    fn safe_zip_path_rejects_absolute_path() {
        assert!(safe_zip_path("/tmp/escape.xhtml").is_none());
    }

    #[test]
    fn safe_zip_path_accepts_nested_relative_path() {
        assert_eq!(
            safe_zip_path("OPS/chapter.xhtml").expect("safe path"),
            PathBuf::from("OPS").join("chapter.xhtml")
        );
    }
}
