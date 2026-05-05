use crate::{
    epub::{manifest::ParsedEpub, resources::read_zip_text},
    models::SpineItemDto,
};
use std::path::Path;

pub fn estimate_epub_text_length(epub_path: &Path, parsed: &ParsedEpub) -> i64 {
    parsed
        .spine
        .iter()
        .map(|item| estimate_spine_text_length(epub_path, item))
        .sum::<usize>() as i64
}

fn estimate_spine_text_length(epub_path: &Path, item: &SpineItemDto) -> usize {
    read_zip_text(epub_path, &item.href)
        .map(|markup| text_length_without_tags(&markup))
        .unwrap_or(0)
}

fn text_length_without_tags(markup: &str) -> usize {
    let mut in_tag = false;
    let mut previous_was_space = true;
    let mut count = 0;

    for character in markup.chars() {
        match character {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if in_tag => {}
            _ if character.is_whitespace() => {
                if !previous_was_space {
                    count += 1;
                    previous_was_space = true;
                }
            }
            _ => {
                count += 1;
                previous_was_space = false;
            }
        }
    }

    count
}

#[cfg(test)]
mod tests {
    use super::text_length_without_tags;

    #[test]
    fn counts_text_content_without_markup() {
        assert_eq!(
            text_length_without_tags("<section><p>Texto <em>reflowable</em></p></section>"),
            "Texto reflowable".len()
        );
    }
}
