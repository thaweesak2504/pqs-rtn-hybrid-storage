use crate::logger;
use rusqlite::{params, Connection};
use std::time::SystemTime;

use super::*;

// ============================================================
// Section Management
// ============================================================

pub const FIXED_SECTION_101_TITLE: &str = "ข้อควรระมัดระวังอันตรายพื้นฐาน Safety Fundamentals";

/// Seed template questions for a new document
pub fn seed_document_template(
    conn: &Connection,
    doc_id: &str,
    unit_name: &str,
) -> Result<(), String> {
    // 100 Introduction
    let q100_id = generate_uuid();
    conn.execute(
        "INSERT INTO Questions (id, document_id, section_id, sequence, content, is_header, answer_type) VALUES (?1, ?2, 100, ?3, ?4, ?5, 'none')",
        params![q100_id, doc_id, 100, "100 Introduction", true]
    ).map_err(|e| format!("Failed to seed 100: {}", e))?;

    // 200 System Description (Using unit name as placeholder context)
    let q200_id = format!(
        "{:x}2",
        SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    );
    conn.execute(
        "INSERT INTO Questions (id, document_id, section_id, sequence, content, is_header, answer_type) VALUES (?1, ?2, 200, ?3, ?4, ?5, 'none')",
        params![q200_id, doc_id, 200, format!("200 System Description ({})", unit_name), true]
    ).map_err(|e| format!("Failed to seed 200: {}", e))?;

    // 300 Operations
    let q300_id = format!(
        "{:x}3",
        SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    );
    conn.execute(
        "INSERT INTO Questions (id, document_id, section_id, sequence, content, is_header, answer_type) VALUES (?1, ?2, 300, ?3, ?4, ?5, 'none')",
        params![q300_id, doc_id, 300, "300 Operations", true]
    ).map_err(|e| format!("Failed to seed 300: {}", e))?;

    Ok(())
}

/// Create a new section
pub fn create_section(request: CreateSectionRequest) -> Result<Section, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    create_section_with_conn(&conn, request)
}

pub fn create_section_with_conn(
    conn: &Connection,
    request: CreateSectionRequest,
) -> Result<Section, String> {
    // Validation: Check if number already exists
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM Sections WHERE document_id = ?1 AND section_number = ?2)",
            params![request.document_id, request.section_number],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if exists {
        return Err(format!(
            "Section {} already exists for this document",
            request.section_number
        ));
    }

    // Validate section number range
    let valid_range = match request.section_group {
        100 => 101..=199,
        200 => 201..=299,
        300 => 301..=399,
        _ => return Err("Invalid section group. Must be 100, 200, or 300".to_string()),
    };

    if !valid_range.contains(&request.section_number) {
        return Err(format!(
            "Section number must be in range {:?} for section group {}",
            valid_range, request.section_group
        ));
    }

    // Section 101 (group 100) must always use the fixed header title.
    if request.section_group == 100
        && request.section_number == 101
        && request.title_th.trim() != FIXED_SECTION_101_TITLE
    {
        return Err(format!(
            "Section 101 title must be exactly: {}",
            FIXED_SECTION_101_TITLE
        ));
    }

    // Get next display_order
    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(display_order), 0) FROM Sections WHERE document_id = ?1 AND section_group = ?2",
            params![request.document_id, request.section_group],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Insert
    conn.execute(
        "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, display_order, is_system_defined)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)",
        params![
            request.document_id,
            request.section_group,
            request.section_number,
            request.title_th,
            request.menu_label,
            max_order + 1,
        ],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    // Auto-seed template for Section 200 series (201-299)
    if request.section_group == 200
        && request.section_number >= 200
        && request.section_number <= 299
    {
        seed_section_200_template(conn, &request.document_id, id, request.section_number)?;
    // Auto-seed template for Section 300 series (301-399)
    } else if request.section_group == 300
        && request.section_number >= 300
        && request.section_number <= 399
    {
        seed_section_300_template(conn, &request.document_id, id, request.section_number)?;
    }

    // Return created section
    get_section_by_id(conn, id)
}

/// Seed Section 300 Template (3xx.1 - 3xx.7)
/// Scoring rules:
///   3xx.1.1 - 3xx.1.3 → is_scored = false (prerequisites, no score)
///   3xx.1.4 - 3xx.1.5 → is_scored = true  (can have score)
///   3xx.2 - 3xx.6     → is_scored = true, is_group_header = true (score = sum of children)
///   3xx.7.1 - 3xx.7.2 → is_scored = false (knowledge test, separate evaluation)
pub fn seed_section_300_template(
    conn: &Connection,
    doc_id: &str,
    section_id: i64,
    _section_num: i32,
) -> Result<(), String> {
    // Helper closure with scoring fields + display_text
    let insert_q = |parent: Option<&str>,
                    seq: i32,
                    content: String,
                    desc: Option<String>,
                    is_scored: bool,
                    is_group_header: bool,
                    question_type: &str,
                    display_text: Option<&str>|
     -> Result<String, String> {
        let q_id = generate_uuid();
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, description, is_header, answer_type, score, question_type, display_text, group_score, is_group_header, is_scored)             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, 'none', 0, ?8, ?9, 0, ?10, ?11)",
            params![q_id, doc_id, section_id, parent, seq, content, desc, question_type, display_text, is_group_header, is_scored]
        ).map_err(|e| e.to_string())?;
        Ok(q_id)
    };

    // 3xx.1 - คุณสมบัติก่อนการทดสอบ (group header, may have score from 1.4-1.5)
    let q1_desc = "เพื่อให้การทดสอบตาม มาตรฐานการทดสอบกำลังพลเกิดประโยชน์สูงสุด และสำเร็จตามวัตถุประสงค์ ผู้เข้ารับการทดสอบ ต้องมีคุณสมบัติ ดังต่อไปนี้".to_string();
    let q1_id = insert_q(
        None,
        1,
        "คุณสมบัติก่อนการทดสอบ".to_string(),
        Some(q1_desc),
        false,
        true,
        "normal",
        None,
    )?;

    // 3xx.1.1 - 3xx.1.3: NOT scored, default EXEMPTED (prerequisites — most positions skip these)
    let exempted_text = "(ไม่ต้องปฏิบัติ)";
    insert_q(
        Some(&q1_id),
        1,
        "ผ่านการอบรม".to_string(),
        None,
        false,
        false,
        "exempted",
        Some(exempted_text),
    )?;
    insert_q(
        Some(&q1_id),
        2,
        "ผ่านมาตรฐานการทดสอบกําลังพล".to_string(),
        None,
        false,
        false,
        "exempted",
        Some(exempted_text),
    )?;
    insert_q(
        Some(&q1_id),
        3,
        "ผ่านการปฏิบัติหน้าที่".to_string(),
        None,
        false,
        false,
        "exempted",
        Some(exempted_text),
    )?;
    // 3xx.1.4 - 3xx.1.5: SCORED, default EXEMPTED (section selectors — configured per position)
    insert_q(
        Some(&q1_id),
        4,
        "ผ่านการทดสอบความรู้พื้นฐาน".to_string(),
        None,
        true,
        false,
        "exempted",
        Some(exempted_text),
    )?;
    insert_q(
        Some(&q1_id),
        5,
        "ผ่านการทดสอบระบบ".to_string(),
        None,
        true,
        false,
        "exempted",
        Some(exempted_text),
    )?;

    // 3xx.2 - 3xx.5: GROUP headers, default EXEMPTED (configured per position)
    insert_q(
        None,
        2,
        "การทดสอบปฏิบัติงานปกติ".to_string(),
        None,
        false,
        true,
        "exempted",
        Some(exempted_text),
    )?;
    insert_q(
        None,
        3,
        "การทดสอบการปฏิบัติงานกรณีพิเศษ".to_string(),
        None,
        false,
        true,
        "exempted",
        Some(exempted_text),
    )?;
    insert_q(
        None,
        4,
        "การทดสอบการปฏิบัติงานกรณีเหตุขัดข้อง".to_string(),
        None,
        false,
        true,
        "exempted",
        Some(exempted_text),
    )?;
    insert_q(
        None,
        5,
        "การทดสอบการปฏิบัติงานกรณีเหตุฉุกเฉิน".to_string(),
        None,
        false,
        true,
        "exempted",
        Some(exempted_text),
    )?;

    // 3xx.6: GROUP header, default EXEMPTED (configured per position)
    insert_q(
        None,
        6,
        "การทดสอบการปฏิบัติงานประจําตําแหน่ง".to_string(),
        None,
        false,
        true,
        "exempted",
        Some(exempted_text),
    )?;

    // 3xx.7: สอบความรู้ (group header, children NOT scored)
    let q7_id = insert_q(
        None,
        7,
        "สอบความรู้".to_string(),
        None,
        false,
        true,
        "normal",
        None,
    )?;
    insert_q(
        Some(&q7_id),
        1,
        "สอบข้อเขียน".to_string(),
        Some("ขึ้นอยู่กับผู้บังคับหน่วยกำหนด".to_string()),
        false,
        false,
        "normal",
        None,
    )?;
    insert_q(
        Some(&q7_id),
        2,
        "สอบปากเปล่า".to_string(),
        Some("ขึ้นอยู่กับผู้บังคับหน่วยกำหนด".to_string()),
        false,
        false,
        "normal",
        None,
    )?;

    Ok(())
}

/// Seed Section 200 Template (2xx.1 - 2xx.6)
pub fn seed_section_200_template(
    conn: &Connection,
    doc_id: &str,
    section_id: i64,
    _section_num: i32,
) -> Result<(), String> {
    // Helper closure: all 2xx L1 questions start exempted and are activated per position later.
    let insert_q = |parent: Option<&str>,
                    seq: i32,
                    content: String,
                    question_type: &str,
                    display_text: Option<&str>|
     -> Result<String, String> {
        let q_id = generate_uuid();
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, answer_type, question_type, display_text)             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, 'text', ?7, ?8)",
            params![q_id, doc_id, section_id, parent, seq, content, question_type, display_text]
        ).map_err(|e| e.to_string())?;
        Ok(q_id)
    };

    let exempted_text = "(ไม่ต้องอธิบาย)";

    insert_q(None, 1, "หน้าที่".to_string(), "exempted", Some(exempted_text))?;
    // 2xx.2: ส่วนประกอบ — default exempted, display "(ไม่ต้องอธิบาย)", no scoring, no group_header
    insert_q(
        None,
        2,
        "ส่วนประกอบและชิ้นส่วนในส่วนประกอบของระบบ".to_string(),
        "exempted",
        Some(exempted_text),
    )?;
    insert_q(
        None,
        3,
        "หลักการทำงาน".to_string(),
        "exempted",
        Some(exempted_text),
    )?;
    // 2xx.4: ค่าทำงาน — default exempted, display "(ไม่ต้องอธิบาย)", no scoring, no group_header
    insert_q(
        None,
        4,
        "ค่าทำงานปกติ ค่าสูงสุด ต่ำสุด ของการทำงาน".to_string(),
        "exempted",
        Some(exempted_text),
    )?;
    insert_q(
        None,
        5,
        "การเชื่อมต่อระบบ".to_string(),
        "exempted",
        Some(exempted_text),
    )?;
    insert_q(
        None,
        6,
        "ข้อระมัดระวังอันตราย".to_string(),
        "exempted",
        Some(exempted_text),
    )?;

    Ok(())
}

/// Update a section (Title, Menu Label, Duration, Score)
pub fn update_section(args: UpdateSectionArgs) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    update_section_with_conn(&conn, args)
}

pub fn update_section_with_conn(conn: &Connection, args: UpdateSectionArgs) -> Result<(), String> {
    let (section_group, section_number): (i32, i32) = conn
        .query_row(
            "SELECT section_group, section_number FROM Sections WHERE id = ?1",
            params![args.id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    if section_group == 100
        && section_number == 101
        && args.title_th.trim() != FIXED_SECTION_101_TITLE
    {
        return Err(format!(
            "Section 101 title is fixed and cannot be changed. Required title: {}",
            FIXED_SECTION_101_TITLE
        ));
    }

    conn.execute(
        "UPDATE Sections SET title_th = ?1, menu_label = ?2, duration_value = ?3, duration_unit = ?4, total_score = ?5, updated_at = CURRENT_TIMESTAMP WHERE id = ?6",
        params![args.title_th, args.menu_label, args.duration_value, args.duration_unit, args.total_score, args.id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Get sections by document ID
pub fn get_sections_by_document(document_id: String) -> Result<Vec<Section>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, document_id, section_group, section_number, title_th, menu_label,                    display_order, is_system_defined, duration_value, duration_unit, total_score,
                    created_at, updated_at
             FROM Sections
             WHERE document_id = ?1
             ORDER BY section_group, section_number",
        )
        .map_err(|e| e.to_string())?;

    let sections = stmt
        .query_map(params![document_id], |row| {
            Ok(Section {
                id: row.get(0)?,
                document_id: row.get(1)?,
                section_group: row.get(2)?,
                section_number: row.get(3)?,
                title_th: row.get(4)?,
                menu_label: row.get(5)?,
                display_order: row.get(6)?,
                is_system_defined: row.get(7)?,
                duration_value: row.get(8)?,
                duration_unit: row.get(9)?,
                total_score: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(sections)
}

/// Clean up orphaned section_ref questions that point to sections which no longer exist.
/// This handles legacy data created before the delete_section cleanup was added.
/// Returns the number of orphaned refs removed.
pub fn cleanup_orphaned_section_refs() -> Result<usize, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    cleanup_orphaned_section_refs_with_conn(&conn)
}

/// Testable variant that accepts a connection parameter.
pub fn cleanup_orphaned_section_refs_with_conn(conn: &Connection) -> Result<usize, String> {
    // --- Pass 1: Remove section_ref questions pointing to deleted sections ---
    let mut stmt = conn
        .prepare(
            "SELECT q.id, q.parent_id, q.metadata
         FROM Questions q
         WHERE q.question_type = 'section_ref'
           AND q.metadata IS NOT NULL",
        )
        .map_err(|e| e.to_string())?;

    let rows: Vec<(String, Option<String>, String)> = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut removed = 0usize;
    let mut affected_parents: Vec<String> = Vec::new();

    for (question_id, parent_id, metadata) in &rows {
        let ref_section_id: Option<i64> = serde_json::from_str::<serde_json::Value>(metadata)
            .ok()
            .and_then(|v| v.get("refSectionId")?.as_i64());

        if let Some(ref_sid) = ref_section_id {
            let exists: bool = conn
                .query_row(
                    "SELECT EXISTS(SELECT 1 FROM Sections WHERE id = ?1)",
                    params![ref_sid],
                    |row| row.get(0),
                )
                .unwrap_or(false);

            if !exists {
                conn.execute("DELETE FROM Questions WHERE id = ?1", params![question_id])
                    .map_err(|e| e.to_string())?;

                if let Some(pid) = parent_id {
                    if !affected_parents.contains(pid) {
                        affected_parents.push(pid.clone());
                    }
                }

                logger::debug(format!(
                    "cleanup_orphaned_section_refs removed orphaned section_ref question {} (was pointing to deleted section {})",
                    question_id, ref_sid
                ));
                removed += 1;
            }
        }
    }

    // Auto-exempt parent questions that have zero remaining children of ANY type
    for pid in &affected_parents {
        let remaining_children: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM Questions WHERE parent_id = ?1",
                params![pid],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if remaining_children == 0 {
            conn.execute(
                "UPDATE Questions SET question_type = 'exempted', score = 0, is_scored = 0, is_group_header = 0 WHERE id = ?1",
                params![pid],
            ).map_err(|e| e.to_string())?;
            logger::debug(format!(
                "cleanup_orphaned_section_refs auto-exempted parent question {} (no children remaining)",
                pid
            ));
        }

        if let Err(e) = recalculate_group_score_chain(conn, pid) {
            logger::warn(format!(
                "cleanup_orphaned_section_refs updated data for parent {} but failed to recalculate score chain: {}",
                pid, e
            ));
        }
    }

    // --- Pass 2: Find stranded section selectors in 300-series ---
    // L1 group_header questions (seq 2-6) that have no children at all.
    {
        let mut stale_stmt = conn
            .prepare(
                "SELECT q.id, q.parent_id FROM Questions q
             JOIN Sections s ON q.section_id = s.id
             WHERE s.section_group = 300
               AND q.question_type NOT IN ('exempted', 'section_ref')
               AND q.is_group_header = 1
               AND q.parent_id IS NULL
               AND q.sequence BETWEEN 2 AND 6
               AND NOT EXISTS (SELECT 1 FROM Questions c WHERE c.parent_id = q.id)",
            )
            .map_err(|e| e.to_string())?;

        let stranded: Vec<(String, Option<String>)> = stale_stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        for (qid, parent_id) in &stranded {
            conn.execute(
                "UPDATE Questions SET question_type = 'exempted', score = 0, is_scored = 0, is_group_header = 0 WHERE id = ?1",
                params![qid],
            ).map_err(|e| e.to_string())?;

            if let Some(pid) = parent_id {
                if let Err(e) = recalculate_group_score_chain(conn, pid) {
                    logger::warn(format!(
                        "cleanup_orphaned_section_refs auto-exempted stranded selector {} but failed to recalculate parent {}: {}",
                        qid, pid, e
                    ));
                }
            }
            logger::debug(format!(
                "cleanup_orphaned_section_refs auto-exempted stranded selector {} (300-series group_header with no children)",
                qid
            ));
            removed += 1;
        }
    }

    if removed > 0 {
        logger::info(format!(
            "cleanup_orphaned_section_refs cleaned up {} orphaned/stranded question(s) total",
            removed
        ));
    }

    Ok(removed)
}

/// Delete a section and all its questions (cascade)
pub fn delete_section(id: i64) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    delete_section_with_conn(&conn, id)
}

pub fn delete_section_with_conn(conn: &Connection, id: i64) -> Result<(), String> {
    // Check if system-defined. Exception: Section 101 is allowed to be deleted.
    let (is_system, section_number): (bool, i32) = conn
        .query_row(
            "SELECT is_system_defined, section_number FROM Sections WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    if is_system && section_number != 101 {
        return Err("Cannot delete system-defined section".to_string());
    }

    // --- Clean up orphaned section_ref children in OTHER sections that link to this section ---
    // Find all section_ref questions whose metadata contains refSectionId pointing to this section
    {
        let mut ref_stmt = conn
            .prepare(
                "SELECT id, parent_id FROM Questions
             WHERE question_type = 'section_ref'
               AND section_id != ?1
               AND metadata LIKE ?2",
            )
            .map_err(|e| e.to_string())?;

        let pattern = format!("%\"refSectionId\":{}%", id);
        let orphaned_refs: Vec<(String, Option<String>)> = ref_stmt
            .query_map(params![id, pattern], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        let mut affected_parents: Vec<String> = Vec::new();

        for (ref_id, parent_id) in &orphaned_refs {
            // Delete the orphaned section_ref question
            conn.execute("DELETE FROM Questions WHERE id = ?1", params![ref_id])
                .map_err(|e| e.to_string())?;

            if let Some(pid) = parent_id {
                if !affected_parents.contains(pid) {
                    affected_parents.push(pid.clone());
                }
            }
        }

        // Auto-exempt parent questions that have zero remaining section_ref children
        for pid in &affected_parents {
            let remaining_children: i32 = conn.query_row(
                "SELECT COUNT(*) FROM Questions WHERE parent_id = ?1 AND question_type = 'section_ref'",
                params![pid],
                |row| row.get(0),
            ).unwrap_or(0);

            if remaining_children == 0 {
                conn.execute(
                    "UPDATE Questions SET question_type = 'exempted', score = 0, is_scored = 0, is_group_header = 0 WHERE id = ?1",
                    params![pid],
                ).map_err(|e| e.to_string())?;
            }

            if let Err(e) = recalculate_group_score_chain(conn, pid) {
                logger::warn(format!(
                    "delete_section removed orphaned section_ref children but failed to recalculate parent {}: {}",
                    pid, e
                ));
            }
        }
    }

    // --- Clean up UserProgress for this section ---
    if let Err(e) = conn.execute(
        "DELETE FROM UserProgress WHERE section_id = ?1",
        params![id],
    ) {
        logger::warn(format!(
            "delete_section removed section {} but failed to clean UserProgress rows: {}",
            id, e
        ));
    }

    // Delete QuestionSectionLinks for all questions in this section (may not cascade automatically)
    conn.execute(
        "DELETE FROM QuestionSectionLinks WHERE question_id IN (SELECT id FROM Questions WHERE section_id = ?1)",
        params![id]
    ).map_err(|e| format!("Failed to delete section question links: {}", e))?;

    // Delete all questions belonging to this section
    // (QuestionChoices, QuestionReferences, UserAnswers cascade from Questions automatically)
    conn.execute("DELETE FROM Questions WHERE section_id = ?1", params![id])
        .map_err(|e| format!("Failed to delete section questions: {}", e))?;

    conn.execute("DELETE FROM Sections WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Update section (for display_order reordering, etc.)
pub fn update_section_order(id: i64, new_order: i32) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    conn.execute(
        "UPDATE Sections SET display_order = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![new_order, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Helper function to get section by ID
pub fn get_section_by_id(conn: &Connection, id: i64) -> Result<Section, String> {
    conn.query_row(
        "SELECT id, document_id, section_group, section_number, title_th, menu_label,                display_order, is_system_defined, duration_value, duration_unit, total_score,
                created_at, updated_at
         FROM Sections WHERE id = ?1",
        params![id],
        |row| {
            Ok(Section {
                id: row.get(0)?,
                document_id: row.get(1)?,
                section_group: row.get(2)?,
                section_number: row.get(3)?,
                title_th: row.get(4)?,
                menu_label: row.get(5)?,
                display_order: row.get(6)?,
                is_system_defined: row.get(7)?,
                duration_value: row.get(8)?,
                duration_unit: row.get(9)?,
                total_score: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

/// Helper to get Thai letter from display order (1=ก, 2=ข, etc.)
pub fn get_thai_letter(order: i32) -> String {
    let letters = ["ก", "ข", "ค", "ง", "จ", "ฉ", "ช", "ซ", "ฌ", "ญ"];
    letters
        .get((order - 1) as usize)
        .unwrap_or(&"?")
        .to_string()
}
