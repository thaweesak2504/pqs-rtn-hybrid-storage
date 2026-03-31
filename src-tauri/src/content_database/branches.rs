use super::*;
use rusqlite::params;

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
