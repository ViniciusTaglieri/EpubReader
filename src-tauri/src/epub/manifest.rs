use crate::models::{EpubManifestDto, SpineItemDto, TocItemDto};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedEpub {
    pub metadata: EpubMetadata,
    pub spine: Vec<SpineItemDto>,
    pub toc: Vec<TocItemDto>,
    pub manifest_items: Vec<ManifestItem>,
    pub opf_dir: String,
    pub cover_href: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EpubMetadata {
    pub title: Option<String>,
    pub subtitle: Option<String>,
    pub author: Option<String>,
    pub publisher: Option<String>,
    pub language: Option<String>,
    pub description: Option<String>,
    pub identifier: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestItem {
    pub id: String,
    pub href: String,
    pub media_type: String,
    pub properties: Option<String>,
}

impl ParsedEpub {
    pub fn dto(&self, book_id: &str) -> EpubManifestDto {
        EpubManifestDto {
            book_id: book_id.to_string(),
            title: self
                .metadata
                .title
                .clone()
                .unwrap_or_else(|| "Sem titulo".to_string()),
            author: self.metadata.author.clone(),
            spine: self.spine.clone(),
            toc: self.toc.clone(),
        }
    }
}
