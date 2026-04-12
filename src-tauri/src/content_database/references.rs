use super::*;
use crate::logger;
use rusqlite::params;

/// Create a new reference document
pub fn create_reference(request: CreateReferenceRequest) -> Result<DocumentReference, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Auto-generate type-based sequential code if empty
    let final_code = if request.code.trim().is_empty() {
        let cat_prefix = match request.category.as_deref().unwrap_or("OTHER") {
            "MANUAL" => "MN",
            "PROC" => "PR",
            "TM" => "TM",
            "SAFETY" => "SF",
            "DIAGRAM" => "DG",
            _ => "OT",
        };

        let class_digit = match request.classification.as_deref().unwrap_or("Unclassified") {
            "Restricted" => "1",
            "Confidential" => "2",
            "Secret" => "3",
            "Top Secret" => "4",
            _ => "0",
        };

        let pattern = format!("{}-{}%", cat_prefix, class_digit);
        let prefix_len = cat_prefix.len() + 1 + 1;

        let max_num: i32 = conn
            .query_row(
                &format!(
                    "SELECT COALESCE(MAX(CAST(SUBSTR(code, {}) AS INTEGER)), 0)                     FROM DocumentReferences                     WHERE code LIKE ? AND LENGTH(code) >= ?",
                    prefix_len + 1
                ),
                params![pattern, prefix_len + 3],
                |row| row.get(0),
            )
            .unwrap_or(0);

        format!("{}-{}{:03}", cat_prefix, class_digit, max_num + 1)
    } else {
        request.code.clone()
    };

    // Check if code already exists
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM DocumentReferences WHERE code = ?1)",
            params![final_code],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if exists {
        return Err(format!(
            "Reference with code '{}' already exists",
            final_code
        ));
    }

    // Auto-Bundling: Copy file to data/ directory
    let final_file_path = if let Some(path) = &request.file_path {
        Some(bundle_reference_file(
            &final_code,
            request.category.as_deref().unwrap_or("OTHER"),
            path,
            request.pqs_id.as_deref(),
        )?)
    } else {
        None
    };

    // Insert
    conn.execute(
        "INSERT INTO DocumentReferences (code, title, category, classification, resource_type, file_path)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            final_code,
            request.title,
            request.category,
            request.classification.unwrap_or("Unclassified".to_string()),
            request.resource_type.unwrap_or("DOCUMENT".to_string()),
            final_file_path,
        ],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    // Return created reference
    get_reference_by_id(&conn, id)
}

pub fn get_references(
    search: Option<String>,
    category: Option<String>,
) -> Result<Vec<DocumentReference>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let mut sql = "SELECT id, code, title, category, classification, resource_type, file_path, created_at, updated_at
                   FROM DocumentReferences WHERE 1=1".to_string();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(s) = search {
        sql.push_str(" AND (code LIKE ?1 OR title LIKE ?1)");
        let search_pattern = format!("%{}%", s);
        params_vec.push(Box::new(search_pattern));
    }

    if let Some(cat) = category {
        let param_idx = params_vec.len() + 1;
        sql.push_str(&format!(" AND category = ?{}", param_idx));
        params_vec.push(Box::new(cat));
    }

    sql.push_str(" ORDER BY LENGTH(title) ASC, title ASC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();

    let refs = stmt
        .query_map(&params_refs[..], |row| {
            Ok(DocumentReference {
                id: row.get(0)?,
                code: row.get(1)?,
                title: row.get(2)?,
                category: row.get(3)?,
                classification: row.get(4)?,
                resource_type: row.get(5)?,
                file_path: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(refs)
}

/// Delete a reference (cascades to remove from all sections and questions)
pub fn delete_reference(id: i64) -> Result<(), String> {
    let mut conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // 0. Get file path before deleting record
    let file_path: Option<String> = conn
        .query_row(
            "SELECT file_path FROM DocumentReferences WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .unwrap_or(None);

    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // 1. Remove from all sections first (Cascade logic)
    tx.execute(
        "DELETE FROM SectionReferences WHERE reference_id = ?1",
        params![id],
    )
    .map_err(|e| format!("Failed to remove section links: {}", e))?;

    // 2. Remove from all questions
    tx.execute(
        "DELETE FROM QuestionReferences WHERE reference_id = ?1",
        params![id],
    )
    .map_err(|e| format!("Failed to remove question links: {}", e))?;

    // 3. Delete master reference
    tx.execute("DELETE FROM DocumentReferences WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to remove master record: {}", e))?;

    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    // 4. Delete physical file if it exists and is managed (starts with data/)
    if let Some(path) = file_path {
        if path.starts_with("data/") {
            if let Ok(data_dir) = get_portable_data_dir() {
                // Strip "data/" prefix to get relative path
                let relative_path = if path.starts_with("data/") {
                    path.strip_prefix("data/").unwrap_or(&path)
                } else {
                    path.strip_prefix("data\\").unwrap_or(&path)
                };

                let full_path = data_dir.join(relative_path);

                if full_path.exists() {
                    if let Err(e) = std::fs::remove_file(&full_path) {
                        logger::warn(format!(
                            "Failed to delete physical reference file {}: {}",
                            full_path.display(),
                            e
                        ));
                    }

                    // Optional: Try to remove parent directory if empty (cleanup)
                    if let Some(parent) = full_path.parent() {
                        if let Err(e) = std::fs::remove_dir(parent) {
                            logger::debug(format!(
                                "Skipping non-empty reference directory cleanup {}: {}",
                                parent.display(),
                                e
                            ));
                        }
                    }
                }
            } else {
                logger::warn(format!(
                    "Reference {} deleted from database but portable data directory was unavailable for file cleanup",
                    id
                ));
            }
        }
    }

    Ok(())
}

/// Delete all references from the master list (and all sections)
pub fn delete_all_references() -> Result<(), String> {
    let mut conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // 0. Get all file paths before deleting records
    let file_paths: Vec<String> = {
        let mut stmt = conn
            .prepare("SELECT file_path FROM DocumentReferences WHERE file_path IS NOT NULL")
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;

        let paths = stmt
            .query_map([], |row| row.get(0))
            .map_err(|e| format!("Failed to fetch file paths: {}", e))?
            .collect::<Result<Vec<String>, _>>()
            .map_err(|e| format!("Failed to collect file paths: {}", e))?;
        paths
    };

    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // 1. Remove all links in sections
    tx.execute("DELETE FROM SectionReferences", [])
        .map_err(|e| format!("Failed to clear section links: {}", e))?;

    // 2. Remove all inline question references
    tx.execute("DELETE FROM QuestionReferences", [])
        .map_err(|e| format!("Failed to clear question references: {}", e))?;

    // 3. Delete all master references
    tx.execute("DELETE FROM DocumentReferences", [])
        .map_err(|e| format!("Failed to clear master references: {}", e))?;

    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    // 4. Delete all physical files
    if let Ok(data_dir) = get_portable_data_dir() {
        for path in file_paths {
            if path.starts_with("data/") {
                let relative_path = if path.starts_with("data/") {
                    path.strip_prefix("data/").unwrap_or(&path)
                } else {
                    path.strip_prefix("data\\").unwrap_or(&path)
                };

                let full_path = data_dir.join(relative_path);
                if full_path.exists() {
                    if let Err(e) = std::fs::remove_file(&full_path) {
                        logger::warn(format!(
                            "Failed to delete physical reference file {} during bulk cleanup: {}",
                            full_path.display(),
                            e
                        ));
                    }
                }
            }
        }
        // Optional: Clean up empty directories could be complex here, skipping for now
    } else {
        logger::warn(
            "References were deleted from database but portable data directory was unavailable for bulk file cleanup",
        );
    }

    Ok(())
}

/// Add reference to a section
pub fn add_section_reference(
    section_id: i64,
    reference_id: i64,
    display_order: Option<i32>,
) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Check if already linked
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM SectionReferences WHERE section_id = ?1 AND reference_id = ?2)",
            params![section_id, reference_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if exists {
        return Err("This reference is already linked to this section".to_string());
    }

    // Get next display_order if not provided
    let order = if let Some(o) = display_order {
        o
    } else {
        let max_order: i32 = conn
            .query_row(
                "SELECT COALESCE(MAX(display_order), 0) FROM SectionReferences WHERE section_id = ?1",
                params![section_id],
                |row| row.get(0),
            )
            .unwrap_or(0);
        max_order + 1
    };

    conn.execute(
        "INSERT INTO SectionReferences (section_id, reference_id, display_order)
         VALUES (?1, ?2, ?3)",
        params![section_id, reference_id, order],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
/// Remove reference from section
/// Remove reference from section and re-index
pub fn remove_section_reference(section_ref_id: i64) -> Result<(), String> {
    let mut conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Get info before delete to handle re-indexing
    let (section_id, deleted_order): (i64, i32) = tx
        .query_row(
            "SELECT section_id, display_order FROM SectionReferences WHERE id = ?1",
            params![section_ref_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Reference not found: {}", e))?;

    // 1.5 Check dependency: Is this reference used by any question in this section?
    // We need to find the reference_id first. Wait, we selected section_id and display_order, but we need reference_id too.
    let reference_id: i64 = tx
        .query_row(
            "SELECT reference_id FROM SectionReferences WHERE id = ?1",
            params![section_ref_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Reference ID not found: {}", e))?;

    let usage_count: i64 = tx
        .query_row(
            "SELECT COUNT(*)         FROM QuestionReferences qr
         JOIN Questions q ON qr.question_id = q.id
         WHERE qr.reference_id = ?1 AND q.section_id = ?2",
            params![reference_id, section_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if usage_count > 0 {
        return Err(format!("Cannot remove reference: It is currently used by {} question(s) in this section. Please unlink it from questions first.", usage_count));
    }

    // 2. Delete
    tx.execute(
        "DELETE FROM SectionReferences WHERE id = ?1",
        params![section_ref_id],
    )
    .map_err(|e| e.to_string())?;

    // 3. Re-index adjacent items (Shift Left)
    tx.execute(
        "UPDATE SectionReferences         SET display_order = display_order - 1         WHERE section_id = ?1 AND display_order > ?2",
        params![section_id, deleted_order],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}
/// Get all references for a section (with Thai letters)
pub fn get_section_references(section_id: i64) -> Result<Vec<SectionReferenceDetail>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Sort by Title Length (ASC) then Title (ASC) for aesthetics
    let mut stmt = conn
        .prepare(
            "SELECT sr.id, sr.section_id, sr.reference_id, sr.display_order,
                    dr.id, dr.code, dr.title, dr.category, dr.classification, dr.resource_type, dr.file_path, dr.created_at, dr.updated_at,
                    (SELECT COUNT(*)                     FROM QuestionReferences qr                     JOIN Questions q ON qr.question_id = q.id                     WHERE qr.reference_id = sr.reference_id AND q.section_id = sr.section_id) as usage_count
             FROM SectionReferences sr
             JOIN DocumentReferences dr ON sr.reference_id = dr.id
             WHERE sr.section_id = ?1
             ORDER BY sr.display_order ASC"
        )
        .map_err(|e| e.to_string())?;

    let refs = stmt
        .query_map(params![section_id], |row| {
            let display_order: i32 = row.get(3)?;

            Ok(SectionReferenceDetail {
                id: row.get(0)?,
                section_id: row.get(1)?,
                reference: DocumentReference {
                    id: row.get(4)?,
                    code: row.get(5)?,
                    title: row.get(6)?,
                    category: row.get(7)?,
                    classification: row.get(8)?,
                    resource_type: row.get(9)?,
                    file_path: row.get(10)?,
                    created_at: row.get(11)?,
                    updated_at: row.get(12)?,
                },
                display_order,
                thai_letter: get_thai_letter(display_order),
                usage_count: row.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(refs)
}
/// Update an existing reference
pub fn update_reference(args: UpdateReferenceArgs) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Check if reference exists
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM DocumentReferences WHERE id = ?1)",
            params![args.id],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !exists {
        return Err(format!("Reference with ID {} not found", args.id));
    }

    // Check if new code conflicts with another reference
    let code_conflict: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM DocumentReferences WHERE code = ?1 AND id != ?2)",
            params![args.code, args.id],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if code_conflict {
        return Err(format!("Reference code '{}' already exists", args.code));
    }

    // 1. Get existing file_path BEFORE update
    let old_file_path: Option<String> = conn
        .query_row(
            "SELECT file_path FROM DocumentReferences WHERE id = ?1",
            params![args.id],
            |row| row.get(0),
        )
        .unwrap_or(None);

    // Auto-Bundling on update
    let final_file_path = if let Some(path) = &args.file_path {
        Some(bundle_reference_file(
            &args.code,
            args.category.as_deref().unwrap_or("OTHER"),
            path,
            args.pqs_id.as_deref(),
        )?)
    } else {
        None
    };

    // Perform update
    conn.execute(
        "UPDATE DocumentReferences         SET code = ?1, title = ?2, category = ?3, classification = ?4, resource_type = ?5, file_path = ?6, updated_at = CURRENT_TIMESTAMP         WHERE id = ?7",
        params![
            args.code,            args.title,            args.category,            args.classification.unwrap_or("Unclassified".to_string()),            args.resource_type.unwrap_or("DOCUMENT".to_string()),
            final_file_path,            args.id
        ]
    ).map_err(|e| format!("Failed to update reference: {}", e))?;

    // 2. Cleanup old file if path changed
    if let Some(old_path) = old_file_path {
        // If we have a new path, and it's different from the old one
        // OR if we set file_path to None (removal)
        let should_delete = match &final_file_path {
            Some(new_path) => new_path != &old_path,
            None => true, // If new is None, we deleted the file association
        };

        if should_delete && old_path.starts_with("data/") {
            if let Ok(data_dir) = get_portable_data_dir() {
                // Strip "data/" prefix to get relative path
                let relative_path = if old_path.starts_with("data/") {
                    old_path.strip_prefix("data/").unwrap_or(&old_path)
                } else {
                    old_path.strip_prefix("data\\").unwrap_or(&old_path)
                };

                let full_path = data_dir.join(relative_path);

                if full_path.exists() {
                    if let Err(e) = std::fs::remove_file(&full_path) {
                        logger::warn(format!(
                            "Failed to delete old physical reference file {}: {}",
                            full_path.display(),
                            e
                        ));
                    }

                    // Optional: Try to remove parent directory if empty
                    if let Some(parent) = full_path.parent() {
                        if let Err(e) = std::fs::remove_dir(parent) {
                            logger::debug(format!(
                                "Skipping non-empty reference directory cleanup {}: {}",
                                parent.display(),
                                e
                            ));
                        }
                    }
                }
            }
        }
    }

    Ok(())
}
/// Add a reference link to a specific question (with page number)
pub fn add_question_reference(req: AddQuestionReferenceRequest) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    add_question_reference_with_conn(&conn, req)
}
/// Remove a reference link from a question
pub fn remove_question_reference(id: i32) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    conn.execute("DELETE FROM QuestionReferences WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}
/// Update page number/location text for a question reference link
pub fn update_question_reference_location(
    id: i32,
    location_text: Option<String>,
) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    conn.execute(
        "UPDATE QuestionReferences SET location_text = ?1 WHERE id = ?2",
        params![location_text, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
