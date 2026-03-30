use rusqlite::{params, Connection};

use super::*;

// ============================================================
// User Answers & Answer Keys
// ============================================================

/// Get all trainee answers for a document
pub fn get_trainee_answers(user_id: &str, document_id: &str) -> Result<Vec<UserAnswer>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT ua.user_id, ua.question_id, ua.document_id, ua.sub_question_code, ua.answer_text,
                ua.status, ua.feedback, ua.assessed_at, ua.assessed_by, ua.updated_at, ak.answer_key_text
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
        "INSERT INTO UserAnswers (user_id, question_id, document_id, sub_question_code, answer_text, status, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'pending', CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, question_id, document_id, sub_question_code) DO UPDATE SET
            answer_text = excluded.answer_text,
            status = 'pending',
            updated_at = CURRENT_TIMESTAMP",
        params![args.user_id, args.question_id, args.document_id, args.sub_question_code, args.answer_text]
    ).map_err(|e| {
        let err_msg = format!("Failed to save answer: {}", e);
        println!("DB ERROR in save_trainee_answer: {}", err_msg);
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
    let _ = recalculate_section_progress(args.user_id, args.document_id);

    Ok("Assessment saved successfully".to_string())
}

/// Clear all trainee answers and progress
pub fn clear_all_trainee_answers_inner() -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    conn.execute("DELETE FROM UserAnswers", rusqlite::params![])
        .map_err(|e| {
            println!("Failed to clear UserAnswers: {}", e);
            e.to_string()
        })?;

    conn.execute("DELETE FROM UserProgress", rusqlite::params![])
        .map_err(|e| {
            println!("Failed to clear UserProgress: {}", e);
            e.to_string()
        })?;

    println!("Successfully cleared all records from UserAnswers and UserProgress tables.");
    Ok(())
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
            let _ = conn.execute(
                "DELETE FROM QuestionAnswerKeys WHERE question_id = ?1 AND sub_question_code = 'main'",
                params![question_id],
            );
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
        let _ = conn.execute(
            "DELETE FROM QuestionAnswerKeys WHERE question_id = ?1 AND sub_question_code = 'main'",
            params![question_id],
        );
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
    // Only enforce Section 300 policy when actually writing answer keys.
    // Empty items = clear-only (harmless for new questions); skip the guard.
    if !items.is_empty() {
        ensure_section_300_policy_allows_question_action(conn, &question_id, "answer keys")?;
    }

    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    tx.execute(
        "DELETE FROM QuestionAnswerKeys WHERE question_id = ?1",
        params![question_id],
    )
    .map_err(|e| format!("Failed to clear answer keys: {}", e))?;

    for (idx, item) in items.iter().enumerate() {
        let text = item.text.trim();
        let sub_code = item.sub_code.trim();
        if text.is_empty() {
            continue;
        }

        tx.execute(
            "INSERT INTO QuestionAnswerKeys (question_id, sub_question_code, answer_key_text, is_required, order_index)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![question_id, sub_code, text, item.is_required.unwrap_or(true), idx as i32],
        ).map_err(|e| format!("Failed to insert answer key: {}", e))?;
    }

    tx.commit()
        .map_err(|e| format!("Failed to commit answer key replacement: {}", e))?;
    Ok("Answer keys replaced successfully".to_string())
}
