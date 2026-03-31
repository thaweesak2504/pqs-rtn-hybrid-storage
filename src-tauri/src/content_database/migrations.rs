use crate::logger;
use rusqlite::{params, Connection};

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
