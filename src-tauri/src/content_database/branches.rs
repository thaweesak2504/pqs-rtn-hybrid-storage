use super::*;
use rusqlite::{params, Connection};

/// Get all occupation branches
pub fn get_occupation_branches() -> Result<Vec<OccupationBranch>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    ensure_standard_occupation_branch_exists(&conn)?;
    let mut stmt = conn
        .prepare("SELECT code, name FROM OccupationBranches ORDER BY code")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(OccupationBranch {
                code: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}
/// Create a new occupation branch
pub fn create_occupation_branch(code: String, name: String) -> Result<OccupationBranch, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    conn.execute(
        "INSERT INTO OccupationBranches (code, name) VALUES (?1, ?2)",
        params![code, name],
    )
    .map_err(|e| e.to_string())?;
    Ok(OccupationBranch { code, name })
}
/// Update an occupation branch name
pub fn update_occupation_branch(code: String, name: String) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    if is_protected_main_branch(&conn, &code)? && name != STANDARD_BRANCH_NAME {
        return Err("Cannot rename the protected standard occupation branch".to_string());
    }
    conn.execute(
        "UPDATE OccupationBranches SET name = ?1 WHERE code = ?2",
        params![name, code],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
/// Delete an occupation branch (cascades to sub-branches and sub-questions)
pub fn delete_occupation_branch(code: String) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    if is_protected_main_branch(&conn, &code)? {
        return Err("Cannot delete the protected standard occupation branch".to_string());
    }
    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM OccupationBranches WHERE code = ?1",
        params![code],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
/// Get sub-branches for a given main branch
pub fn get_occupation_sub_branches(
    branch_code: String,
) -> Result<Vec<OccupationSubBranch>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    ensure_standard_occupation_branch_exists(&conn)?;
    let mut stmt = conn.prepare(
        "SELECT code, branch_code, name FROM OccupationSubBranches WHERE branch_code = ?1 ORDER BY code"
    ).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![branch_code], |row| {
            Ok(OccupationSubBranch {
                code: row.get(0)?,
                branch_code: row.get(1)?,
                name: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}
/// Create a new sub-branch
pub fn create_occupation_sub_branch(
    code: String,
    branch_code: String,
    name: String,
) -> Result<OccupationSubBranch, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    conn.execute(
        "INSERT INTO OccupationSubBranches (code, branch_code, name) VALUES (?1, ?2, ?3)",
        params![code, branch_code, name],
    )
    .map_err(|e| e.to_string())?;
    Ok(OccupationSubBranch {
        code,
        branch_code,
        name,
    })
}
/// Update a sub-branch name
pub fn update_occupation_sub_branch(
    code: String,
    branch_code: String,
    name: String,
) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    if is_protected_sub_branch(&conn, &branch_code, &code)? && name != STANDARD_BRANCH_NAME {
        return Err("Cannot rename the protected standard occupation sub-branch".to_string());
    }
    conn.execute(
        "UPDATE OccupationSubBranches SET name = ?1 WHERE branch_code = ?2 AND code = ?3",
        params![name, branch_code, code],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
/// Delete a sub-branch (cascades to sub-questions)
pub fn delete_occupation_sub_branch(code: String, branch_code: String) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    if is_protected_sub_branch(&conn, &branch_code, &code)? {
        return Err("Cannot delete the protected standard occupation sub-branch".to_string());
    }
    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM OccupationSubBranches WHERE branch_code = ?1 AND code = ?2",
        params![branch_code, code],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
/// Get sub-questions for a given branch + sub-branch pair
pub fn get_occupation_sub_questions(
    branch_code: String,
    sub_branch_code: String,
) -> Result<Vec<OccupationSubQuestion>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    let mut stmt = conn
        .prepare(
            "SELECT id, branch_code, sub_branch_code, code, text, always_checked, sequence
         FROM OccupationSubQuestions WHERE branch_code = ?1 AND sub_branch_code = ?2
         ORDER BY sequence, id",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![branch_code, sub_branch_code], |row| {
            Ok(OccupationSubQuestion {
                id: row.get(0)?,
                branch_code: row.get(1)?,
                sub_branch_code: row.get(2)?,
                code: row.get(3)?,
                text: row.get(4)?,
                always_checked: row.get(5)?,
                sequence: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}
/// Get ALL sub-questions for a given main branch (across all sub-branches)
pub fn get_all_sub_questions_for_branch(
    branch_code: String,
) -> Result<Vec<OccupationSubQuestion>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    let mut stmt = conn
        .prepare(
            "SELECT id, branch_code, sub_branch_code, code, text, always_checked, sequence
         FROM OccupationSubQuestions WHERE branch_code = ?1
         ORDER BY sub_branch_code, sequence, id",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![branch_code], |row| {
            Ok(OccupationSubQuestion {
                id: row.get(0)?,
                branch_code: row.get(1)?,
                sub_branch_code: row.get(2)?,
                code: row.get(3)?,
                text: row.get(4)?,
                always_checked: row.get(5)?,
                sequence: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}
/// Create a new sub-question
pub fn create_occupation_sub_question(
    req: CreateSubQuestionRequest,
) -> Result<OccupationSubQuestion, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Get next sequence
    let max_seq: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sequence), 0) FROM OccupationSubQuestions WHERE branch_code = ?1 AND sub_branch_code = ?2",
        params![req.branch_code, req.sub_branch_code],
        |row| row.get(0),
    ).unwrap_or(0);

    conn.execute(
        "INSERT INTO OccupationSubQuestions (branch_code, sub_branch_code, code, text, always_checked, sequence)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![req.branch_code, req.sub_branch_code, req.code, req.text, req.always_checked.unwrap_or(false), max_seq + 1],
    ).map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    Ok(OccupationSubQuestion {
        id,
        branch_code: req.branch_code,
        sub_branch_code: req.sub_branch_code,
        code: req.code,
        text: req.text,
        always_checked: req.always_checked.unwrap_or(false),
        sequence: max_seq + 1,
    })
}
/// Update a sub-question text
pub fn update_occupation_sub_question(
    id: i64,
    text: String,
    always_checked: Option<bool>,
) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    if let Some(ac) = always_checked {
        conn.execute(
            "UPDATE OccupationSubQuestions SET text = ?1, always_checked = ?2 WHERE id = ?3",
            params![text, ac, id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE OccupationSubQuestions SET text = ?1 WHERE id = ?2",
            params![text, id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}
/// Delete all sub-questions for a specific branch and sub-branch (slot).
pub fn delete_occupation_sub_questions_by_sub_branch(
    branch_code: String,
    sub_branch_code: String,
) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    conn.execute(
        "DELETE FROM OccupationSubQuestions WHERE branch_code = ?1 AND sub_branch_code = ?2",
        params![branch_code, sub_branch_code],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
/// Delete a sub-question
pub fn delete_occupation_sub_question(id: i64) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    conn.execute(
        "DELETE FROM OccupationSubQuestions WHERE id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
/// Get usage counts for each sub-question code under a given L1 question (parent).
/// Returns a map of sub_question_code → count of children (and descendants) that have selected it,
/// plus the total count of all descendant questions under this parent.
/// Uses QuestionSubQuestionLinks (relational) instead of JSON metadata for accuracy.
pub fn get_sub_question_usage_counts(
    parent_id: String,
) -> Result<SubQuestionUsageResponse, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // 1. Get countable descendant IDs (recursive).
    // Include ALL descendants EXCEPT those whose children are 'required_instance'
    // (300Template: L2 syncs its selectedSubQuestions to L3 copies, so counting
    // both L2 and L3 would double-count).  In 200Template, L2 has normal children
    // with independent SubQ selections — both L2 and L3 must be counted.
    let mut stmt_ids = conn
        .prepare(
            "WITH RECURSIVE descendants(id) AS (
            SELECT id FROM Questions WHERE parent_id = ?1
            UNION ALL
            SELECT q.id FROM Questions q
            JOIN descendants d ON q.parent_id = d.id
        )
        SELECT d.id FROM descendants d
        WHERE NOT EXISTS (
            SELECT 1 FROM Questions c
            WHERE c.parent_id = d.id AND c.question_type = 'required_instance'
        )",
        )
        .map_err(|e| format!("Failed to prepare descendant query: {}", e))?;

    let descendant_ids: Vec<String> = stmt_ids
        .query_map(params![parent_id], |row| row.get(0))
        .map_err(|e| format!("Failed to query descendants: {}", e))?
        .collect::<Result<Vec<String>, _>>()
        .map_err(|e| format!("Failed to collect descendant IDs: {}", e))?;

    let total_children = descendant_ids.len() as i64;

    if descendant_ids.is_empty() {
        return Ok(SubQuestionUsageResponse {
            usage_map: std::collections::HashMap::new(),
            total_children: 0,
        });
    }

    // 2. Collect counts for each sub_question_code — same filter as above
    let mut stmt_counts = conn
        .prepare(
            "WITH RECURSIVE descendants(id) AS (
            SELECT id FROM Questions WHERE parent_id = ?1
            UNION ALL
            SELECT q.id FROM Questions q
            JOIN descendants d ON q.parent_id = d.id
        )
        SELECT ql.sub_question_code, COUNT(DISTINCT ql.question_id) as usage_count
        FROM QuestionSubQuestionLinks ql
        JOIN descendants d ON ql.question_id = d.id
        WHERE NOT EXISTS (
            SELECT 1 FROM Questions c
            WHERE c.parent_id = d.id AND c.question_type = 'required_instance'
        )
        GROUP BY ql.sub_question_code",
        )
        .map_err(|e| format!("Failed to prepare recursive usage count query: {}", e))?;

    let rows = stmt_counts
        .query_map(params![parent_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })
        .map_err(|e| format!("Failed to query recursive usage counts: {}", e))?;

    let mut usage_map = std::collections::HashMap::new();
    for row in rows {
        let (code, count) = row.map_err(|e| e.to_string())?;
        usage_map.insert(code, count);
    }

    Ok(SubQuestionUsageResponse {
        usage_map,
        total_children,
    })
}
/// Reorder sub-questions by updating their sequence values.
/// The order of IDs in the input vector determines the new sequence (1-based).
pub fn reorder_occupation_sub_questions_with_conn(
    conn: &Connection,
    ids: Vec<i64>,
) -> Result<(), String> {
    let tx = conn
        .unchecked_transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;
    for (idx, id) in ids.iter().enumerate() {
        tx.execute(
            "UPDATE OccupationSubQuestions SET sequence = ?1 WHERE id = ?2",
            params![(idx as i32) + 1, id],
        )
        .map_err(|e| format!("Failed to reorder sub-question id={}: {}", id, e))?;
    }
    tx.commit()
        .map_err(|e| format!("Failed to commit reorder: {}", e))?;
    Ok(())
}

pub fn reorder_occupation_sub_questions(ids: Vec<i64>) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    reorder_occupation_sub_questions_with_conn(&conn, ids)
}

/// Batch-create multiple sub-questions at once (used by CareerBranchManagerModal).
pub fn batch_create_occupation_sub_questions_with_conn(
    conn: &Connection,
    items: Vec<BatchSubQuestionItem>,
) -> Result<Vec<OccupationSubQuestion>, String> {
    let tx = conn
        .unchecked_transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;
    let mut results = Vec::new();
    for item in items {
        tx.execute(
            "INSERT INTO OccupationSubQuestions (branch_code, sub_branch_code, code, text, always_checked, sequence)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                item.branch_code,
                item.sub_branch_code,
                item.code,
                item.text,
                item.always_checked,
                item.sequence
            ],
        )
        .map_err(|e| format!("Failed to batch-create sub-question '{}': {}", item.code, e))?;
        let id = tx.last_insert_rowid();
        results.push(OccupationSubQuestion {
            id,
            branch_code: item.branch_code,
            sub_branch_code: item.sub_branch_code,
            code: item.code,
            text: item.text,
            always_checked: item.always_checked,
            sequence: item.sequence,
        });
    }
    tx.commit()
        .map_err(|e| format!("Failed to commit batch create: {}", e))?;
    Ok(results)
}

pub fn batch_create_occupation_sub_questions(
    items: Vec<BatchSubQuestionItem>,
) -> Result<Vec<OccupationSubQuestion>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    batch_create_occupation_sub_questions_with_conn(&conn, items)
}

/// Get all sub-questions belonging to the "ต้นแบบมาตรฐาน" standard branch.
/// Used as read-only reference data in the CareerBranchManagerModal.
pub fn get_standard_branch_sub_questions_with_conn(
    conn: &Connection,
) -> Result<Vec<OccupationSubQuestion>, String> {
    ensure_standard_occupation_branch_exists(&conn)?;

    // Find the standard main branch code
    let main_code: String = conn
        .query_row(
            "SELECT code FROM OccupationBranches WHERE name = ?1 LIMIT 1",
            params![STANDARD_BRANCH_NAME],
            |row| row.get(0),
        )
        .map_err(|e| format!("Standard branch not found: {}", e))?;

    // Get all sub-questions for that main branch (across all sub-branches)
    let mut stmt = conn
        .prepare(
            "SELECT id, branch_code, sub_branch_code, code, text, always_checked, sequence
             FROM OccupationSubQuestions WHERE branch_code = ?1
             ORDER BY sub_branch_code, sequence, id",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;
    let rows = stmt
        .query_map(params![main_code], |row| {
            Ok(OccupationSubQuestion {
                id: row.get(0)?,
                branch_code: row.get(1)?,
                sub_branch_code: row.get(2)?,
                code: row.get(3)?,
                text: row.get(4)?,
                always_checked: row.get(5)?,
                sequence: row.get(6)?,
            })
        })
        .map_err(|e| format!("Failed to query standard sub-questions: {}", e))?;
    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn get_standard_branch_sub_questions() -> Result<Vec<OccupationSubQuestion>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    get_standard_branch_sub_questions_with_conn(&conn)
}

/// Toggle the completion flag for a specific slot (tab) of a branch+sub pair.
/// Returns the new is_completed value.
pub fn toggle_slot_completion(
    branch_code: String,
    sub_branch_code: String,
    slot_id: String,
) -> Result<bool, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    let current: bool = conn
        .query_row(
            "SELECT COALESCE(is_completed, 0) FROM OccupationSlotCompletion WHERE branch_code = ?1 AND sub_branch_code = ?2 AND slot_id = ?3",
            params![branch_code, sub_branch_code, slot_id],
            |row| row.get(0),
        )
        .unwrap_or(false);
    let new_val = !current;
    conn.execute(
        "INSERT INTO OccupationSlotCompletion (branch_code, sub_branch_code, slot_id, is_completed) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(branch_code, sub_branch_code, slot_id) DO UPDATE SET is_completed = ?4",
        params![branch_code, sub_branch_code, slot_id, new_val],
    )
    .map_err(|e| format!("Failed to toggle slot completion: {}", e))?;
    Ok(new_val)
}

/// Get slot-level completion map for a branch+sub pair.
/// Returns a map of slot_id (e.g. "22", "24", "32"-"35") → bool.
pub fn get_slot_completion_map(
    branch_code: String,
    sub_branch_code: String,
) -> Result<std::collections::HashMap<String, bool>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT slot_id, COALESCE(is_completed, 0) FROM OccupationSlotCompletion WHERE branch_code = ?1 AND sub_branch_code = ?2")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let rows = stmt
        .query_map(params![branch_code, sub_branch_code], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, bool>(1)?))
        })
        .map_err(|e| format!("Failed to query: {}", e))?;
    let mut map = std::collections::HashMap::new();
    for row in rows {
        let (slot_id, done) = row.map_err(|e| format!("Row error: {}", e))?;
        map.insert(slot_id, done);
    }
    Ok(map)
}

/// A completed branch+sub pair (all 6 slots completed).
#[derive(serde::Serialize)]
pub struct CompletedBranchPair {
    pub branch_code: String,
    pub sub_branch_code: String,
}

/// Get all branch+sub pairs where ALL 6 slots are marked as completed.
/// The standard branch (ต้นแบบมาตรฐาน) is always included as completed.
pub fn get_all_completed_branch_pairs() -> Result<Vec<CompletedBranchPair>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    let slot_count = 6i64; // 22, 24, 32, 33, 34, 35

    // Find branch+sub pairs where all 6 slots are completed
    let mut stmt = conn
        .prepare(
            "SELECT branch_code, sub_branch_code FROM OccupationSlotCompletion
             WHERE is_completed = 1
             GROUP BY branch_code, sub_branch_code
             HAVING COUNT(*) >= ?1",
        )
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let rows = stmt
        .query_map(params![slot_count], |row| {
            Ok(CompletedBranchPair {
                branch_code: row.get(0)?,
                sub_branch_code: row.get(1)?,
            })
        })
        .map_err(|e| format!("Failed to query: {}", e))?;
    let mut result: Vec<CompletedBranchPair> = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| format!("Row error: {}", e))?);
    }

    // Always include the standard branch
    let std_code: Option<String> = conn
        .query_row(
            "SELECT code FROM OccupationBranches WHERE name = ?1",
            params![super::schema::STANDARD_BRANCH_NAME],
            |row| row.get(0),
        )
        .ok();
    if let Some(std_main) = std_code {
        let mut sub_stmt = conn
            .prepare("SELECT code FROM OccupationSubBranches WHERE branch_code = ?1")
            .map_err(|e| format!("Failed to prepare: {}", e))?;
        let sub_rows = sub_stmt
            .query_map(params![std_main], |row| row.get::<_, String>(0))
            .map_err(|e| format!("Failed to query: {}", e))?;
        for sub_row in sub_rows {
            let sub_code = sub_row.map_err(|e| format!("Row error: {}", e))?;
            if !result
                .iter()
                .any(|p| p.branch_code == std_main && p.sub_branch_code == sub_code)
            {
                result.push(CompletedBranchPair {
                    branch_code: std_main.clone(),
                    sub_branch_code: sub_code,
                });
            }
        }
    }

    Ok(result)
}
