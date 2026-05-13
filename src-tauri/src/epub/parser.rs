use crate::{
    epub::{
        manifest::{EpubMetadata, ManifestItem, ParsedEpub},
        resources::read_zip_text,
    },
    error::AppError,
    models::{SpineItemDto, TocItemDto},
};
use roxmltree::{Document, Node};
use std::path::{Path, PathBuf};

pub fn parse_epub(epub_path: &Path) -> Result<ParsedEpub, AppError> {
    let container = read_zip_text(epub_path, "META-INF/container.xml")
        .map_err(|_| AppError::new("invalid_epub", "EPUB sem META-INF/container.xml"))?;
    let container_doc = Document::parse(&container)?;
    let opf_path = container_doc
        .descendants()
        .find(|node| node.has_tag_name("rootfile"))
        .and_then(|node| node.attribute("full-path"))
        .ok_or_else(|| AppError::new("invalid_epub", "EPUB sem rootfile OPF"))?;

    let opf = read_zip_text(epub_path, opf_path)?;
    let opf_doc = Document::parse(&opf)?;
    let opf_dir = parent_href(opf_path);
    let manifest_items = parse_manifest(&opf_doc, &opf_dir);
    let metadata = parse_metadata(&opf_doc);
    let spine = parse_spine(&opf_doc, &manifest_items);
    let toc = parse_toc(epub_path, &opf_doc, &manifest_items, &opf_dir).unwrap_or_default();
    let cover_href = find_cover_href(&opf_doc, &manifest_items);

    Ok(ParsedEpub {
        metadata,
        spine,
        toc,
        manifest_items,
        opf_dir,
        cover_href,
    })
}

fn parse_metadata(document: &Document<'_>) -> EpubMetadata {
    EpubMetadata {
        title: first_text(document, "title"),
        subtitle: first_meta_property(document, "subtitle"),
        author: first_text(document, "creator"),
        publisher: first_text(document, "publisher"),
        language: first_text(document, "language"),
        description: first_text(document, "description"),
        identifier: first_text(document, "identifier"),
        published_at: first_text(document, "date")
            .or_else(|| first_meta_property(document, "dcterms:modified")),
        subjects: all_text(document, "subject"),
    }
}

fn parse_manifest(document: &Document<'_>, opf_dir: &str) -> Vec<ManifestItem> {
    document
        .descendants()
        .filter(|node| node.has_tag_name("item"))
        .filter_map(|node| {
            let id = node.attribute("id")?.to_string();
            let href = normalize_href(opf_dir, node.attribute("href")?);
            let media_type = node.attribute("media-type")?.to_string();
            Some(ManifestItem {
                id,
                href,
                media_type,
                properties: node.attribute("properties").map(ToString::to_string),
            })
        })
        .collect()
}

fn parse_spine(document: &Document<'_>, manifest: &[ManifestItem]) -> Vec<SpineItemDto> {
    document
        .descendants()
        .filter(|node| node.has_tag_name("itemref"))
        .filter_map(|node| {
            let idref = node.attribute("idref")?;
            let item = manifest.iter().find(|item| item.id == idref)?;
            Some(SpineItemDto {
                idref: idref.to_string(),
                href: item.href.clone(),
                media_type: item.media_type.clone(),
                title: None,
                text_length: 0,
            })
        })
        .collect()
}

fn parse_toc(
    epub_path: &Path,
    document: &Document<'_>,
    manifest: &[ManifestItem],
    opf_dir: &str,
) -> Result<Vec<TocItemDto>, AppError> {
    if let Some(nav) = manifest
        .iter()
        .find(|item| item.properties.as_deref().unwrap_or("").contains("nav"))
    {
        let nav_text = read_zip_text(epub_path, &nav.href)?;
        let nav_doc = Document::parse(&nav_text)?;
        let items = nav_doc
            .descendants()
            .filter(|node| node.has_tag_name("a"))
            .filter_map(|node| toc_from_anchor(node, opf_dir))
            .collect();
        return Ok(items);
    }

    if let Some(ncx_id) = document
        .descendants()
        .find(|node| node.has_tag_name("spine"))
        .and_then(|node| node.attribute("toc"))
    {
        if let Some(ncx) = manifest.iter().find(|item| item.id == ncx_id) {
            let ncx_text = read_zip_text(epub_path, &ncx.href)?;
            let ncx_doc = Document::parse(&ncx_text)?;
            let items = ncx_doc
                .descendants()
                .filter(|node| node.has_tag_name("navPoint"))
                .filter_map(|node| {
                    let label = node
                        .descendants()
                        .find(|child| child.has_tag_name("text"))
                        .and_then(|child| child.text())?;
                    let href = node
                        .descendants()
                        .find(|child| child.has_tag_name("content"))
                        .and_then(|child| child.attribute("src"))?;
                    Some(TocItemDto {
                        id: node.attribute("id").unwrap_or(label).to_string(),
                        label: label.trim().to_string(),
                        href: normalize_href(opf_dir, href),
                        children: Vec::new(),
                    })
                })
                .collect();
            return Ok(items);
        }
    }

    Ok(Vec::new())
}

fn toc_from_anchor(node: Node<'_, '_>, opf_dir: &str) -> Option<TocItemDto> {
    let href = node.attribute("href")?;
    let label = node.text()?.trim();
    if label.is_empty() {
        return None;
    }
    Some(TocItemDto {
        id: href.to_string(),
        label: label.to_string(),
        href: normalize_href(opf_dir, href),
        children: Vec::new(),
    })
}

fn find_cover_href(document: &Document<'_>, manifest: &[ManifestItem]) -> Option<String> {
    let cover_id = document
        .descendants()
        .find(|node| node.has_tag_name("meta") && node.attribute("name") == Some("cover"))
        .and_then(|node| node.attribute("content"));

    if let Some(id) = cover_id {
        return manifest
            .iter()
            .find(|item| item.id == id)
            .map(|item| item.href.clone());
    }

    manifest
        .iter()
        .find(|item| {
            item.properties
                .as_deref()
                .unwrap_or("")
                .contains("cover-image")
        })
        .map(|item| item.href.clone())
}

fn first_text(document: &Document<'_>, tag: &str) -> Option<String> {
    document
        .descendants()
        .find(|node| node.has_tag_name(tag))
        .and_then(|node| node.text())
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty())
}

fn all_text(document: &Document<'_>, tag: &str) -> Vec<String> {
    document
        .descendants()
        .filter(|node| node.has_tag_name(tag))
        .filter_map(|node| node.text())
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty())
        .collect()
}

fn first_meta_property(document: &Document<'_>, property: &str) -> Option<String> {
    document
        .descendants()
        .find(|node| node.has_tag_name("meta") && node.attribute("property") == Some(property))
        .and_then(|node| node.text())
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty())
}

fn parent_href(path: &str) -> String {
    Path::new(path)
        .parent()
        .and_then(|parent| parent.to_str())
        .unwrap_or("")
        .replace('\\', "/")
}

pub fn normalize_href(base: &str, href: &str) -> String {
    let href_without_fragment = href.split('#').next().unwrap_or(href);
    let mut path = PathBuf::new();
    if !base.is_empty() {
        path.push(base);
    }
    path.push(href_without_fragment);
    let mut parts = Vec::new();
    for component in path.components() {
        match component {
            std::path::Component::Normal(value) => {
                parts.push(value.to_string_lossy().to_string());
            }
            std::path::Component::ParentDir => {
                parts.pop();
            }
            _ => {}
        }
    }
    parts.join("/")
}

#[cfg(test)]
mod tests {
    use super::normalize_href;

    #[test]
    fn normalize_href_joins_opf_base_and_removes_fragment() {
        assert_eq!(
            normalize_href("OPS/package", "../chapter.xhtml#part"),
            "OPS/chapter.xhtml"
        );
    }
}
