use crate::{error::AppError, models::CollectionDto};
use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

pub fn create_collection(connection: &Connection, name: &str) -> Result<CollectionDto, AppError> {
    let collection = CollectionDto {
        id: Uuid::new_v4().to_string(),
        name: name.trim().to_string(),
        created_at: Utc::now().to_rfc3339(),
        book_ids: Vec::new(),
    };
    if collection.name.is_empty() {
        return Err(AppError::new(
            "invalid_collection",
            "Informe um nome para a colecao",
        ));
    }
    connection.execute(
        "INSERT INTO collections (id, name, created_at) VALUES (?1, ?2, ?3)",
        params![collection.id, collection.name, collection.created_at],
    )?;
    Ok(collection)
}

pub fn list_collections(connection: &Connection) -> Result<Vec<CollectionDto>, AppError> {
    let mut statement = connection.prepare(
        r#"
        SELECT id, name, created_at
        FROM collections
        ORDER BY name COLLATE NOCASE ASC
        "#,
    )?;
    let rows = statement.query_map([], |row| {
        Ok(CollectionDto {
            id: row.get(0)?,
            name: row.get(1)?,
            created_at: row.get(2)?,
            book_ids: Vec::new(),
        })
    })?;
    let mut collections = Vec::new();
    for row in rows {
        let mut collection = row?;
        collection.book_ids = list_collection_book_ids(connection, &collection.id)?;
        collections.push(collection);
    }
    Ok(collections)
}

pub fn update_collection(
    connection: &Connection,
    collection_id: &str,
    name: &str,
    book_ids: &[String],
) -> Result<CollectionDto, AppError> {
    let normalized_name = name.trim();
    if normalized_name.is_empty() {
        return Err(AppError::new(
            "invalid_collection",
            "Informe um nome para a colecao",
        ));
    }

    connection.execute(
        "UPDATE collections SET name = ?1 WHERE id = ?2",
        params![normalized_name, collection_id],
    )?;
    connection.execute(
        "DELETE FROM collection_books WHERE collection_id = ?1",
        params![collection_id],
    )?;
    for book_id in book_ids {
        add_book_to_collection(connection, collection_id, book_id)?;
    }

    Ok(CollectionDto {
        id: collection_id.to_string(),
        name: normalized_name.to_string(),
        created_at: collection_created_at(connection, collection_id)?,
        book_ids: list_collection_book_ids(connection, collection_id)?,
    })
}

pub fn add_book_to_collection(
    connection: &Connection,
    collection_id: &str,
    book_id: &str,
) -> Result<(), AppError> {
    connection.execute(
        "INSERT OR IGNORE INTO collection_books (collection_id, book_id) VALUES (?1, ?2)",
        params![collection_id, book_id],
    )?;
    Ok(())
}

pub fn remove_book_from_collection(
    connection: &Connection,
    collection_id: &str,
    book_id: &str,
) -> Result<(), AppError> {
    connection.execute(
        "DELETE FROM collection_books WHERE collection_id = ?1 AND book_id = ?2",
        params![collection_id, book_id],
    )?;
    Ok(())
}

pub fn delete_collection(connection: &Connection, collection_id: &str) -> Result<(), AppError> {
    connection.execute(
        "DELETE FROM collections WHERE id = ?1",
        params![collection_id],
    )?;
    Ok(())
}

fn list_collection_book_ids(
    connection: &Connection,
    collection_id: &str,
) -> Result<Vec<String>, AppError> {
    let mut statement = connection.prepare(
        "SELECT book_id FROM collection_books WHERE collection_id = ?1 ORDER BY book_id ASC",
    )?;
    let rows = statement.query_map(params![collection_id], |row| row.get::<_, String>(0))?;
    let mut ids = Vec::new();
    for row in rows {
        ids.push(row?);
    }
    Ok(ids)
}

fn collection_created_at(connection: &Connection, collection_id: &str) -> Result<String, AppError> {
    connection
        .query_row(
            "SELECT created_at FROM collections WHERE id = ?1",
            params![collection_id],
            |row| row.get(0),
        )
        .map_err(AppError::from)
}
