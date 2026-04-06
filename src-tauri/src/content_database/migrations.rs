use crate::logger;
use rusqlite::{params, Connection};
use std::collections::HashMap;

// ============================================================
// Sub-question code format migration (→ 8-digit: AABCCDDEE)
// ============================================================

/// Pad a branch code to 2 digits: "STD" → "00", "1" → "01", "12" → "12".
fn pad_branch_code(code: &str) -> String {
    if code == "STD" {
        "00".to_string()
    } else {
        format!("{:0>2}", code)
    }
}

/// Migrate all sub-question codes to the standardised 8-digit format.
///
/// Format: `AB` (slot) + `CC` (main branch, 2-pad) + `DD` (sub branch, 2-pad) + `EE` (sequence, 2-pad)
///
/// Example: `22010101` = 200-series section-2, main branch 01, sub branch 01, item 01.
///
/// Tables updated:
///   OccupationSubQuestions.code, QuestionSubQuestionLinks.sub_question_code,
///   QuestionAnswerKeys.sub_question_code, UserAnswers.sub_question_code,
///   Questions.metadata (activeSubQuestions + selectedSubQuestions JSON arrays).
pub fn migrate_sub_question_codes_to_8digit(conn: &Connection) -> Result<(), String> {
    // Quick check: anything to migrate?
    let needs_migration: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM OccupationSubQuestions WHERE LENGTH(code) <> 8)",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !needs_migration {
        return Ok(());
    }

    logger::info("Migrating sub-question codes to 8-digit format (AABCCDDEE)...");

    // 1. Read all sub-questions that need migration, ordered for deterministic sequencing
    let mut stmt = conn
        .prepare(
            "SELECT id, code, branch_code, sub_branch_code, sequence
             FROM OccupationSubQuestions
             WHERE LENGTH(code) <> 8
             ORDER BY branch_code, sub_branch_code, SUBSTR(code, 1, 2), sequence, id",
        )
        .map_err(|e| format!("Failed to prepare migration query: {}", e))?;

    let rows: Vec<(i64, String, String, String, i32)> = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, i32>(4)?,
            ))
        })
        .map_err(|e| format!("Failed to query sub-questions: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    if rows.is_empty() {
        return Ok(());
    }

    // 2. Group by (branch_code, sub_branch_code, slot_prefix) and build old→new mapping
    let mut groups: HashMap<(String, String, String), Vec<(i64, String)>> = HashMap::new();
    for (id, code, bc, sbc, _seq) in &rows {
        if code.len() < 2 {
            continue;
        }
        let slot = code[..2].to_string();
        groups
            .entry((bc.clone(), sbc.clone(), slot))
            .or_default()
            .push((*id, code.clone()));
    }

    let mut mapping: HashMap<String, String> = HashMap::new();
    for ((bc, sbc, slot), items) in &groups {
        let pad_bc = pad_branch_code(bc);
        let pad_sbc = pad_branch_code(sbc);
        for (i, (_id, old_code)) in items.iter().enumerate() {
            let new_code = format!("{}{}{}{:02}", slot, pad_bc, pad_sbc, i + 1);
            if *old_code != new_code {
                mapping.insert(old_code.clone(), new_code);
            }
        }
    }

    if mapping.is_empty() {
        logger::info("All codes already in 8-digit format.");
        return Ok(());
    }

    logger::info(format!(
        "Migrating {} sub-question codes to 8-digit format...",
        mapping.len()
    ));

    // 3. Apply inside a transaction with FK checks disabled
    conn.execute_batch("PRAGMA foreign_keys = OFF;")
        .map_err(|e| format!("Failed to disable FK: {}", e))?;

    let tx = conn
        .unchecked_transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    for (old_code, new_code) in &mapping {
        // Referencing tables first (OR IGNORE to handle possible UNIQUE conflicts gracefully)
        let _ = tx.execute(
            "UPDATE OR IGNORE QuestionSubQuestionLinks SET sub_question_code = ?1 WHERE sub_question_code = ?2",
            params![new_code, old_code],
        );
        let _ = tx.execute(
            "UPDATE OR IGNORE QuestionAnswerKeys SET sub_question_code = ?1 WHERE sub_question_code = ?2",
            params![new_code, old_code],
        );
        let _ = tx.execute(
            "UPDATE OR IGNORE UserAnswers SET sub_question_code = ?1 WHERE sub_question_code = ?2",
            params![new_code, old_code],
        );
        // Primary table
        tx.execute(
            "UPDATE OccupationSubQuestions SET code = ?1 WHERE code = ?2",
            params![new_code, old_code],
        )
        .map_err(|e| {
            format!(
                "Failed to migrate code '{}' → '{}': {}",
                old_code, new_code, e
            )
        })?;
    }

    // 4. Migrate JSON metadata in Questions (activeSubQuestions + selectedSubQuestions)
    let mut q_stmt = tx
        .prepare("SELECT id, metadata FROM Questions WHERE metadata IS NOT NULL AND metadata <> ''")
        .map_err(|e| format!("Failed to prepare metadata query: {}", e))?;

    let questions: Vec<(String, String)> = q_stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| format!("Failed to query questions: {}", e))?
        .filter_map(|r| r.ok())
        .collect();
    drop(q_stmt);

    for (q_id, metadata) in &questions {
        if let Ok(mut json) = serde_json::from_str::<serde_json::Value>(metadata) {
            let mut changed = false;

            for key in &["activeSubQuestions", "selectedSubQuestions"] {
                if let Some(arr) = json.get_mut(*key).and_then(|v| v.as_array_mut()) {
                    for item in arr.iter_mut() {
                        if let Some(old) = item.as_str().map(|s| s.to_string()) {
                            if let Some(new_code) = mapping.get(&old) {
                                *item = serde_json::Value::String(new_code.clone());
                                changed = true;
                            }
                        }
                    }
                }
            }

            if changed {
                if let Ok(new_metadata) = serde_json::to_string(&json) {
                    let _ = tx.execute(
                        "UPDATE Questions SET metadata = ?1 WHERE id = ?2",
                        params![new_metadata, q_id],
                    );
                }
            }
        }
    }

    tx.commit()
        .map_err(|e| format!("Failed to commit code migration: {}", e))?;

    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|e| format!("Failed to re-enable FK: {}", e))?;

    logger::info("Sub-question code migration to 8-digit format completed.");
    Ok(())
}

// ============================================================
// Data Migrations
// ============================================================

/// Migrate selectedSubQuestions from JSON metadata to QuestionSubQuestionLinks table.
/// Safe to run multiple times; skips questions already having links.
pub fn migrate_selected_sub_questions_to_table(conn: &Connection) -> Result<(), String> {
    // Only process questions that have metadata containing 'selectedSubQuestions'
    // and do not already have any entries in QuestionSubQuestionLinks.
    let mut stmt = conn
        .prepare(
            "SELECT id, metadata FROM Questions
         WHERE metadata IS NOT NULL
           AND metadata LIKE '%selectedSubQuestions%'
           AND id NOT IN (SELECT DISTINCT question_id FROM QuestionSubQuestionLinks)",
        )
        .map_err(|e| format!("Failed to prepare migration query: {}", e))?;

    let rows: Vec<(String, String)> = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| format!("Failed to query migration rows: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    for (question_id, metadata_json) in rows {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&metadata_json) {
            if let Some(codes) = v.get("selectedSubQuestions").and_then(|c| c.as_array()) {
                for code_val in codes {
                    if let Some(code) = code_val.as_str() {
                        if let Err(e) = conn.execute(
                            "INSERT OR IGNORE INTO QuestionSubQuestionLinks (question_id, sub_question_code)
                             VALUES (?1, ?2)",
                            params![question_id, code],
                        ) {
                            logger::warn(format!(
                                "Failed to migrate selectedSubQuestion '{}' for question {}: {}",
                                code, question_id, e
                            ));
                        }
                    }
                }
            }
        } else {
            logger::warn(format!(
                "Skipping selectedSubQuestions migration for question {} due to invalid metadata JSON",
                question_id
            ));
        }
    }

    Ok(())
}

/// Migrate answer keys from JSON metadata to QuestionAnswerKeys table.
/// Safe to run multiple times; skips questions that already have entries.
pub fn migrate_answer_keys_to_table(conn: &Connection) -> Result<(), String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, metadata FROM Questions
         WHERE metadata IS NOT NULL
           AND (metadata LIKE '%\"answerKeys\"%' OR metadata LIKE '%\"answerKey\"%')
           AND id NOT IN (SELECT DISTINCT question_id FROM QuestionAnswerKeys)",
        )
        .map_err(|e| format!("Failed to prepare answer key migration query: {}", e))?;

    let rows: Vec<(String, String)> = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| format!("Failed to query migration rows: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    for (question_id, metadata_json) in rows {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&metadata_json) {
            let mut order_index = 0;

            // Multiple answer keys object
            if let Some(keys) = v.get("answerKeys").and_then(|c| c.as_object()) {
                // Determine order by sorting the keys string (e.g. \"ก.\", \"ข.\")
                let mut sorted_keys: Vec<_> = keys.iter().collect();
                sorted_keys.sort_by_key(|&(k, _)| k);

                for (code, key_data) in sorted_keys {
                    let mut text = String::new();
                    let mut is_required = true;

                    if let Some(data_obj) = key_data.as_object() {
                        text = data_obj
                            .get("text")
                            .and_then(|t| t.as_str())
                            .unwrap_or("")
                            .to_string();
                        is_required = data_obj
                            .get("is_required")
                            .and_then(|b| b.as_bool())
                            .unwrap_or(true);
                    } else if let Some(s) = key_data.as_str() {
                        text = s.to_string();
                    }

                    if !code.trim().is_empty() {
                        if let Err(e) = conn.execute(
                            "INSERT OR IGNORE INTO QuestionAnswerKeys (question_id, sub_question_code, answer_key_text, is_required, order_index)
                             VALUES (?1, ?2, ?3, ?4, ?5)",
                            params![&question_id, code, text, is_required, order_index],
                        ) {
                            logger::warn(format!(
                                "Failed to migrate answer key '{}' for question {}: {}",
                                code, question_id, e
                            ));
                        }
                        order_index += 1;
                    }
                }
            } else if let Some(single_key) = v.get("answerKey").and_then(|c| c.as_str()) {
                // Single question without subdivisions -> empty sub_question_code
                if !single_key.is_empty() {
                    if let Err(e) = conn.execute(
                        "INSERT OR IGNORE INTO QuestionAnswerKeys (question_id, sub_question_code, answer_key_text, is_required, order_index)
                         VALUES (?1, ?2, ?3, 1, ?4)",
                        params![&question_id, "", single_key, order_index],
                    ) {
                        logger::warn(format!(
                            "Failed to migrate single answer key for question {}: {}",
                            question_id, e
                        ));
                    }
                }
            }
        } else {
            logger::warn(format!(
                "Skipping answer-key migration for question {} due to invalid metadata JSON",
                question_id
            ));
        }
    }

    // 2. Handle metadata placeholders (requireAnswerKey: true but no key text yet)
    let mut placeholder_stmt = conn
        .prepare(
            "SELECT id FROM Questions
         WHERE metadata IS NOT NULL
           AND metadata LIKE '%\"requireAnswerKey\"%'
           AND id NOT IN (SELECT DISTINCT question_id FROM QuestionAnswerKeys)",
        )
        .map_err(|e| e.to_string())?;

    let placeholder_rows: Vec<String> = placeholder_stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    for q_id in placeholder_rows {
        // Insert a "main" placeholder entry so foreign keys work
        if let Err(e) = conn.execute(
            "INSERT OR IGNORE INTO QuestionAnswerKeys (question_id, sub_question_code, answer_key_text, is_required, order_index)
             VALUES (?1, ?2, ?3, 1, 0)",
            params![&q_id, "", ""],
        ) {
            logger::warn(format!(
                "Failed to insert placeholder answer key for question {}: {}",
                q_id, e
            ));
        }
    }

    Ok(())
}

/// Scrub legacy answer keys from JSON metadata.
/// This should only be run AFTER migrate_answer_keys_to_table.
pub fn scrub_legacy_answer_keys_from_metadata(conn: &Connection) -> Result<(), String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, metadata FROM Questions
         WHERE metadata IS NOT NULL
           AND (metadata LIKE '%\"answerKey\"%' OR metadata LIKE '%\"answerKeys\"%')",
        )
        .map_err(|e| format!("Failed to prepare scrub query: {}", e))?;

    let rows: Vec<(String, String)> = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| format!("Failed to query scrub rows: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    for (question_id, metadata_json) in rows {
        if let Ok(mut v) = serde_json::from_str::<serde_json::Value>(&metadata_json) {
            if let Some(meta_obj) = v.as_object_mut() {
                let mut changed = false;
                if meta_obj.remove("answerKey").is_some() {
                    changed = true;
                }
                if meta_obj.remove("answerKeys").is_some() {
                    changed = true;
                }

                if changed {
                    let new_metadata = serde_json::to_string(&v).map_err(|e| {
                        format!(
                            "Failed to serialize scrubbed metadata for {}: {}",
                            question_id, e
                        )
                    })?;
                    if let Err(e) = conn.execute(
                        "UPDATE Questions SET metadata = ?1 WHERE id = ?2",
                        params![new_metadata, question_id],
                    ) {
                        logger::warn(format!(
                            "Failed to scrub legacy answer keys from metadata for question {}: {}",
                            question_id, e
                        ));
                    }
                }
            }
        } else {
            logger::warn(format!(
                "Skipping metadata scrub for question {} due to invalid metadata JSON",
                question_id
            ));
        }
    }

    Ok(())
}
