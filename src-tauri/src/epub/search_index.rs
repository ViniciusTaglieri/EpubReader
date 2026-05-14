use crate::{
    epub::{manifest::ParsedEpub, resources::read_zip_text},
    error::AppError,
};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchIndexEntry {
    pub href: String,
    pub spine_index: usize,
    pub text: String,
}

pub fn build_search_index(epub_path: &Path, parsed: &ParsedEpub) -> Vec<SearchIndexEntry> {
    parsed
        .spine
        .iter()
        .enumerate()
        .filter_map(|(spine_index, item)| {
            let markup = read_zip_text(epub_path, &item.href).ok()?;
            let text = text_without_tags(&markup);
            if text.is_empty() {
                return None;
            }
            Some(SearchIndexEntry {
                href: item.href.clone(),
                spine_index,
                text,
            })
        })
        .collect()
}

pub fn snippet_for_query(text: &str, query: &str, context_chars: usize) -> Option<String> {
    let needle = query.trim().to_lowercase();
    if needle.is_empty() {
        return None;
    }
    let normalized = text.to_lowercase();
    let byte_position = normalized.find(&needle)?;
    Some(snippet_around_byte_match(text, byte_position, needle.len(), context_chars))
}

pub fn read_search_index(path: &Path) -> Result<Vec<SearchIndexEntry>, AppError> {
    let bytes = std::fs::read(path)?;
    serde_json::from_slice(&bytes).map_err(AppError::from)
}

pub fn write_search_index(path: &Path, entries: &[SearchIndexEntry]) -> Result<(), AppError> {
    let bytes = serde_json::to_vec(entries).map_err(AppError::from)?;
    crate::epub::resources::write_bytes(path, &bytes)
}

fn snippet_around_byte_match(
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

fn text_without_tags(markup: &str) -> String {
    let mut in_tag = false;
    let mut output = String::new();
    let mut previous_was_space = true;

    for character in markup.chars() {
        match character {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if in_tag => {}
            _ if character.is_whitespace() => {
                if !previous_was_space {
                    output.push(' ');
                    previous_was_space = true;
                }
            }
            _ => {
                output.push(character);
                previous_was_space = false;
            }
        }
    }

    output.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::snippet_for_query;

    #[test]
    fn snippet_finds_case_insensitive_match() {
        let text = "Capitulo inicial com uma palavra importante no meio.";
        let result = snippet_for_query(text, "IMPORTANTE", 12).expect("snippet");

        assert!(result.contains("importante"));
    }

    #[test]
    fn snippet_returns_none_for_blank_query() {
        assert!(snippet_for_query("texto", "   ", 12).is_none());
    }

    #[test]
    fn snippet_handles_multibyte_boundaries() {
        let text = "Início da história com ação, coração e café no capítulo.";
        let result = snippet_for_query(text, "coração", 8).expect("snippet");

        assert!(result.contains("coração"));
    }
}
