use crate::{
    db::repositories::{books, progress},
    epub::{
        parser::{normalize_href, parse_epub},
        resources::{read_zip_bytes, read_zip_text},
        sanitizer::sanitize_xhtml,
    },
    error::AppError,
    models::{EpubManifestDto, LocatorDto, ResourceDto, SearchResultDto},
    AppState,
};
use base64::{engine::general_purpose, Engine as _};
use tauri::State;

#[tauri::command]
pub fn get_book_manifest(
    book_id: String,
    state: State<'_, AppState>,
) -> Result<EpubManifestDto, AppError> {
    let connection = state.db.connect()?;
    let book = books::get_book(&connection, &book_id)?
        .ok_or_else(|| AppError::new("book_not_found", "Livro nao encontrado"))?;
    Ok(parse_epub(book.file_path.as_ref())?.dto(&book_id))
}

#[tauri::command]
pub fn get_spine_resource(
    book_id: String,
    href: String,
    state: State<'_, AppState>,
) -> Result<ResourceDto, AppError> {
    let connection = state.db.connect()?;
    let book = books::get_book(&connection, &book_id)?
        .ok_or_else(|| AppError::new("book_not_found", "Livro nao encontrado"))?;
    let parsed = parse_epub(book.file_path.as_ref())?;
    let item = parsed
        .spine
        .iter()
        .find(|item| item.href == href)
        .ok_or_else(|| AppError::new("resource_not_found", "Recurso fora do spine"))?;
    let contents = inline_epub_images(
        book.file_path.as_ref(),
        &href,
        &sanitize_xhtml(&read_zip_text(book.file_path.as_ref(), &href)?),
    );
    Ok(ResourceDto {
        href,
        media_type: item.media_type.clone(),
        contents,
    })
}

#[tauri::command]
pub fn get_book_rendition(
    book_id: String,
    state: State<'_, AppState>,
) -> Result<ResourceDto, AppError> {
    let connection = state.db.connect()?;
    let book = books::get_book(&connection, &book_id)?
        .ok_or_else(|| AppError::new("book_not_found", "Livro nao encontrado"))?;
    let parsed = parse_epub(book.file_path.as_ref())?;
    let mut contents = String::new();

    for (index, item) in parsed.spine.iter().enumerate() {
        let chapter_source = read_zip_text(book.file_path.as_ref(), &item.href)?;
        let chapter_body = extract_body_markup(&chapter_source);
        let chapter = sanitize_xhtml(&chapter_body);
        let chapter = inline_epub_images(book.file_path.as_ref(), &item.href, &chapter);
        let title = item
            .title
            .clone()
            .unwrap_or_else(|| format!("Spine {}", index + 1));
        contents.push_str(&format!(
            r#"<section class="reader-spine-section" data-reader-spine-index="{index}" data-reader-href="{}" aria-label="{}">{}</section>"#,
            escape_attr(&item.href),
            escape_attr(&title),
            chapter
        ));
    }

    Ok(ResourceDto {
        href: "__book__.xhtml".to_string(),
        media_type: "application/xhtml+xml".to_string(),
        contents,
    })
}

#[tauri::command]
pub fn get_cover(book_id: String, state: State<'_, AppState>) -> Result<Vec<u8>, AppError> {
    let connection = state.db.connect()?;
    let book = books::get_book(&connection, &book_id)?
        .ok_or_else(|| AppError::new("book_not_found", "Livro nao encontrado"))?;
    let Some(path) = book.cover_path else {
        return Ok(Vec::new());
    };
    Ok(std::fs::read(path)?)
}

#[tauri::command]
pub fn save_progress(
    book_id: String,
    locator: LocatorDto,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    if book_id != locator.book_id {
        return Err(AppError::new(
            "locator_mismatch",
            "Locator pertence a outro livro",
        ));
    }
    let connection = state.db.connect()?;
    progress::save_progress(&connection, &locator)
}

#[tauri::command]
pub fn get_progress(
    book_id: String,
    state: State<'_, AppState>,
) -> Result<Option<LocatorDto>, AppError> {
    let connection = state.db.connect()?;
    progress::get_progress(&connection, &book_id)
}

#[tauri::command]
pub fn search_in_book(
    book_id: String,
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<SearchResultDto>, AppError> {
    let connection = state.db.connect()?;
    let book = books::get_book(&connection, &book_id)?
        .ok_or_else(|| AppError::new("book_not_found", "Livro nao encontrado"))?;
    let parsed = parse_epub(book.file_path.as_ref())?;
    let needle = query.to_lowercase();
    if needle.trim().is_empty() {
        return Ok(Vec::new());
    }

    let mut results = Vec::new();
    for (index, item) in parsed.spine.iter().enumerate() {
        let text = read_zip_text(book.file_path.as_ref(), &item.href).unwrap_or_default();
        let normalized = text.to_lowercase();
        if let Some(position) = normalized.find(&needle) {
            results.push(SearchResultDto {
                href: item.href.clone(),
                spine_index: index as i64,
                progression: 0.0,
                total_progression: index as f64 / parsed.spine.len().max(1) as f64,
                snippet: snippet_around_match(&text, position, needle.len(), 80),
            });
        }
    }
    Ok(results)
}

fn snippet_around_match(
    text: &str,
    byte_position: usize,
    needle_len: usize,
    context_chars: usize,
) -> String {
    let match_end = byte_position.saturating_add(needle_len).min(text.len());
    let mut boundaries = text
        .char_indices()
        .map(|(index, _)| index)
        .collect::<Vec<_>>();
    boundaries.push(text.len());

    let start_char = boundaries
        .iter()
        .position(|index| *index >= byte_position)
        .unwrap_or(0)
        .saturating_sub(context_chars);
    let end_char = boundaries
        .iter()
        .position(|index| *index >= match_end)
        .unwrap_or_else(|| boundaries.len().saturating_sub(1))
        .saturating_add(context_chars)
        .min(boundaries.len().saturating_sub(1));

    text[boundaries[start_char]..boundaries[end_char]].replace('\n', " ")
}

fn inline_epub_images(epub_path: &std::path::Path, resource_href: &str, html: &str) -> String {
    let with_img_sources = inline_epub_image_attribute(epub_path, resource_href, html, "src=");
    inline_epub_image_attribute(epub_path, resource_href, &with_img_sources, "xlink:href=")
}

fn inline_epub_image_attribute(
    epub_path: &std::path::Path,
    resource_href: &str,
    html: &str,
    attribute: &str,
) -> String {
    let mut output = String::with_capacity(html.len());
    let mut cursor = 0;
    let lower = html.to_ascii_lowercase();
    let attribute_lower = attribute.to_ascii_lowercase();

    while let Some(relative_start) = lower[cursor..].find(&attribute_lower) {
        let start = cursor + relative_start;
        output.push_str(&html[cursor..start]);
        output.push_str(&html[start..start + attribute.len()]);
        let value_start = start + attribute.len();
        let Some(quote) = html[value_start..].chars().next() else {
            cursor = value_start;
            continue;
        };
        if quote != '"' && quote != '\'' {
            cursor = value_start;
            continue;
        }
        let content_start = value_start + quote.len_utf8();
        let Some(relative_end) = html[content_start..].find(quote) else {
            cursor = content_start;
            continue;
        };
        let content_end = content_start + relative_end;
        let src = &html[content_start..content_end];
        let replacement =
            image_data_uri(epub_path, resource_href, src).unwrap_or_else(|| src.to_string());
        output.push(quote);
        output.push_str(&replacement);
        output.push(quote);
        cursor = content_end + quote.len_utf8();
    }

    output.push_str(&html[cursor..]);
    output
}

fn extract_body_markup(input: &str) -> String {
    let lower = input.to_ascii_lowercase();
    let Some(body_open_start) = lower.find("<body") else {
        return input.to_string();
    };
    let Some(body_open_end) = lower[body_open_start..].find('>') else {
        return input.to_string();
    };
    let body_start = body_open_start + body_open_end + 1;
    let Some(body_close_start) = lower[body_start..].find("</body>") else {
        return input[body_start..].to_string();
    };
    input[body_start..body_start + body_close_start].to_string()
}

fn image_data_uri(epub_path: &std::path::Path, resource_href: &str, src: &str) -> Option<String> {
    if src.starts_with("data:") || src.starts_with("http://") || src.starts_with("https://") {
        return None;
    }
    let base = std::path::Path::new(resource_href)
        .parent()
        .and_then(|parent| parent.to_str())
        .unwrap_or("");
    let href = normalize_href(base, src);
    let bytes = read_zip_bytes(epub_path, &href).ok()?;
    let mime = image_mime(&href);
    Some(format!(
        "data:{mime};base64,{}",
        general_purpose::STANDARD.encode(bytes)
    ))
}

fn image_mime(href: &str) -> &'static str {
    let lower = href.to_ascii_lowercase();
    if lower.ends_with(".png") {
        "image/png"
    } else if lower.ends_with(".gif") {
        "image/gif"
    } else if lower.ends_with(".svg") {
        "image/svg+xml"
    } else if lower.ends_with(".webp") {
        "image/webp"
    } else {
        "image/jpeg"
    }
}

fn escape_attr(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

#[cfg(test)]
mod tests {
    use super::snippet_around_match;

    #[test]
    fn snippet_around_match_handles_accented_text() {
        let text = "Inicio da historia com acao, coracao e cafe no capitulo.";
        let needle = "coracao";
        let position = text.to_lowercase().find(needle).expect("match");

        let snippet = snippet_around_match(text, position, needle.len(), 8);

        assert!(snippet.contains("coracao"));
    }

    #[test]
    fn snippet_around_match_handles_multibyte_boundaries() {
        let text = "Inicio da história com ação, coração e café no capítulo.";
        let needle = "coração";
        let position = text.to_lowercase().find(needle).expect("match");

        let snippet = snippet_around_match(text, position, needle.len(), 8);

        assert!(snippet.contains("coração"));
    }
}
