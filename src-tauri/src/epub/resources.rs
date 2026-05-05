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

    for index in 0..archive.len() {
        let mut item = archive.by_index(index)?;
        if item.is_dir() {
            continue;
        }
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
    let mut entry = archive.by_name(href)?;
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
