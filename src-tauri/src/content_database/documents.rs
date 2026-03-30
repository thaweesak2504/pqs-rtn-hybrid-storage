use super::*;
use crate::logger;
use rusqlite::{params, Connection, OptionalExtension, Result as SqlResult};

/// Generate new Document ID
pub fn generate_document_id(
    unit_code: &str,
    doc_type: &str,
    user_level: &str,
) -> SqlResult<String> {
    let conn = get_content_connection()?;

    // Pattern to match existing sequences for this unit/type/level
    // ID format: UUUUU (5) + TT (2) + L (1) + SSS (3) = 11 digits
    // Match prefix: UUUUU + TT + L
    let prefix = format!("{}{}{}", unit_code, doc_type, user_level);

    // Find max sequence for this prefix
    let mut stmt = conn.prepare("SELECT MAX(sequence) FROM Documents WHERE id LIKE ?1")?;

    let max_seq: Option<i32> = stmt
        .query_row(params![format!("{}%", prefix)], |row| row.get(0))
        .unwrap_or(None);

    let next_seq = max_seq.unwrap_or(0) + 1;
    let new_id = format!("{}{:03}", prefix, next_seq);

    Ok(new_id)
}
/// Create a new document
pub fn create_document(args: CreateDocumentArgs) -> Result<String, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Generate ID
    let new_id = generate_document_id(&args.unit_code, &args.doc_type, &args.user_level)
        .map_err(|e| format!("Failed to generate ID: {}", e))?;

    // Parse sequence for storage
    let sequence = new_id[8..11].parse::<i32>().unwrap_or(0);

    conn.execute(
        "INSERT INTO Documents (id, name, applied_to, unit_owner_id, unit_code, doc_type, user_level, sequence)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            new_id,            args.name,            args.applied_to,            args.unit_id,            args.unit_code,            args.doc_type,            args.user_level,            sequence
        ],
    ).map_err(|e| format!("Failed to insert document: {}", e))?;

    // Set default occupation branch to ต้นแบบมาตรฐาน / ต้นแบบมาตรฐาน
    ensure_standard_occupation_branch_exists(&conn)?;
    let default_main: Option<String> = conn
        .query_row(
            "SELECT code FROM OccupationBranches WHERE name = ?1 LIMIT 1",
            params![STANDARD_BRANCH_NAME],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to find standard branch: {}", e))?
        .or(None);

    if let Some(ref main_code) = default_main {
        let default_sub: Option<String> = conn.query_row(
            "SELECT code FROM OccupationSubBranches WHERE branch_code = ?1 AND name = ?2 LIMIT 1",
            params![main_code, STANDARD_BRANCH_NAME],
            |row| row.get(0),
        ).optional().map_err(|e| format!("Failed to find standard sub-branch: {}", e))?.or(None);

        conn.execute(
            "UPDATE Documents SET occupation_branch_main = ?1, occupation_branch_sub = ?2 WHERE id = ?3",
            params![default_main, default_sub, new_id],
        ).map_err(|e| format!("Failed to set default branch: {}", e))?;
    }

    // Seed Template (100, 200, 300)
    // Need unit name for 200 System Description
    let unit_name: String = conn
        .query_row(
            "SELECT unit_name FROM OwnerUnits WHERE unit_id = ?1",
            params![args.unit_id],
            |row| row.get(0),
        )
        .unwrap_or("Unknown Unit".to_string());

    seed_document_template(&conn, &new_id, &unit_name)
        .map_err(|e| format!("Failed to seed template: {}", e))?;

    // Auto-create Section 101 (System-defined: Precautions)
    conn.execute(
        "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, display_order, is_system_defined)
         VALUES (?1, 100, 101, 'ข้อควรระมัดระวังอันตรายพื้นฐาน Safety Fundamentals', '101 Precautions', 1, 1)",
        params![new_id],
    ).map_err(|e| format!("Failed to create Section 101: {}", e))?;

    Ok(new_id)
}
/// Seed content database from SQL file
pub fn seed_content_database_from_file(file_path: &str) -> Result<String, String> {
    logger::info(format!("Seeding content database from file: {}", file_path));

    let sql_content = std::fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read SQL file: {}", e))?;

    let conn = get_content_connection()
        .map_err(|e| format!("Failed to connect to content database: {}", e))?;

    conn.execute_batch(&sql_content)
        .map_err(|e| format!("Failed to execute SQL batch: {}", e))?;

    Ok("Content database seeded successfully".to_string())
}
/// Get owner units, optionally filtered by parent_id
pub fn get_owner_units(parent_id: Option<String>) -> Result<Vec<OwnerUnit>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let mut query =
        String::from("SELECT unit_id, unit_name, unit_abbr, parent_id, unit_level FROM OwnerUnits");
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(pid) = &parent_id {
        query.push_str(" WHERE parent_id = ?1");
        params.push(Box::new(pid.clone()));
    } else {
        // Top level (e.g. Navy itself or roots)
        // In our data, Level 1 roots have parent_id NULL or empty?
        // Let's assume NULL for roots based on SQL
        query.push_str(" WHERE parent_id IS NULL");
    }

    query.push_str(" ORDER BY unit_id");

    let mut stmt = conn
        .prepare(&query)
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let unit_iter = stmt
        .query_map(rusqlite::params_from_iter(params.iter()), |row| {
            Ok(OwnerUnit {
                unit_id: row.get(0)?,
                unit_name: row.get(1)?,
                unit_abbr: row.get(2)?,
                parent_id: row.get(3)?,
                unit_level: row.get(4)?,
            })
        })
        .map_err(|e| format!("Failed to query map: {}", e))?;

    let mut units = Vec::new();
    for unit in unit_iter {
        units.push(unit.map_err(|e| format!("Failed to retrieve unit row: {}", e))?);
    }

    Ok(units)
}
/// Search documents with filters
pub fn search_documents(
    unit_id_prefix: Option<String>,
    doc_type: Option<String>,
    name_part: Option<String>,
    status: Option<String>,
) -> Result<Vec<Document>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let mut query = String::from(
        "SELECT id, name, applied_to, unit_owner_id, unit_code, doc_type, user_level, status, created_at, updated_at         FROM Documents WHERE 1=1"
    );
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    // Filter by Unit Hierarchy (using LIKE 'prefix%')
    if let Some(prefix) = unit_id_prefix {
        if !prefix.is_empty() {
            query.push_str(" AND unit_owner_id LIKE ?");
            // If prefix is "227", match "227%"
            params.push(Box::new(format!("{}%", prefix)));
        }
    }

    // Filter by Doc Type
    if let Some(dtype) = doc_type {
        if !dtype.is_empty() {
            query.push_str(" AND doc_type = ?");
            params.push(Box::new(dtype));
        }
    }

    // Filter by Name (partial match)
    if let Some(name) = name_part {
        if !name.is_empty() {
            query.push_str(" AND name LIKE ?");
            params.push(Box::new(format!("%{}%", name)));
        }
    }

    // Filter by Status
    if let Some(st) = status {
        if !st.is_empty() {
            query.push_str(" AND status = ?");
            params.push(Box::new(st));
        }
    }

    query.push_str(" ORDER BY updated_at DESC, created_at DESC LIMIT 100"); // Sort by newest first, limit results

    let mut stmt = conn
        .prepare(&query)
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let doc_iter = stmt
        .query_map(rusqlite::params_from_iter(params.iter()), |row| {
            Ok(Document {
                id: row.get(0)?,
                name: row.get(1)?,
                applied_to: row.get(2)?,
                unit_owner_id: row.get(3)?,
                unit_code: row.get(4)?,
                doc_type: row.get(5)?,
                user_level: row.get(6)?,
                status: row.get(7)?,
                // SQLite DATETIME comes as string usually
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|e| format!("Failed to query map: {}", e))?;

    let mut docs = Vec::new();
    for doc in doc_iter {
        docs.push(doc.map_err(|e| format!("Failed to retrieve row: {}", e))?);
    }

    Ok(docs)
}
const PROTECTED_DOCUMENT_IDS: &[&str] = &["22724201001"];
/// Delete a document by ID
pub fn delete_document(id: String) -> Result<String, String> {
    // Guard: built-in example documents are protected from deletion.
    if PROTECTED_DOCUMENT_IDS.contains(&id.as_str()) {
        return Err(format!(
            "เอกสาร {} เป็นเอกสารตัวอย่างที่ติดมากับแอปพลิเคชัน ไม่อนุญาตให้ลบ",
            id
        ));
    }

    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Check if document exists first
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM Documents WHERE id = ?1)",
            params![id],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !exists {
        return Err(format!("Document with ID {} not found", id));
    }

    // Perform delete
    conn.execute("DELETE FROM Documents WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete document: {}", e))?;

    Ok(format!("Document {} deleted successfully", id))
}
/// Update an existing document
pub fn update_document(args: UpdateDocumentArgs) -> Result<String, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Check if document exists
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM Documents WHERE id = ?1)",
            params![args.id],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !exists {
        return Err(format!("Document with ID {} not found", args.id));
    }

    // Perform update
    conn.execute(
        "UPDATE Documents SET name = ?1, applied_to = ?2, doc_type = ?3, user_level = ?4, updated_at = CURRENT_TIMESTAMP WHERE id = ?5",
        params![args.name, args.applied_to, args.doc_type, args.user_level, args.id]
    ).map_err(|e| format!("Failed to update document: {}", e))?;

    Ok(format!("Document {} updated successfully", args.id))
}
/// Get the occupation branch selection for a document
pub fn get_document_branch(doc_id: String) -> Result<DocumentBranch, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    conn.query_row(
        "SELECT occupation_branch_main, occupation_branch_sub FROM Documents WHERE id = ?1",
        params![doc_id],
        |row| {
            Ok(DocumentBranch {
                occupation_branch_main: row.get(0)?,
                occupation_branch_sub: row.get(1)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}
pub fn update_document_branch_with_conn(
    conn: &Connection,
    doc_id: &str,
    branch_main: Option<String>,
    branch_sub: Option<String>,
) -> Result<(), String> {
    // Policy: block branch change if evaluation has started (UserAnswers exist)
    // unless the new values are identical to the current ones.
    let current: Result<(Option<String>, Option<String>), _> = conn.query_row(
        "SELECT occupation_branch_main, occupation_branch_sub FROM Documents WHERE id = ?1",
        params![doc_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    );
    if let Ok((cur_main, cur_sub)) = current {
        let changing = cur_main != branch_main || cur_sub != branch_sub;
        if changing {
            // Check if UserAnswers table exists and has rows for this document
            let has_answers: bool = conn
                .query_row(
                    "SELECT EXISTS(SELECT 1 FROM UserAnswers WHERE document_id = ?1)",
                    params![doc_id],
                    |row| row.get(0),
                )
                .unwrap_or(false);
            if has_answers {
                return Err(
                    "Cannot change document branch after evaluation has started".to_string()
                );
            }
        }
    }

    conn.execute(
        "UPDATE Documents SET occupation_branch_main = ?1, occupation_branch_sub = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
        params![branch_main, branch_sub, doc_id]
    ).map_err(|e| e.to_string())?;

    Ok(())
}
/// Update occupation branch selection for a document
pub fn update_document_branch(
    doc_id: String,
    branch_main: Option<String>,
    branch_sub: Option<String>,
) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    update_document_branch_with_conn(&conn, &doc_id, branch_main, branch_sub)
}
/// Check if a main branch is assigned to any document
/// Same approach as career branch protection — check Documents table directly
pub fn check_branch_usage_global(branch_code: String) -> Result<BranchUsageReport, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT id, name FROM Documents WHERE occupation_branch_main = ?1")
        .map_err(|e| e.to_string())?;

    let docs: Vec<(String, String)> = stmt
        .query_map(params![branch_code], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let document_count = docs.len() as i64;
    let document_names: Vec<String> = docs
        .into_iter()
        .map(|(id, name)| format!("{} ({})", name, id))
        .collect();

    Ok(BranchUsageReport {
        is_used: document_count > 0,
        document_count,
        document_names,
    })
}
/// Check if a sub-branch is assigned to any document
/// Same approach as career branch protection — check Documents table directly
pub fn check_sub_branch_usage_global(
    branch_code: String,
    sub_code: String,
) -> Result<BranchUsageReport, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT id, name FROM Documents WHERE occupation_branch_main = ?1 AND occupation_branch_sub = ?2"
    ).map_err(|e| e.to_string())?;

    let docs: Vec<(String, String)> = stmt
        .query_map(params![branch_code, sub_code], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let document_count = docs.len() as i64;
    let document_names: Vec<String> = docs
        .into_iter()
        .map(|(id, name)| format!("{} ({})", name, id))
        .collect();

    Ok(BranchUsageReport {
        is_used: document_count > 0,
        document_count,
        document_names,
    })
}
/// Check if changing career branch will affect existing SubQ usage in target questions
/// Target questions: 2xx.2, 2xx.4 (section_group=200, sequence=2,4)
///                   3xx.2-3xx.5 (section_group=300, sequence=2,3,4,5)
/// For L1 questions, SubQ usage is indicated by metadata JSON field 'activeSubQuestions'
pub fn check_career_branch_usage(doc_id: String) -> Result<CareerBranchUsageReport, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Check for L1 questions with activeSubQuestions in metadata JSON
    let mut stmt = conn
        .prepare(
            "SELECT q.id, q.metadata, s.section_group
         FROM Questions q
         JOIN Sections s ON s.id = q.section_id
         WHERE q.document_id = ?1
           AND q.parent_id IS NULL
           AND q.metadata IS NOT NULL
           AND (
             (s.section_group = 200 AND q.sequence IN (2, 4))
             OR (s.section_group = 300 AND q.sequence IN (2, 3, 4, 5))
           )",
        )
        .map_err(|e| e.to_string())?;

    let rows: Vec<(String, String, i32)> = stmt
        .query_map(params![doc_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut affected_count = 0i64;
    let mut affected_groups = std::collections::HashSet::new();

    for (_id, metadata_json, section_group) in rows {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&metadata_json) {
            // Check if activeSubQuestions exists and is non-empty array
            if let Some(active) = v.get("activeSubQuestions").and_then(|a| a.as_array()) {
                if !active.is_empty() {
                    affected_count += 1;
                    affected_groups.insert(section_group);
                }
            }
        }
    }

    let section_groups: Vec<i32> = affected_groups.into_iter().collect();

    Ok(CareerBranchUsageReport {
        has_conflict: affected_count > 0,
        affected_question_count: affected_count,
        affected_section_groups: section_groups,
    })
}
/// Reset target questions to exempted and update career branch
/// This follows the same pattern as update_question_score when question_type='exempted'
pub fn reset_and_update_career_branch(
    doc_id: String,
    new_main: Option<String>,
    new_sub: Option<String>,
) -> Result<CareerBranchResetReport, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    // Step 1: Find target L1 question IDs and their section_groups
    let target_questions: Vec<(String, i32)> = {
        let mut stmt = tx
            .prepare(
                "SELECT q.id, s.section_group
             FROM Questions q
             JOIN Sections s ON s.id = q.section_id
             WHERE q.document_id = ?1 AND q.parent_id IS NULL
             AND ((s.section_group = 200 AND q.sequence IN (2, 4))
               OR (s.section_group = 300 AND q.sequence IN (2, 3, 4, 5)))",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![doc_id], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
            })
            .map_err(|e| e.to_string())?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
    };

    if target_questions.is_empty() {
        // No target questions, just update branch
        tx.execute(
            "UPDATE Documents SET occupation_branch_main = ?1, occupation_branch_sub = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
            params![new_main, new_sub, doc_id]
        ).map_err(|e| e.to_string())?;

        tx.commit().map_err(|e| e.to_string())?;

        return Ok(CareerBranchResetReport {
            subq_links_deleted: 0,
            answer_keys_deleted: 0,
            user_answers_deleted: 0,
            questions_reset: 0,
        });
    }

    let target_l1_ids: Vec<String> = target_questions.iter().map(|(id, _)| id.clone()).collect();

    // Step 2: Collect ALL affected IDs (L1 + children recursively)
    let mut all_affected_ids = target_l1_ids.clone();

    // Get all children (recursive)
    for l1_id in &target_l1_ids {
        let mut child_stmt = tx
            .prepare(
                "WITH RECURSIVE descendants AS (
                SELECT id FROM Questions WHERE parent_id = ?1
                UNION ALL
                SELECT q.id FROM Questions q
                JOIN descendants d ON q.parent_id = d.id
             )
             SELECT id FROM descendants",
            )
            .map_err(|e| e.to_string())?;

        let children: Vec<String> = child_stmt
            .query_map(params![l1_id], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        all_affected_ids.extend(children);
    }

    // Step 3: Delete relational data for ALL affected IDs
    let placeholders = all_affected_ids
        .iter()
        .map(|_| "?")
        .collect::<Vec<_>>()
        .join(",");

    let subq_links_deleted = tx
        .execute(
            &format!(
                "DELETE FROM QuestionSubQuestionLinks WHERE question_id IN ({})",
                placeholders
            ),
            rusqlite::params_from_iter(all_affected_ids.iter()),
        )
        .map_err(|e| e.to_string())?;

    let answer_keys_deleted = tx
        .execute(
            &format!(
                "DELETE FROM QuestionAnswerKeys WHERE question_id IN ({})",
                placeholders
            ),
            rusqlite::params_from_iter(all_affected_ids.iter()),
        )
        .map_err(|e| e.to_string())?;

    let user_answers_deleted = tx
        .execute(
            &format!(
                "DELETE FROM UserAnswers WHERE question_id IN ({})",
                placeholders
            ),
            rusqlite::params_from_iter(all_affected_ids.iter()),
        )
        .map_err(|e| e.to_string())?;

    // Step 4: Delete children (same as update_question_score exempted path)
    let l1_placeholders = target_l1_ids
        .iter()
        .map(|_| "?")
        .collect::<Vec<_>>()
        .join(",");
    tx.execute(
        &format!(
            "DELETE FROM Questions WHERE parent_id IN ({})",
            l1_placeholders
        ),
        rusqlite::params_from_iter(target_l1_ids.iter()),
    )
    .map_err(|e| e.to_string())?;

    // Step 5: Reset L1 targets to exempted (same pattern as update_question_score)
    let questions_reset = target_questions.len();
    for (q_id, section_group) in &target_questions {
        let display_text = if *section_group == 200 {
            "(ไม่ต้องอธิบาย)"
        } else {
            "(ไม่ต้องปฏิบัติ)"
        };

        tx.execute(
            "UPDATE Questions SET                score = 0,                is_scored = 0,                question_type = 'exempted',                display_text = ?2,                group_score = 0,                is_group_header = 0,                description = NULL             WHERE id = ?1",
            params![q_id, display_text],
        )
        .map_err(|e| e.to_string())?;
    }

    // Step 5b: Clear metadata SubQ fields
    tx.execute(
        &format!(
            "UPDATE Questions SET metadata = '{{}}' WHERE id IN ({}) AND metadata IS NOT NULL",
            l1_placeholders
        ),
        rusqlite::params_from_iter(target_l1_ids.iter()),
    )
    .map_err(|e| e.to_string())?;

    // Step 6: Recalculate section total_score for affected sections
    let mut section_ids: Vec<i64> = Vec::new();
    for l1_id in &target_l1_ids {
        let section_id: Option<i64> = tx
            .query_row(
                "SELECT section_id FROM Questions WHERE id = ?1",
                params![l1_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?
            .flatten();

        if let Some(sid) = section_id {
            if !section_ids.contains(&sid) {
                section_ids.push(sid);
            }
        }
    }

    for sid in section_ids {
        let section_total: i32 = tx
            .query_row(
                "SELECT COALESCE(SUM(
                CASE                    WHEN question_type = 'exempted' THEN 0
                    WHEN is_group_header = 1 THEN group_score
                    WHEN is_scored = 1 AND parent_id IS NULL THEN score
                    ELSE 0
                END
            ), 0) FROM Questions WHERE section_id = ?1 AND parent_id IS NULL",
                params![sid],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        tx.execute(
            "UPDATE Sections SET total_score = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![section_total, sid],
        )
        .map_err(|e| e.to_string())?;
    }

    // Step 7: Update branch
    tx.execute(
        "UPDATE Documents SET occupation_branch_main = ?1, occupation_branch_sub = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
        params![new_main, new_sub, doc_id]
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(CareerBranchResetReport {
        subq_links_deleted,
        answer_keys_deleted,
        user_answers_deleted,
        questions_reset,
    })
}
/// Get statistics for the dashboard
pub fn get_document_stats() -> Result<DocumentStats, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let total_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM Documents", [], |row| row.get(0))
        .unwrap_or(0);

    let draft_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM Documents WHERE status = 'draft'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(DocumentStats {
        total_count,
        draft_count,
    })
}
