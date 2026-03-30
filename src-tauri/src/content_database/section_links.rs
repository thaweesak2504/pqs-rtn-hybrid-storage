use rusqlite::{params, Connection};

use super::*;

// ============================================================
// QuestionSectionLinks — Link 3xx.1.4/1.5 to 100/200 Sections
// ============================================================

/// Add a single section link to a question (3xx.1.4 or 3xx.1.5)
pub fn add_question_section_link(
    req: AddQuestionSectionLinkRequest,
) -> Result<QuestionSectionLink, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Check if already linked
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM QuestionSectionLinks WHERE question_id = ?1 AND section_id = ?2)",
        params![req.question_id, req.section_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    if exists {
        return Err("This section is already linked to this question".to_string());
    }

    // Get next display_order
    let max_order: i32 = conn.query_row(
        "SELECT COALESCE(MAX(display_order), 0) FROM QuestionSectionLinks WHERE question_id = ?1",
        params![req.question_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let score = req.score.unwrap_or(0);

    conn.execute(
        "INSERT INTO QuestionSectionLinks (question_id, section_id, score, display_order)
         VALUES (?1, ?2, ?3, ?4)",
        params![req.question_id, req.section_id, score, max_order + 1],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    // Return with joined section data
    get_question_section_link_by_id(&conn, id)
}

/// Batch add multiple section links at once (for "Select All")
pub fn batch_add_question_section_links(
    req: BatchAddQuestionSectionLinksRequest,
) -> Result<Vec<QuestionSectionLink>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let max_order: i32 = conn.query_row(
        "SELECT COALESCE(MAX(display_order), 0) FROM QuestionSectionLinks WHERE question_id = ?1",
        params![req.question_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let mut created_ids: Vec<i64> = Vec::new();
    for (i, section_id) in req.section_ids.iter().enumerate() {
        // Skip if already linked
        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM QuestionSectionLinks WHERE question_id = ?1 AND section_id = ?2)",
            params![req.question_id, section_id],
            |row| row.get(0),
        ).unwrap_or(true);

        if !exists {
            conn.execute(
                "INSERT INTO QuestionSectionLinks (question_id, section_id, score, display_order)
                 VALUES (?1, ?2, 0, ?3)",
                params![req.question_id, section_id, max_order + 1 + i as i32],
            )
            .map_err(|e| e.to_string())?;
            created_ids.push(conn.last_insert_rowid());
        }
    }

    // Return all links for this question (not just new ones)
    get_question_section_links_inner(&conn, &req.question_id)
}

/// Remove a single section link by its ID
pub fn remove_question_section_link(id: i64) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    conn.execute(
        "DELETE FROM QuestionSectionLinks WHERE id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Remove all section links for a question (for "Deselect All")
pub fn remove_all_question_section_links(question_id: String) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    conn.execute(
        "DELETE FROM QuestionSectionLinks WHERE question_id = ?1",
        params![question_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Get all section links for a question, joined with live Section data
pub fn get_question_section_links(question_id: String) -> Result<Vec<QuestionSectionLink>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    get_question_section_links_inner(&conn, &question_id)
}

pub fn get_question_section_links_inner(
    conn: &Connection,
    question_id: &str,
) -> Result<Vec<QuestionSectionLink>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT qsl.id, qsl.question_id, qsl.section_id, qsl.score, qsl.display_order,
                s.section_number, s.title_th, s.section_group
         FROM QuestionSectionLinks qsl
         JOIN Sections s ON qsl.section_id = s.id
         WHERE qsl.question_id = ?1
         ORDER BY s.section_number",
        )
        .map_err(|e| e.to_string())?;

    let links = stmt
        .query_map(params![question_id], |row| {
            Ok(QuestionSectionLink {
                id: row.get(0)?,
                question_id: row.get(1)?,
                section_id: row.get(2)?,
                score: row.get(3)?,
                display_order: row.get(4)?,
                section_number: row.get(5)?,
                section_title: row.get(6)?,
                section_group: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(links)
}

pub fn get_question_section_link_by_id(
    conn: &Connection,
    id: i64,
) -> Result<QuestionSectionLink, String> {
    conn.query_row(
        "SELECT qsl.id, qsl.question_id, qsl.section_id, qsl.score, qsl.display_order,
                s.section_number, s.title_th, s.section_group
         FROM QuestionSectionLinks qsl
         JOIN Sections s ON qsl.section_id = s.id
         WHERE qsl.id = ?1",
        params![id],
        |row| {
            Ok(QuestionSectionLink {
                id: row.get(0)?,
                question_id: row.get(1)?,
                section_id: row.get(2)?,
                score: row.get(3)?,
                display_order: row.get(4)?,
                section_number: row.get(5)?,
                section_title: row.get(6)?,
                section_group: row.get(7)?,
            })
        },
    )
    .map_err(|e| format!("Failed to get section link: {}", e))
}

/// Update score for a single section link
pub fn update_section_link_score(args: UpdateSectionLinkScoreArgs) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    conn.execute(
        "UPDATE QuestionSectionLinks SET score = ?1 WHERE id = ?2",
        params![args.score, args.id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Calculate the total score of all section links for a question (3xx.1.4 or 3xx.1.5),
/// then update the question's group_score, and propagate up to the parent (3xx.1) and section total.
pub fn recalculate_section_link_scores(question_id: String) -> Result<i32, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // 1. Sum all link scores for this question
    let link_total: i32 = conn
        .query_row(
            "SELECT COALESCE(SUM(score), 0) FROM QuestionSectionLinks WHERE question_id = ?1",
            params![question_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // 2. Update this question's group_score (3xx.1.4 or 3xx.1.5)
    conn.execute(
        "UPDATE Questions SET group_score = ?1 WHERE id = ?2",
        params![link_total, question_id],
    )
    .map_err(|e| e.to_string())?;

    // 3. Propagate up: get parent (3xx.1) and recalculate its group_score
    let parent_id: Option<String> = conn
        .query_row(
            "SELECT parent_id FROM Questions WHERE id = ?1",
            params![question_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if let Some(pid) = parent_id {
        // Sum group_score of scored children (3xx.1.4 + 3xx.1.5) + direct scores
        let parent_total: i32 = conn
            .query_row(
                "SELECT COALESCE(SUM(
                CASE                    WHEN question_type = 'exempted' THEN 0
                    WHEN is_group_header = 1 THEN group_score
                    WHEN is_scored = 1 THEN score
                    ELSE 0
                END
            ), 0) FROM Questions WHERE parent_id = ?1",
                params![pid],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        conn.execute(
            "UPDATE Questions SET group_score = ?1 WHERE id = ?2",
            params![parent_total, pid],
        )
        .map_err(|e| e.to_string())?;

        // 4. Propagate to section total_score
        let section_id: Option<i64> = conn
            .query_row(
                "SELECT section_id FROM Questions WHERE id = ?1",
                params![pid],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        if let Some(sid) = section_id {
            let section_total: i32 = conn
                .query_row(
                    "SELECT COALESCE(SUM(
                    CASE                        WHEN question_type = 'exempted' THEN 0
                        WHEN is_group_header = 1 THEN group_score
                        WHEN is_scored = 1 AND is_group_header = 0 AND parent_id IS NULL THEN score
                        ELSE 0
                    END
                ), 0) FROM Questions WHERE section_id = ?1 AND parent_id IS NULL",
                    params![sid],
                    |row| row.get(0),
                )
                .map_err(|e| e.to_string())?;

            conn.execute(
                "UPDATE Sections SET total_score = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                params![section_total, sid],
            ).map_err(|e| e.to_string())?;
        }
    }

    Ok(link_total)
}

// ============================================================
// Section-Ref L3 Children — 3xx.1.4/1.5 children as real Questions
// Each selected section becomes an L3 Question (question_type='section_ref')
// so the normal scoring chain L3→L2→L1→Section works naturally.
// ============================================================

/// Get all section-ref L3 children for a parent question (3xx.1.4 or 3xx.1.5)
pub fn get_section_ref_children(parent_id: String) -> Result<Vec<SectionRefChild>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    get_section_ref_children_inner(&conn, &parent_id)
}

/// Get section IDs that already reference the given section_id via section_ref questions.
/// Used by the frontend to disable those sections in the selector (would create circular dependency).
pub fn get_back_referencing_section_ids(section_id: i64) -> Result<Vec<i64>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT q.section_id FROM Questions q
         WHERE q.question_type = 'section_ref'
           AND q.metadata LIKE ?1",
        )
        .map_err(|e| e.to_string())?;

    let ids: Vec<i64> = stmt
        .query_map(
            params![format!("%\"refSectionId\":{}%", section_id)],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ids)
}

pub fn get_section_ref_children_inner(
    conn: &Connection,
    parent_id: &str,
) -> Result<Vec<SectionRefChild>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, parent_id, sequence, content, score, metadata
         FROM Questions
         WHERE parent_id = ?1 AND question_type = 'section_ref'
         ORDER BY sequence",
        )
        .map_err(|e| e.to_string())?;

    let children = stmt
        .query_map(params![parent_id], |row| {
            let id: String = row.get(0)?;
            let parent_id: String = row.get(1)?;
            let sequence: i32 = row.get(2)?;
            let content: String = row.get(3)?;
            let score: i32 = row.get::<_, Option<i32>>(4)?.unwrap_or(0);
            let metadata: Option<String> = row.get(5)?;

            let (ref_section_id, ref_section_number) = if let Some(meta_str) = metadata {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&meta_str) {
                    let sid = v.get("refSectionId").and_then(|r| r.as_i64()).unwrap_or(0);
                    let snum = v
                        .get("refSectionNumber")
                        .and_then(|r| r.as_i64())
                        .unwrap_or(0) as i32;
                    (sid, snum)
                } else {
                    (0, 0)
                }
            } else {
                (0, 0)
            };

            Ok(SectionRefChild {
                id,
                parent_id,
                sequence,
                content,
                score,
                ref_section_id,
                ref_section_number,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(children)
}

/// Add a single section as an L3 child question under 3xx.1.4 or 3xx.1.5
pub fn add_section_ref_child(args: AddSectionRefChildArgs) -> Result<SectionRefChild, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Prevent self-reference: a section cannot reference itself
    if args.linked_section_id == args.section_id {
        return Err("Cannot add a section reference to itself".to_string());
    }

    // Prevent bidirectional reference: if target section already references back to this section,
    // creating this link would cause a circular dependency in progress computation.
    let back_ref_exists: bool = conn
        .query_row(
            "SELECT EXISTS(
            SELECT 1 FROM Questions
            WHERE section_id = ?1 AND question_type = 'section_ref'
              AND metadata LIKE ?2
        )",
            params![
                args.linked_section_id,
                format!("%\"refSectionId\":{}%", args.section_id)
            ],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if back_ref_exists {
        return Err(format!("Cannot add: section {} already references this section (would create circular dependency)", args.linked_section_number));
    }

    // Check if already exists
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM Questions WHERE parent_id = ?1 AND question_type = 'section_ref' AND metadata LIKE ?2)",
        params![args.parent_id, format!("%\"refSectionId\":{}%", args.linked_section_id)],
        |row| row.get(0),
    ).unwrap_or(false);

    if exists {
        return Err("This section is already added as a child question".to_string());
    }

    let max_seq: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sequence), 0) FROM Questions WHERE parent_id = ?1",
            params![args.parent_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let id = generate_uuid();
    let score = args.score.unwrap_or(0);
    let sequence = max_seq + 1;
    let metadata = serde_json::json!({
        "refSectionId": args.linked_section_id,
        "refSectionNumber": args.linked_section_number
    })
    .to_string();

    conn.execute(
        "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, answer_type, metadata, score, question_type, group_score, is_group_header, is_scored)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 'text', ?7, ?8, 'section_ref', 0, 0, 1)",
        params![id, args.document_id, args.section_id, args.parent_id, sequence, args.linked_section_title, metadata, score],
    ).map_err(|e| e.to_string())?;

    // Mark parent as group_header
    conn.execute(
        "UPDATE Questions SET is_group_header = 1 WHERE id = ?1",
        params![args.parent_id],
    )
    .map_err(|e| e.to_string())?;

    // Propagate scores up the chain
    recalculate_group_score_chain(&conn, &args.parent_id)?;

    Ok(SectionRefChild {
        id,
        parent_id: args.parent_id,
        sequence,
        content: args.linked_section_title,
        score,
        ref_section_id: args.linked_section_id,
        ref_section_number: args.linked_section_number,
    })
}

/// Batch add multiple sections as L3 children (for "Select All")
pub fn batch_add_section_ref_children(
    args: BatchAddSectionRefChildrenArgs,
) -> Result<Vec<SectionRefChild>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let mut max_seq: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sequence), 0) FROM Questions WHERE parent_id = ?1",
            params![args.parent_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    for item in &args.sections {
        // Skip self-references
        if item.linked_section_id == args.section_id {
            continue;
        }

        // Skip bidirectional references (would create circular dependency)
        let back_ref: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM Questions WHERE section_id = ?1 AND question_type = 'section_ref' AND metadata LIKE ?2)",
            params![item.linked_section_id, format!("%\"refSectionId\":{}%", args.section_id)],
            |row| row.get(0),
        ).unwrap_or(false);
        if back_ref {
            continue;
        }

        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM Questions WHERE parent_id = ?1 AND question_type = 'section_ref' AND metadata LIKE ?2)",
            params![args.parent_id, format!("%\"refSectionId\":{}%", item.linked_section_id)],
            |row| row.get(0),
        ).unwrap_or(true);

        if !exists {
            max_seq += 1;
            let id = generate_uuid();
            let metadata = serde_json::json!({
                "refSectionId": item.linked_section_id,
                "refSectionNumber": item.linked_section_number
            })
            .to_string();

            conn.execute(
                "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, answer_type, metadata, score, question_type, group_score, is_group_header, is_scored)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 'text', ?7, 0, 'section_ref', 0, 0, 1)",
                params![id, args.document_id, args.section_id, args.parent_id, max_seq, item.linked_section_title, metadata],
            ).map_err(|e| e.to_string())?;
        }
    }

    // Mark parent as group_header
    conn.execute(
        "UPDATE Questions SET is_group_header = 1 WHERE id = ?1",
        params![args.parent_id],
    )
    .map_err(|e| e.to_string())?;

    recalculate_group_score_chain(&conn, &args.parent_id)?;

    get_section_ref_children_inner(&conn, &args.parent_id)
}

/// Remove a single section-ref L3 child question and recalculate scores
pub fn remove_section_ref_child(question_id: String) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let parent_id: Option<String> = conn
        .query_row(
            "SELECT parent_id FROM Questions WHERE id = ?1",
            params![question_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    conn.execute(
        "DELETE FROM Questions WHERE id = ?1 AND question_type = 'section_ref'",
        params![question_id],
    )
    .map_err(|e| e.to_string())?;

    if let Some(pid) = parent_id {
        recalculate_group_score_chain(&conn, &pid)?;
    }

    Ok(())
}

/// Remove all section-ref L3 children for a parent (for "Deselect All")
pub fn remove_all_section_ref_children(parent_id: String) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    conn.execute(
        "DELETE FROM Questions WHERE parent_id = ?1 AND question_type = 'section_ref'",
        params![parent_id],
    )
    .map_err(|e| e.to_string())?;

    recalculate_group_score_chain(&conn, &parent_id)?;

    Ok(())
}

/// Update score for a section-ref L3 child and propagate up
pub fn update_section_ref_score(question_id: String, score: i32) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    conn.execute(
        "UPDATE Questions SET score = ?1 WHERE id = ?2 AND question_type = 'section_ref'",
        params![score, question_id],
    )
    .map_err(|e| e.to_string())?;

    let parent_id: Option<String> = conn
        .query_row(
            "SELECT parent_id FROM Questions WHERE id = ?1",
            params![question_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if let Some(pid) = parent_id {
        recalculate_group_score_chain(&conn, &pid)?;
    }

    Ok(())
}

// ============================================================
// Required Count Children (3xx.2-3xx.6 L3 "ครั้งที่ X")
// ============================================================

pub fn thai_number(n: i32) -> String {
    match n {
        0 => "๐".to_string(),
        1 => "๑".to_string(),
        2 => "๒".to_string(),
        3 => "๓".to_string(),
        4 => "๔".to_string(),
        5 => "๕".to_string(),
        6 => "๖".to_string(),
        7 => "๗".to_string(),
        8 => "๘".to_string(),
        9 => "๙".to_string(),
        _ => n.to_string(),
    }
}
