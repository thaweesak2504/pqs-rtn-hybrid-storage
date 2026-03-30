use rusqlite::{params, Connection};

use super::*;

// ============================================================
// Internal Helpers — Cross-module utility functions
// ============================================================

pub fn get_question_section_group(conn: &Connection, question_id: &str) -> Result<Option<i32>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT s.section_group
             FROM Questions q
             JOIN Sections s ON q.section_id = s.id
             WHERE q.id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let mut rows = stmt
        .query(params![question_id])
        .map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let group: i32 = row.get(0).map_err(|e| e.to_string())?;
        Ok(Some(group))
    } else {
        Ok(None)
    }
}

pub fn ensure_section_300_policy_allows_question_action(
    conn: &Connection,
    question_id: &str,
    action_name: &str,
) -> Result<(), String> {
    if let Some(300) = get_question_section_group(conn, question_id)? {
        return Err(format!("Section 300 does not allow {}", action_name));
    }
    Ok(())
}

pub fn add_question_reference_with_conn(
    conn: &Connection,
    req: AddQuestionReferenceRequest,
) -> Result<(), String> {
    ensure_section_300_policy_allows_question_action(conn, &req.question_id, "references")?;

    // Check if already linked
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM QuestionReferences WHERE question_id = ?1 AND reference_id = ?2)",
            params![req.question_id, req.reference_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if exists {
        return Err("This reference is already linked to this question".to_string());
    }

    // Get next display_order for this question's references
    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(display_order), 0) FROM QuestionReferences WHERE question_id = ?1",
            params![req.question_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    conn.execute(
        "INSERT INTO QuestionReferences (question_id, reference_id, location_text, display_order)
         VALUES (?1, ?2, ?3, ?4)",
        params![
            req.question_id,
            req.reference_id,
            req.location_text,
            max_order + 1
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
