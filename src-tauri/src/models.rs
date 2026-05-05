use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookDto {
    pub id: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub author: Option<String>,
    pub publisher: Option<String>,
    pub language: Option<String>,
    pub description: Option<String>,
    pub identifier: Option<String>,
    pub file_hash: String,
    pub file_path: String,
    pub cover_path: Option<String>,
    pub imported_at: String,
    pub updated_at: String,
    pub last_opened_at: Option<String>,
    pub reading_status: String,
    pub total_progression: f64,
    pub text_length: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookDetailDto {
    #[serde(flatten)]
    pub book: BookDto,
    pub manifest: Option<EpubManifestDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpineItemDto {
    pub idref: String,
    pub href: String,
    pub media_type: String,
    pub title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TocItemDto {
    pub id: String,
    pub label: String,
    pub href: String,
    pub children: Vec<TocItemDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EpubManifestDto {
    pub book_id: String,
    pub title: String,
    pub author: Option<String>,
    pub spine: Vec<SpineItemDto>,
    pub toc: Vec<TocItemDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceDto {
    pub href: String,
    pub media_type: String,
    pub contents: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocatorDto {
    pub book_id: String,
    pub href: String,
    pub spine_index: i64,
    pub progression: f64,
    pub total_progression: f64,
    pub cfi: Option<String>,
    pub css_selector: Option<String>,
    pub text_snippet: Option<String>,
    pub display_page_index: Option<i64>,
    pub display_page_count: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookmarkDto {
    pub id: String,
    pub book_id: String,
    pub href: String,
    pub spine_index: i64,
    pub progression: f64,
    pub total_progression: f64,
    pub label: Option<String>,
    pub text_snippet: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HighlightRangeDto {
    pub locator: LocatorDto,
    pub selected_text: String,
    pub text_snippet: Option<String>,
    pub cfi: Option<String>,
    pub css_selector: Option<String>,
    pub dom_range_json: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HighlightDto {
    pub id: String,
    pub book_id: String,
    pub href: String,
    pub spine_index: i64,
    pub progression: f64,
    pub total_progression: f64,
    pub selected_text: String,
    pub color: String,
    pub note: Option<String>,
    pub cfi: Option<String>,
    pub css_selector: Option<String>,
    pub dom_range_json: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResultDto {
    pub href: String,
    pub spine_index: i64,
    pub progression: f64,
    pub total_progression: f64,
    pub snippet: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingSettingsDto {
    pub id: String,
    pub name: String,
    pub font_family: String,
    pub font_size: i64,
    pub line_height: f64,
    pub margin: i64,
    pub paragraph_spacing: f64,
    pub theme: String,
    pub text_align: String,
    pub hyphenation_enabled: bool,
    pub ligatures_enabled: bool,
}
