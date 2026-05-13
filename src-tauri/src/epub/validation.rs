use crate::error::AppError;
use std::path::Path;

pub const MAX_EPUB_BYTES: u64 = 250 * 1024 * 1024;
pub const MAX_EXTRACTED_BYTES: u64 = 800 * 1024 * 1024;
pub const MAX_SINGLE_ENTRY_BYTES: u64 = 150 * 1024 * 1024;
pub const MAX_ZIP_ENTRIES: usize = 20_000;

pub fn validate_epub_source(path: &Path) -> Result<(), AppError> {
    let metadata = std::fs::metadata(path)?;
    if !metadata.is_file() {
        return Err(AppError::new(
            "invalid_file",
            "Selecione um arquivo EPUB válido.",
        ));
    }
    if metadata.len() == 0 || metadata.len() > MAX_EPUB_BYTES {
        return Err(AppError::new(
            "invalid_epub_size",
            "O arquivo EPUB está vazio ou é grande demais para importação segura.",
        ));
    }
    Ok(())
}

pub fn validate_zip_entry_limits(
    entries: usize,
    total_uncompressed: u64,
    entry_uncompressed: u64,
) -> Result<(), AppError> {
    if entries > MAX_ZIP_ENTRIES {
        return Err(AppError::new(
            "epub_too_many_files",
            "O EPUB contém arquivos demais e não pode ser importado com segurança.",
        ));
    }
    if entry_uncompressed > MAX_SINGLE_ENTRY_BYTES {
        return Err(AppError::new(
            "epub_entry_too_large",
            "Um arquivo interno do EPUB é grande demais.",
        ));
    }
    if total_uncompressed > MAX_EXTRACTED_BYTES {
        return Err(AppError::new(
            "epub_expanded_too_large",
            "O EPUB expande para um tamanho grande demais.",
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{
        validate_epub_source, validate_zip_entry_limits, MAX_EXTRACTED_BYTES, MAX_ZIP_ENTRIES,
    };

    #[test]
    fn validate_epub_source_rejects_non_file_or_empty_file() {
        let temp = tempfile::tempdir().expect("tempdir");
        let empty = temp.path().join("empty.epub");
        std::fs::write(&empty, b"").expect("write empty");

        let error = validate_epub_source(&empty).expect_err("reject empty epub");

        assert_eq!(error.code, "invalid_epub_size");
    }

    #[test]
    fn validate_zip_entry_limits_rejects_too_many_entries() {
        let result = validate_zip_entry_limits(MAX_ZIP_ENTRIES + 1, 1, 1);

        let error = result.expect_err("reject too many entries");
        assert_eq!(error.code, "epub_too_many_files");
    }

    #[test]
    fn validate_zip_entry_limits_rejects_large_uncompressed_total() {
        let result = validate_zip_entry_limits(10, MAX_EXTRACTED_BYTES + 1, 10);

        let error = result.expect_err("reject zip bomb");
        assert_eq!(error.code, "epub_expanded_too_large");
    }
}
