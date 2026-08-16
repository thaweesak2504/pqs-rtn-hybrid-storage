use crate::logger;
use rusqlite::{params, Connection, OptionalExtension};
use std::collections::HashSet;
use std::path::{Component, Path, PathBuf};
use walkdir::WalkDir;

use super::*;

// ============================================================
// User Answers & Answer Keys
// ============================================================

/// Get all trainee answers for a document
pub fn get_trainee_answers(user_id: &str, document_id: &str) -> Result<Vec<UserAnswer>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT ua.user_id, ua.question_id, ua.document_id, ua.sub_question_code, ua.answer_text,
                ua.status, ua.feedback, ua.assessed_at, ua.assessed_by, ua.updated_at, ak.answer_key_text,
                ua.attachments
         FROM UserAnswers ua
         LEFT JOIN QuestionAnswerKeys ak ON ak.question_id = ua.question_id AND ak.sub_question_code = ua.sub_question_code
         WHERE ua.user_id = ?1 AND ua.document_id = ?2"
    ).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![user_id, document_id], |row| {
            Ok(UserAnswer {
                user_id: row.get(0)?,
                question_id: row.get(1)?,
                document_id: row.get(2)?,
                sub_question_code: row.get(3)?,
                answer_text: row.get(4)?,
                status: row.get(5)?,
                feedback: row.get(6)?,
                assessed_at: row.get(7)?,
                assessed_by: row.get(8)?,
                updated_at: row.get(9)?,
                answer_key: row.get(10)?,
                attachments: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

pub fn ensure_answer_key_placeholder(
    conn: &Connection,
    question_id: &str,
    sub_question_code: &str,
) -> Result<(), String> {
    let normalized_sub_question_code = sub_question_code.trim();
    let exists: i32 = conn.query_row(
        "SELECT COUNT(*) FROM QuestionAnswerKeys WHERE question_id = ?1 AND sub_question_code = ?2",
        params![question_id, normalized_sub_question_code],
        |row| row.get(0)
    ).unwrap_or(0);

    if exists == 0 {
        conn.execute(
            "INSERT OR IGNORE INTO QuestionAnswerKeys (question_id, sub_question_code, answer_key_text, is_required, order_index)
             VALUES (?1, ?2, '', 1, 0)",
            params![question_id, normalized_sub_question_code]
        ).map_err(|e| format!("Failed to create answer key placeholder: {}", e))?;
    }

    Ok(())
}

/// Save or update a trainee's answer
pub fn save_trainee_answer(args: SaveTraineeAnswerArgs) -> Result<String, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    ensure_answer_key_placeholder(&conn, &args.question_id, &args.sub_question_code)?;

    conn.execute(
        "INSERT INTO UserAnswers (user_id, question_id, document_id, sub_question_code, answer_text, attachments, status, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, question_id, document_id, sub_question_code) DO UPDATE SET
            answer_text = excluded.answer_text,
            attachments = excluded.attachments,
            status = 'pending',
            updated_at = CURRENT_TIMESTAMP",
        params![args.user_id, args.question_id, args.document_id, args.sub_question_code, args.answer_text, args.attachments]
    ).map_err(|e| {
        let err_msg = format!("Failed to save answer: {}", e);
        logger::error(format!("save_trainee_answer failed: {}", err_msg));
        err_msg
    })?;

    Ok("Answer saved successfully".to_string())
}

/// Save or update a qualifier's assessment
pub fn save_qualifier_assessment(args: SaveQualifierAssessmentArgs) -> Result<String, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    ensure_answer_key_placeholder(&conn, &args.question_id, &args.sub_question_code)?;

    conn.execute(
        "INSERT INTO UserAnswers (user_id, question_id, document_id, sub_question_code, status, feedback, assessed_by, assessed_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, question_id, document_id, sub_question_code) DO UPDATE SET
            status = excluded.status,
            feedback = excluded.feedback,
            assessed_by = excluded.assessed_by,
            assessed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP",
        params![args.user_id, args.question_id, args.document_id, args.sub_question_code, args.status, args.feedback, args.qualifier_id]
    ).map_err(|e| format!("Failed to save assessment: {}", e))?;

    // Auto-recalculate progress for this section after each assessment save
    if let Err(e) = recalculate_section_progress(args.user_id, args.document_id) {
        logger::warn(format!(
            "save_qualifier_assessment completed but progress recalculation failed: {}",
            e
        ));
    }

    Ok("Assessment saved successfully".to_string())
}

/// Delete one exact Trainee answer. SQLite commits before managed-file cleanup,
/// so a database failure cannot leave a surviving row that points to a file
/// already removed from disk.
pub fn delete_trainee_answer(
    user_id: &str,
    question_id: &str,
    document_id: &str,
    sub_question_code: &str,
) -> Result<DeleteAnswerResult, String> {
    let mut conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    let data_dir = get_portable_data_dir().ok();
    delete_trainee_answer_with_conn_and_data_dir(
        &mut conn,
        user_id,
        question_id,
        document_id,
        sub_question_code,
        data_dir.as_deref(),
    )
}

struct ExistingAnswerForDelete {
    answer_text: Option<String>,
    status: Option<String>,
    feedback: Option<String>,
    assessed_at: Option<String>,
    assessed_by: Option<String>,
    attachments: Option<String>,
}

pub(crate) fn delete_trainee_answer_with_conn_and_data_dir(
    conn: &mut Connection,
    user_id: &str,
    question_id: &str,
    document_id: &str,
    sub_question_code: &str,
    data_dir: Option<&Path>,
) -> Result<DeleteAnswerResult, String> {
    if user_id.is_empty() || question_id.is_empty() {
        return Err("Invalid answer identity".to_string());
    }
    if document_id.is_empty()
        || !document_id
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_')
    {
        return Err("Invalid document ID".to_string());
    }

    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to start delete-answer transaction: {e}"))?;
    let existing: Option<ExistingAnswerForDelete> = tx
        .query_row(
            "SELECT answer_text, status, feedback, assessed_at, assessed_by, attachments
             FROM UserAnswers
             WHERE user_id = ?1 AND question_id = ?2 AND document_id = ?3 AND sub_question_code = ?4",
            params![user_id, question_id, document_id, sub_question_code],
            |row| {
                Ok(ExistingAnswerForDelete {
                    answer_text: row.get(0)?,
                    status: row.get(1)?,
                    feedback: row.get(2)?,
                    assessed_at: row.get(3)?,
                    assessed_by: row.get(4)?,
                    attachments: row.get(5)?,
                })
            },
        )
        .optional()
        .map_err(|e| format!("Failed to inspect answer before deletion: {e}"))?;

    let matched = existing.is_some();
    let mut answer_text_was_present = false;
    let mut was_assessed = false;
    let mut attachment_paths = HashSet::new();
    let mut invalid_attachment_metadata = false;

    if let Some(existing) = existing {
        answer_text_was_present = existing
            .answer_text
            .as_deref()
            .is_some_and(|value| !value.trim().is_empty());
        was_assessed = existing.status.as_deref().unwrap_or("pending") != "pending"
            || existing
                .feedback
                .as_deref()
                .is_some_and(|value| !value.trim().is_empty())
            || existing.assessed_at.is_some()
            || existing.assessed_by.is_some();

        if let Some(raw) = existing
            .attachments
            .filter(|value| !value.trim().is_empty())
        {
            match serde_json::from_str::<Vec<String>>(&raw) {
                Ok(paths) => {
                    attachment_paths.extend(
                        paths
                            .into_iter()
                            .map(|path| path.trim().to_string())
                            .filter(|path| !path.is_empty()),
                    );
                }
                Err(_) => invalid_attachment_metadata = true,
            }
        }
    }

    let answer_rows_deleted = tx
        .execute(
            "DELETE FROM UserAnswers
             WHERE user_id = ?1 AND question_id = ?2 AND document_id = ?3 AND sub_question_code = ?4",
            params![user_id, question_id, document_id, sub_question_code],
        )
        .map_err(|e| format!("Failed to delete answer: {e}"))? as i64;
    tx.commit()
        .map_err(|e| format!("Failed to commit delete-answer transaction: {e}"))?;

    let progress = if matched {
        match super::scoring::recalculate_section_progress_with_conn(conn, user_id, document_id) {
            Ok(sections_updated) => ProgressRecalculationResult {
                attempted: true,
                sections_updated,
                complete: true,
                failure: None,
            },
            Err(error) => {
                logger::warn(format!(
                    "delete_trainee_answer completed but progress recalculation failed: {}",
                    error
                ));
                ProgressRecalculationResult {
                    attempted: true,
                    sections_updated: 0,
                    complete: false,
                    failure: Some(error),
                }
            }
        }
    } else {
        ProgressRecalculationResult {
            attempted: false,
            sections_updated: 0,
            complete: true,
            failure: None,
        }
    };

    let referenced_attachment_path_count = attachment_paths.len() as i64;
    let attachments = cleanup_answer_attachment_paths(
        conn,
        document_id,
        &attachment_paths,
        invalid_attachment_metadata,
        data_dir,
    );

    Ok(DeleteAnswerResult {
        user_id: user_id.to_string(),
        document_id: document_id.to_string(),
        question_id: question_id.to_string(),
        sub_question_code: sub_question_code.to_string(),
        database: DeleteAnswerDatabaseResult {
            matched,
            answer_rows_deleted,
            answer_text_was_present,
            was_assessed,
            referenced_attachment_path_count,
            invalid_attachment_metadata,
            committed: true,
        },
        progress,
        attachments,
    })
}

fn resolve_owned_trainee_attachment(
    data_dir: &Path,
    document_id: &str,
    logical_path: &str,
) -> Result<PathBuf, String> {
    let relative = logical_path
        .strip_prefix("data/")
        .ok_or_else(|| "Attachment path is outside managed data".to_string())?;
    let path = Path::new(relative);
    let components = path.components().collect::<Vec<_>>();
    if components.len() != 3
        || components
            .iter()
            .any(|component| !matches!(component, Component::Normal(_)))
        || components[0].as_os_str() != document_id
        || components[1].as_os_str() != "trainee-attachments"
    {
        return Err("Attachment path is outside the target document".to_string());
    }
    Ok(data_dir.join(path))
}

fn cleanup_answer_attachment_paths(
    conn: &Connection,
    document_id: &str,
    attachment_paths: &HashSet<String>,
    invalid_attachment_metadata: bool,
    data_dir: Option<&Path>,
) -> AttachmentCleanupResult {
    let logical_directory = format!("data/{document_id}/trainee-attachments");
    let cleanup_needed = !attachment_paths.is_empty() || invalid_attachment_metadata;
    let Some(data_dir) = data_dir else {
        let failures = if cleanup_needed {
            vec![AttachmentCleanupFailure {
                logical_path: "data".to_string(),
                message: "Managed data directory is unavailable".to_string(),
            }]
        } else {
            Vec::new()
        };
        return AttachmentCleanupResult {
            logical_directory,
            data_directory_available: false,
            cleanup_attempted: false,
            directory_found: false,
            managed_files_found: 0,
            managed_files_deleted: 0,
            managed_files_retained: 0,
            managed_files_missing: 0,
            cleanup_complete: failures.is_empty(),
            failures,
        };
    };

    let attachments_dir = data_dir.join(document_id).join("trainee-attachments");
    let mut result = AttachmentCleanupResult {
        logical_directory: logical_directory.clone(),
        data_directory_available: true,
        cleanup_attempted: cleanup_needed,
        directory_found: attachments_dir.exists(),
        managed_files_found: 0,
        managed_files_deleted: 0,
        managed_files_retained: 0,
        managed_files_missing: 0,
        cleanup_complete: true,
        failures: Vec::new(),
    };

    if invalid_attachment_metadata {
        result.failures.push(AttachmentCleanupFailure {
            logical_path: logical_directory,
            message: "Attachment metadata is not a valid path array".to_string(),
        });
    }

    for logical_path in attachment_paths {
        let target_path =
            match resolve_owned_trainee_attachment(data_dir, document_id, logical_path) {
                Ok(path) => path,
                Err(message) => {
                    result.failures.push(AttachmentCleanupFailure {
                        logical_path: logical_path.clone(),
                        message,
                    });
                    continue;
                }
            };

        let remaining_references = match super::media::count_database_references(conn, logical_path)
        {
            Ok(count) => count,
            Err(message) => {
                result.failures.push(AttachmentCleanupFailure {
                    logical_path: logical_path.clone(),
                    message,
                });
                continue;
            }
        };

        if !target_path.exists() {
            result.managed_files_missing += 1;
            result.failures.push(AttachmentCleanupFailure {
                logical_path: logical_path.clone(),
                message: "Managed attachment file was not found".to_string(),
            });
            continue;
        }
        result.managed_files_found += 1;

        if remaining_references > 0 {
            result.managed_files_retained += 1;
            continue;
        }

        match std::fs::remove_file(&target_path) {
            Ok(()) => result.managed_files_deleted += 1,
            Err(error) => result.failures.push(AttachmentCleanupFailure {
                logical_path: logical_path.clone(),
                message: error.to_string(),
            }),
        }
    }

    result.cleanup_complete = result.failures.is_empty();
    result
}

pub(crate) fn clear_document_trainee_answers_with_conn(
    conn: &mut Connection,
    document_id: &str,
    data_dir: Option<&Path>,
) -> Result<ClearAnswersResult, String> {
    if document_id.is_empty()
        || !document_id
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_')
    {
        return Err("Invalid document ID".to_string());
    }

    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to start clear-answers transaction: {}", e))?;

    let (
        assessed_answer_rows_deleted,
        referenced_attachment_path_count,
        invalid_attachment_metadata_rows,
    ) = {
        let mut stmt = tx
            .prepare(
                "SELECT status, feedback, assessed_at, assessed_by, attachments
                 FROM UserAnswers
                 WHERE document_id = ?1",
            )
            .map_err(|e| format!("Failed to inspect trainee work before clearing: {}", e))?;
        let rows = stmt
            .query_map(params![document_id], |row| {
                Ok((
                    row.get::<_, Option<String>>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, Option<String>>(4)?,
                ))
            })
            .map_err(|e| format!("Failed to inspect trainee work before clearing: {}", e))?;

        let mut assessed_count = 0_i64;
        let mut attachment_paths = HashSet::new();
        let mut invalid_attachment_rows = 0_i64;

        for row in rows {
            let (status, feedback, assessed_at, assessed_by, attachments) =
                row.map_err(|e| format!("Failed to inspect trainee work before clearing: {}", e))?;
            let is_assessed = status.as_deref().unwrap_or("pending") != "pending"
                || feedback
                    .as_deref()
                    .is_some_and(|value| !value.trim().is_empty())
                || assessed_at.is_some()
                || assessed_by.is_some();
            if is_assessed {
                assessed_count += 1;
            }

            if let Some(raw) = attachments.filter(|value| !value.trim().is_empty()) {
                match serde_json::from_str::<Vec<String>>(&raw) {
                    Ok(paths) => {
                        attachment_paths.extend(
                            paths
                                .into_iter()
                                .map(|path| path.trim().to_string())
                                .filter(|path| !path.is_empty()),
                        );
                    }
                    Err(_) => invalid_attachment_rows += 1,
                }
            }
        }

        (
            assessed_count,
            attachment_paths.len() as i64,
            invalid_attachment_rows,
        )
    };

    let answer_rows_deleted =
        tx.execute(
            "DELETE FROM UserAnswers WHERE document_id = ?1",
            params![document_id],
        )
        .map_err(|e| format!("Failed to clear UserAnswers for document: {}", e))? as i64;

    let progress_rows_deleted =
        tx.execute(
            "DELETE FROM UserProgress WHERE document_id = ?1",
            params![document_id],
        )
        .map_err(|e| format!("Failed to clear UserProgress for document: {}", e))? as i64;

    tx.commit()
        .map_err(|e| format!("Failed to commit clear-answers transaction: {}", e))?;

    let attachments = clear_document_attachment_directory(document_id, data_dir);

    logger::info(format!(
        "Cleared {} trainee answer rows and {} progress rows for document {}; attachment cleanup complete: {}",
        answer_rows_deleted,
        progress_rows_deleted,
        document_id,
        attachments.cleanup_complete
    ));

    Ok(ClearAnswersResult {
        document_id: document_id.to_string(),
        database: ClearAnswersDatabaseResult {
            answer_rows_deleted,
            assessed_answer_rows_deleted,
            progress_rows_deleted,
            referenced_attachment_path_count,
            invalid_attachment_metadata_rows,
            committed: true,
        },
        attachments,
    })
}

fn count_managed_files(directory: &Path) -> i64 {
    WalkDir::new(directory)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file())
        .count() as i64
}

fn clear_document_attachment_directory(
    document_id: &str,
    data_dir: Option<&Path>,
) -> AttachmentCleanupResult {
    let logical_directory = format!("data/{document_id}/trainee-attachments");
    let Some(data_dir) = data_dir else {
        return AttachmentCleanupResult {
            logical_directory,
            data_directory_available: false,
            cleanup_attempted: false,
            directory_found: false,
            managed_files_found: 0,
            managed_files_deleted: 0,
            managed_files_retained: 0,
            managed_files_missing: 0,
            cleanup_complete: false,
            failures: vec![AttachmentCleanupFailure {
                logical_path: "data".to_string(),
                message: "Managed data directory is unavailable".to_string(),
            }],
        };
    };

    let attachments_dir = data_dir.join(document_id).join("trainee-attachments");
    if !attachments_dir.exists() {
        return AttachmentCleanupResult {
            logical_directory,
            data_directory_available: true,
            cleanup_attempted: true,
            directory_found: false,
            managed_files_found: 0,
            managed_files_deleted: 0,
            managed_files_retained: 0,
            managed_files_missing: 0,
            cleanup_complete: true,
            failures: Vec::new(),
        };
    }

    let managed_files_found = count_managed_files(&attachments_dir);
    match std::fs::remove_dir_all(&attachments_dir) {
        Ok(()) => AttachmentCleanupResult {
            logical_directory,
            data_directory_available: true,
            cleanup_attempted: true,
            directory_found: true,
            managed_files_found,
            managed_files_deleted: managed_files_found,
            managed_files_retained: 0,
            managed_files_missing: 0,
            cleanup_complete: true,
            failures: Vec::new(),
        },
        Err(error) => {
            let managed_files_remaining = count_managed_files(&attachments_dir);
            logger::warn(format!(
                "Failed to clear trainee attachments for document {}: {}",
                document_id, error
            ));
            AttachmentCleanupResult {
                logical_directory: logical_directory.clone(),
                data_directory_available: true,
                cleanup_attempted: true,
                directory_found: true,
                managed_files_found,
                managed_files_deleted: managed_files_found.saturating_sub(managed_files_remaining),
                managed_files_retained: 0,
                managed_files_missing: 0,
                cleanup_complete: false,
                failures: vec![AttachmentCleanupFailure {
                    logical_path: logical_directory,
                    message: error.to_string(),
                }],
            }
        }
    }
}

/// Get answer keys for a question
pub fn get_question_answer_keys_inner(question_id: String) -> Result<Vec<AnswerKey>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, question_id, sub_question_code, answer_key_text, is_required, order_index
         FROM QuestionAnswerKeys
         WHERE question_id = ?1
         ORDER BY order_index",
        )
        .map_err(|e| e.to_string())?;

    let keys = stmt
        .query_map(params![question_id], |row| {
            Ok(AnswerKey {
                id: row.get(0)?,
                question_id: row.get(1)?,
                sub_question_code: row.get(2)?,
                answer_key_text: row.get(3)?,
                is_required: row.get(4)?,
                order_index: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(keys)
}

/// Update a single answer key
pub fn update_answer_key_inner(
    question_id: String,
    sub_code: String,
    new_text: String,
) -> Result<String, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    update_answer_key_with_conn(&conn, question_id, sub_code, new_text)
}

pub fn update_answer_key_with_conn(
    conn: &Connection,
    question_id: String,
    sub_code: String,
    new_text: String,
) -> Result<String, String> {
    ensure_section_300_policy_allows_question_action(conn, &question_id, "answer keys")?;

    let trimmed = new_text.trim().to_string();

    if trimmed.is_empty() {
        conn.execute(
            "DELETE FROM QuestionAnswerKeys WHERE question_id = ?1 AND sub_question_code = ?2",
            params![question_id, sub_code],
        )
        .map_err(|e| format!("Failed to delete answer key: {}", e))?;

        if sub_code.is_empty() {
            if let Err(e) = conn.execute(
                "DELETE FROM QuestionAnswerKeys WHERE question_id = ?1 AND sub_question_code = 'main'",
                params![question_id],
            ) {
                logger::warn(format!(
                    "Failed to clean legacy 'main' answer key after delete for question {}: {}",
                    question_id, e
                ));
            }
        }

        return Ok("Answer key deleted successfully".to_string());
    }

    // Upsert into AnswerKeys table
    conn.execute(
        "INSERT INTO QuestionAnswerKeys (question_id, sub_question_code, answer_key_text, is_required, order_index)
         VALUES (?1, ?2, ?3, 1, 0)
         ON CONFLICT(question_id, sub_question_code) DO UPDATE SET
            answer_key_text = excluded.answer_key_text",
        params![question_id, sub_code, trimmed],
    ).map_err(|e| format!("Failed to update answer key: {}", e))?;

    // Cleanup: If this is a single-part question (empty sub_code),
    // remove any legacy 'main' entries that might have been created by mistake
    if sub_code.is_empty() {
        if let Err(e) = conn.execute(
            "DELETE FROM QuestionAnswerKeys WHERE question_id = ?1 AND sub_question_code = 'main'",
            params![question_id],
        ) {
            logger::warn(format!(
                "Failed to clean legacy 'main' answer key after update for question {}: {}",
                question_id, e
            ));
        }
    }

    Ok("Answer key updated successfully".to_string())
}

/// Replace all answer keys for a question
pub fn replace_question_answer_keys_inner(
    question_id: String,
    items: Vec<ReplaceAnswerKeyItem>,
) -> Result<String, String> {
    let mut conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    replace_question_answer_keys_with_conn(&mut conn, question_id, items)
}

pub fn replace_question_answer_keys_with_conn(
    conn: &mut Connection,
    question_id: String,
    items: Vec<ReplaceAnswerKeyItem>,
) -> Result<String, String> {
    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    replace_question_answer_keys_in_transaction(&tx, &question_id, &items)?;

    tx.commit()
        .map_err(|e| format!("Failed to commit answer key replacement: {}", e))?;
    Ok("Answer keys replaced successfully".to_string())
}

pub(crate) fn replace_question_answer_keys_in_transaction(
    conn: &Connection,
    question_id: &str,
    items: &[ReplaceAnswerKeyItem],
) -> Result<(), String> {
    // Only enforce Section 300 policy when actually writing answer keys.
    if !items.is_empty() {
        ensure_section_300_policy_allows_question_action(conn, question_id, "answer keys")?;
    }

    let mut proposed_codes = HashSet::new();
    let proposed_items: Vec<(usize, &ReplaceAnswerKeyItem, &str, &str)> = items
        .iter()
        .enumerate()
        .filter_map(|(idx, item)| {
            let text = item.text.trim();
            if text.is_empty() {
                None
            } else {
                Some((idx, item, item.sub_code.trim(), text))
            }
        })
        .collect();
    for (_, _, code, _) in &proposed_items {
        if !proposed_codes.insert((*code).to_string()) {
            return Err(format!("Duplicate Answer Key code: {code}"));
        }
    }

    let mut existing_stmt = conn
        .prepare("SELECT sub_question_code FROM QuestionAnswerKeys WHERE question_id = ?1")
        .map_err(|e| format!("Failed to inspect existing Answer Keys: {e}"))?;
    let existing_codes = existing_stmt
        .query_map(params![question_id], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to inspect existing Answer Keys: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to inspect existing Answer Keys: {e}"))?;

    for code in existing_codes
        .iter()
        .filter(|code| !proposed_codes.contains(code.as_str()))
    {
        let has_answers: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM UserAnswers WHERE question_id = ?1 AND sub_question_code = ?2)",
                params![question_id, code],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to inspect dependent Trainee Answers: {e}"))?;
        if has_answers {
            return Err(format!(
                "Cannot remove Answer Key {code}: dependent Trainee Answers exist"
            ));
        }
    }

    for code in existing_codes
        .iter()
        .filter(|code| !proposed_codes.contains(code.as_str()))
    {
        conn.execute(
            "DELETE FROM QuestionAnswerKeys WHERE question_id = ?1 AND sub_question_code = ?2",
            params![question_id, code],
        )
        .map_err(|e| format!("Failed to remove Answer Key {code}: {e}"))?;
    }

    for (idx, item, sub_code, text) in proposed_items {
        conn.execute(
            "INSERT INTO QuestionAnswerKeys (question_id, sub_question_code, answer_key_text, is_required, order_index)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(question_id, sub_question_code) DO UPDATE SET
                answer_key_text = excluded.answer_key_text,
                is_required = excluded.is_required,
                order_index = excluded.order_index",
            params![question_id, sub_code, text, item.is_required.unwrap_or(true), idx as i32],
        ).map_err(|e| format!("Failed to insert answer key: {}", e))?;
    }

    Ok(())
}
