use rusqlite::{params, Connection};
use std::collections::HashMap;

use super::*;

// ============================================================
// Questions CRUD Operations
// ============================================================

/// Get all questions for a document (with answer keys injected into metadata)
pub fn get_document_questions(doc_id: String) -> Result<Vec<Question>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT id, document_id, section_id, parent_id, sequence, content, is_header, description, answer_type, metadata,
                score, question_type, group_score, display_text, is_group_header, is_scored
         FROM Questions WHERE document_id = ?1 ORDER BY sequence"
    ).map_err(|e| format!("Failed to prepare query: {}", e))?;

    let mut answer_keys_stmt = conn
        .prepare(
            "SELECT question_id, sub_question_code, answer_key_text, is_required, order_index
         FROM QuestionAnswerKeys
         WHERE question_id IN (SELECT id FROM Questions WHERE document_id = ?1)
         ORDER BY question_id, order_index",
        )
        .map_err(|e| format!("Failed to prepare answer keys query: {}", e))?;

    // Group answer keys by question_id
    let mut answer_keys_map: HashMap<String, Vec<(String, String, bool)>> = HashMap::new();
    let ak_rows = answer_keys_stmt
        .query_map(params![doc_id], |row| {
            Ok((
                row.get::<_, String>(0)?, // question_id
                row.get::<_, String>(1)?, // sub_question_code
                row.get::<_, String>(2)?, // answer_key_text
                row.get::<_, bool>(3)?,   // is_required
            ))
        })
        .map_err(|e| format!("Failed to query answer keys: {}", e))?;

    for (qid, code, text, required) in ak_rows.flatten() {
        answer_keys_map
            .entry(qid)
            .or_default()
            .push((code, text, required));
    }

    let question_iter = stmt
        .query_map(params![doc_id], |row| {
            let qid: String = row.get(0)?;
            let mut metadata: Option<String> = row.get(9)?;

            // Inject answer keys into metadata JSON
            if let Some(keys) = answer_keys_map.get(&qid) {
                let mut meta_val = if let Some(meta_str) = &metadata {
                    serde_json::from_str::<serde_json::Value>(meta_str)
                        .unwrap_or(serde_json::json!({}))
                } else {
                    serde_json::json!({})
                };

                if let Some(meta_obj) = meta_val.as_object_mut() {
                    // If there's only one key and it has no sub_question_code, set "answerKey"
                    if keys.len() == 1 && keys[0].0.is_empty() {
                        meta_obj.insert(
                            "answerKey".to_string(),
                            serde_json::Value::String(keys[0].1.clone()),
                        );
                        meta_obj.remove("answerKeys");
                    } else {
                        // Otherwise, set "answerKeys" object mapping code -> text string
                        let mut keys_obj = serde_json::Map::new();
                        for (code, text, _req) in keys {
                            keys_obj.insert(code.clone(), serde_json::Value::String(text.clone()));
                        }
                        meta_obj.insert(
                            "answerKeys".to_string(),
                            serde_json::Value::Object(keys_obj),
                        );
                        meta_obj.remove("answerKey");
                    }
                    metadata = Some(serde_json::to_string(meta_obj).unwrap_or_default());
                }
            }

            Ok(Question {
                id: qid,
                document_id: row.get(1)?,
                section_id: row.get(2)?,
                parent_id: row.get(3)?,
                sequence: row.get(4)?,
                content: row.get(5)?,
                is_header: row.get(6)?,
                description: row.get(7)?,
                answer_type: row.get(8)?,
                metadata,
                score: row.get(10)?,
                question_type: row.get(11)?,
                group_score: row.get(12)?,
                display_text: row.get(13)?,
                is_group_header: row.get(14)?,
                is_scored: row.get(15)?,
            })
        })
        .map_err(|e| format!("Query map failed: {}", e))?;

    let mut questions = Vec::new();
    for q in question_iter {
        questions.push(q.map_err(|e| format!("Row error: {}", e))?);
    }

    Ok(questions)
}

/// Get all questions with full details (choices, references with Thai letters)
pub fn get_document_questions_with_details(doc_id: String) -> Result<Vec<QuestionDetail>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // 1. Get Questions
    let mut stmt = conn.prepare(
        "SELECT id, document_id, section_id, parent_id, sequence, content, is_header, description, answer_type, metadata,
                score, question_type, group_score, display_text, is_group_header, is_scored
         FROM Questions WHERE document_id = ?1 ORDER BY sequence"
    ).map_err(|e| format!("Failed to prepare query: {}", e))?;

    let mut answer_keys_stmt = conn
        .prepare(
            "SELECT question_id, sub_question_code, answer_key_text, is_required, order_index
         FROM QuestionAnswerKeys
         WHERE question_id IN (SELECT id FROM Questions WHERE document_id = ?1)
         ORDER BY question_id, order_index",
        )
        .map_err(|e| format!("Failed to prepare answer keys query: {}", e))?;

    let mut answer_keys_map: HashMap<String, Vec<(String, String, bool)>> = HashMap::new();
    let ak_rows = answer_keys_stmt
        .query_map(params![doc_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, bool>(3)?,
            ))
        })
        .map_err(|e| format!("Failed to query answer keys: {}", e))?;

    for (qid, code, text, required) in ak_rows.flatten() {
        answer_keys_map
            .entry(qid)
            .or_default()
            .push((code, text, required));
    }

    let questions_iter = stmt
        .query_map(params![doc_id], |row| {
            let qid: String = row.get(0)?;
            let mut metadata: Option<String> = row.get(9)?;

            if let Some(keys) = answer_keys_map.get(&qid) {
                let mut meta_val = if let Some(meta_str) = &metadata {
                    serde_json::from_str::<serde_json::Value>(meta_str)
                        .unwrap_or(serde_json::json!({}))
                } else {
                    serde_json::json!({})
                };

                if let Some(meta_obj) = meta_val.as_object_mut() {
                    if keys.len() == 1 && keys[0].0.is_empty() {
                        meta_obj.insert(
                            "answerKey".to_string(),
                            serde_json::Value::String(keys[0].1.clone()),
                        );
                        meta_obj.remove("answerKeys");
                    } else {
                        let mut keys_obj = serde_json::Map::new();
                        for (code, text, _req) in keys {
                            keys_obj.insert(code.clone(), serde_json::Value::String(text.clone()));
                        }
                        meta_obj.insert(
                            "answerKeys".to_string(),
                            serde_json::Value::Object(keys_obj),
                        );
                        meta_obj.remove("answerKey");
                    }
                    metadata = Some(serde_json::to_string(meta_obj).unwrap_or_default());
                }
            }

            Ok(Question {
                id: qid,
                document_id: row.get(1)?,
                section_id: row.get(2)?,
                parent_id: row.get(3)?,
                sequence: row.get(4)?,
                content: row.get(5)?,
                is_header: row.get(6)?,
                description: row.get(7)?,
                answer_type: row.get(8)?,
                metadata,
                score: row.get(10)?,
                question_type: row.get(11)?,
                group_score: row.get(12)?,
                display_text: row.get(13)?,
                is_group_header: row.get(14)?,
                is_scored: row.get(15)?,
            })
        })
        .map_err(|e| format!("Query map failed: {}", e))?;

    let mut details = Vec::new();

    for q_res in questions_iter {
        let q = q_res.map_err(|e| e.to_string())?;

        // 2. Get Choices for this question
        let mut choice_stmt = conn
            .prepare(
                "SELECT id, question_id, label, content, is_correct, sequence             FROM QuestionChoices WHERE question_id = ?1 ORDER BY sequence",
            )
            .map_err(|e| e.to_string())?;

        let choices = choice_stmt
            .query_map(params![q.id], |row| {
                Ok(QuestionChoice {
                    id: row.get(0)?,
                    question_id: row.get(1)?,
                    label: row.get(2)?,
                    content: row.get(3)?,
                    is_correct: row.get(4)?,
                    sequence: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        // 3. Get References for this question (sorted by section reference order)
        let mut ref_stmt = conn.prepare(
            "SELECT qr.id, qr.question_id, qr.reference_id, qr.location_text, sr.display_order,
                    dr.id, dr.code, dr.title, dr.classification, dr.category, dr.resource_type, dr.file_path, dr.created_at, dr.updated_at
             FROM QuestionReferences qr
             JOIN DocumentReferences dr ON qr.reference_id = dr.id
             LEFT JOIN SectionReferences sr ON sr.reference_id = qr.reference_id AND sr.section_id = ?2
             WHERE qr.question_id = ?1
             ORDER BY sr.display_order"
        ).map_err(|e| e.to_string())?;

        let references = ref_stmt
            .query_map(params![q.id, q.section_id], |row| {
                let section_display_order: Option<i32> = row.get(4).unwrap_or(None);

                // Calculate Thai Letter based on Section Order
                let thai_letter = match section_display_order {
                    Some(order) => get_thai_letter(order),
                    None => "?".to_string(),
                };

                Ok(QuestionReferenceDetail {
                    id: row.get(0)?,
                    question_id: row.get(1)?,
                    reference: DocumentReference {
                        id: row.get(5)?,
                        code: row.get(6)?,
                        title: row.get(7)?,
                        classification: row.get(8)?,
                        category: row.get(9)?,
                        resource_type: row.get(10)?,
                        file_path: row.get(11)?,
                        created_at: row.get(12)?,
                        updated_at: row.get(13)?,
                    },
                    location_text: row.get(3)?,
                    display_order: section_display_order.unwrap_or(0),
                    thai_letter,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        details.push(QuestionDetail {
            question: q,
            choices,
            references,
        });
    }

    Ok(details)
}

/// Create a new question
pub fn create_question(args: CreateQuestionArgs) -> Result<String, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Use provided ID or generate new one
    let id = args.id.unwrap_or_else(generate_uuid);

    // Default sequence: Max + 1
    let sequence = if let Some(seq) = args.sequence {
        seq
    } else {
        // Find max sequence in this context
        if let Some(pid) = &args.parent_id {
            let max_seq: Option<i32> = conn
                .query_row(
                    "SELECT MAX(sequence) FROM Questions WHERE parent_id = ?1",
                    params![pid],
                    |row| row.get(0),
                )
                .unwrap_or(None);
            max_seq.unwrap_or(0) + 1
        } else {
            // Root level: Must filter by Document AND Section
            let max_seq_val: Option<i32> = if let Some(sid) = args.section_id {
                conn.query_row(
                    "SELECT MAX(sequence) FROM Questions WHERE document_id = ?1 AND section_id = ?2 AND parent_id IS NULL",
                    params![args.document_id, sid],
                    |row| row.get(0)
                ).unwrap_or(None)
            } else {
                conn.query_row(
                    "SELECT MAX(sequence) FROM Questions WHERE document_id = ?1 AND section_id IS NULL AND parent_id IS NULL",
                    params![args.document_id],
                    |row| row.get(0)
                ).unwrap_or(None)
            };
            max_seq_val.unwrap_or(0) + 1
        }
    };

    conn.execute(
        "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, description, answer_type, metadata, score, question_type, group_score, display_text, is_group_header, is_scored)         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        params![
            id,            args.document_id,            args.section_id,            args.parent_id,            sequence,            args.content,            args.is_header,            args.description,
            args.answer_type.unwrap_or("text".to_string()),
            args.metadata,
            args.score.unwrap_or(0),
            args.question_type.unwrap_or("normal".to_string()),
            args.group_score.unwrap_or(0),
            args.display_text,
            args.is_group_header.unwrap_or(false),
            args.is_scored.unwrap_or(false)
        ]
    )
    .map_err(|e | e.to_string())?;

    // If this question has a parent, set parent as group header (is_group_header = 1, is_scored = 0)
    if let Some(ref parent_id) = args.parent_id {
        conn.execute(
            "UPDATE Questions SET is_group_header = 1, is_scored = 0 WHERE id = ?1",
            params![parent_id],
        )
        .map_err(|e| e.to_string())?;
    }

    // Sync selectedSubQuestions JSON → QuestionSubQuestionLinks relational table
    sync_question_sub_question_links(&conn, &id, args.metadata.as_deref())
        .unwrap_or_else(|e| eprintln!("[SubQ Sync] create_question: {}", e));

    Ok(id)
}

/// Update an existing question
pub fn update_question(args: UpdateQuestionArgs) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| e.to_string())?;

    // Use COALESCE so scoring fields are preserved when not explicitly provided (None → keep DB value)
    conn.execute(
        "UPDATE Questions         SET content = ?2, description = ?3, metadata = ?4,
             score = COALESCE(?5, score),
             question_type = COALESCE(?6, question_type),
             group_score = COALESCE(?7, group_score),
             display_text = COALESCE(?8, display_text),
             is_group_header = COALESCE(?9, is_group_header),
             is_scored = COALESCE(?10, is_scored)
         WHERE id = ?1",
        params![
            args.id,
            args.content,
            args.description,
            args.metadata,
            args.score,
            args.question_type,
            args.group_score,
            args.display_text,
            args.is_group_header,
            args.is_scored
        ],
    )
    .map_err(|e| e.to_string())?;

    // Sync selectedSubQuestions JSON → QuestionSubQuestionLinks relational table
    sync_question_sub_question_links(&conn, &args.id, args.metadata.as_deref())
        .unwrap_or_else(|e| eprintln!("[SubQ Sync] update_question: {}", e));

    Ok(())
}

/// Sync the selectedSubQuestions field in JSON metadata → QuestionSubQuestionLinks table.
/// Clears existing links for this question, then re-inserts from current metadata.
/// Safe to call on every save — idempotent when metadata hasn't changed.
pub fn sync_question_sub_question_links(
    conn: &Connection,
    question_id: &str,
    metadata_json: Option<&str>,
) -> Result<(), String> {
    // 1. Delete existing links for this question
    conn.execute(
        "DELETE FROM QuestionSubQuestionLinks WHERE question_id = ?1",
        params![question_id],
    )
    .map_err(|e| format!("Failed to delete existing SubQ links: {}", e))?;

    // 2. Insert new links from metadata
    if let Some(json_str) = metadata_json {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(json_str) {
            if let Some(codes) = v.get("selectedSubQuestions").and_then(|c| c.as_array()) {
                for (i, code_val) in codes.iter().enumerate() {
                    if let Some(code) = code_val.as_str() {
                        conn.execute(
                            "INSERT OR IGNORE INTO QuestionSubQuestionLinks (question_id, sub_question_code)
                             VALUES (?1, ?2)",
                            params![question_id, code],
                        ).map_err(|e| format!("Failed to insert SubQ link [{i}]: {}", e))?;
                    }
                }
            }
        }
    }

    Ok(())
}

/// Delete a question (recursive, cascading delete for children)
pub fn delete_question(id: String) -> Result<(), String> {
    let mut conn = get_content_connection().map_err(|e| e.to_string())?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Get info before delete to handle re-indexing (context for siblings)
    let (document_id, section_id, parent_id, sequence): (String, Option<i64>, Option<String>, i32) =
        tx.query_row(
            "SELECT document_id, section_id, parent_id, sequence FROM Questions WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .map_err(|e| format!("Question not found: {}", e))?;

    // 2. Delete the question (Cascade will remove children, choices, answers, refs)
    tx.execute("DELETE FROM Questions WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    // 3. Re-index siblings (Shift Left)
    match parent_id {
        Some(ref pid) => {
            // Sibling check by parent_id
            tx.execute(
                "UPDATE Questions                 SET sequence = sequence - 1                 WHERE parent_id = ?1 AND sequence > ?2",
                params![pid, sequence],
            )
            .map_err(|e| e.to_string())?;
        }
        None => {
            // Sibling check by document_id + section_id (for L1 roots)
            tx.execute(
                "UPDATE Questions                 SET sequence = sequence - 1                 WHERE document_id = ?1 AND section_id IS ?2 AND parent_id IS NULL AND sequence > ?3",
                params![document_id, section_id, sequence],
            ).map_err(|e| e.to_string())?;
        }
    }

    // 4. If this question had a parent, check if parent now has 0 children
    //    → revert parent's is_group_header=0, is_scored=1 and recalculate scores
    if let Some(ref pid) = parent_id {
        let child_count: i32 = tx
            .query_row(
                "SELECT COUNT(*) FROM Questions WHERE parent_id = ?1",
                params![pid],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if child_count == 0 {
            tx.execute(
                "UPDATE Questions SET is_group_header = 0, group_score = 0, is_scored = 1 WHERE id = ?1",
                params![pid],
            ).map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;

    // Recalculate scores after commit (needs its own connection)
    if let Some(ref pid) = parent_id {
        let conn2 = get_content_connection().map_err(|e| e.to_string())?;
        let _ = recalculate_group_score_chain(&conn2, pid);
    }

    Ok(())
}

/// Reorder questions by receiving an ordered list of question IDs.
/// Reassigns sequence = 1, 2, 3, ... in the given order.
pub fn reorder_questions(question_ids: Vec<String>) -> Result<(), String> {
    let mut conn = get_content_connection().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    for (index, id) in question_ids.iter().enumerate() {
        let new_seq = (index + 1) as i32;
        tx.execute(
            "UPDATE Questions SET sequence = ?1 WHERE id = ?2",
            params![new_seq, id],
        )
        .map_err(|e| format!("Failed to update sequence for {}: {}", id, e))?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

/// Get document with full hierarchy (unit ownership chain)
pub fn get_document_with_hierarchy(id: String) -> Result<DocumentHierarchy, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // 1. Fetch Document
    let doc: Document = conn.query_row(
        "SELECT id, name, applied_to, unit_owner_id, unit_code, doc_type, user_level, status, created_at, updated_at         FROM Documents WHERE id = ?1",
        params![id],
        |row| {
            Ok(Document {
                id: row.get(0)?,
                name: row.get(1)?,
                applied_to: row.get(2)?,
                unit_owner_id: row.get(3)?,
                unit_code: row.get(4)?,
                doc_type: row.get(5)?,
                user_level: row.get(6)?,
                status: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        }
    ).map_err(|e| format!("Document not found or error: {}", e))?;

    // 2. Resolve Hierarchy
    let mut hierarchy_names = Vec::new();
    if let Some(mut current_unit_id) = doc.unit_owner_id.clone() {
        loop {
            // Find current unit
            let unit_res: Result<(String, Option<String>), _> = conn.query_row(
                "SELECT unit_name, parent_id FROM OwnerUnits WHERE unit_id = ?1",
                params![current_unit_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            );

            match unit_res {
                Ok((name, parent_id_opt)) => {
                    hierarchy_names.push(name);
                    if let Some(pid) = parent_id_opt {
                        current_unit_id = pid;
                    } else {
                        break; // No parent, root reached
                    }
                }
                Err(_) => break, // Unit not found
            }
        }
    }

    // hierarchy_names is already [L4, L3, L2, L1] (leaf to root)
    Ok(DocumentHierarchy {
        document: doc,
        hierarchy: hierarchy_names,
    })
}

/// Check if a question has children
pub fn check_has_children(parent_id: String) -> Result<bool, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    let count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM Questions WHERE parent_id = ?1",
            params![parent_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    Ok(count > 0)
}

/// Get all required_instance L3 children for an L2 question
pub fn get_required_count_children(parent_id: String) -> Result<Vec<RequiredCountChild>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    get_required_count_children_inner(&conn, &parent_id)
}

pub fn get_required_count_children_inner(
    conn: &Connection,
    parent_id: &str,
) -> Result<Vec<RequiredCountChild>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, parent_id, sequence, content, score, is_scored
         FROM Questions
         WHERE parent_id = ?1 AND question_type = 'required_instance'
         ORDER BY sequence",
        )
        .map_err(|e| e.to_string())?;

    let children = stmt
        .query_map(params![parent_id], |row| {
            Ok(RequiredCountChild {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                sequence: row.get(2)?,
                content: row.get(3)?,
                score: row.get(4)?,
                is_scored: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(children)
}

/// Sync L3 "ครั้งที่ X" children for an L2 question (3xx.2-3xx.6).
/// Creates/deletes children to match desired_count.
/// Each child: content = "{parent_content} ครั้งที่ {N}", score = score_per_instance.
pub fn sync_required_count_children(
    args: SyncRequiredCountArgs,
) -> Result<Vec<RequiredCountChild>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Get parent question content, metadata, and answer_type to inherit
    let (parent_content, parent_metadata, parent_answer_type): (String, Option<String>, String) =
        conn.query_row(
            "SELECT content, metadata, COALESCE(answer_type, 'text') FROM Questions WHERE id = ?1",
            params![args.parent_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|e| e.to_string())?;

    // Use content_override if provided (e.g. 3xx.6 L1 uses description text for L2 children)
    let effective_content = args.content_override.unwrap_or(parent_content);

    // Get existing required_instance children
    let existing = get_required_count_children_inner(&conn, &args.parent_id)?;
    let current_count = existing.len() as i32;

    if args.desired_count > current_count {
        // Add new children (inherit parent's metadata and answer_type)
        for i in (current_count + 1)..=(args.desired_count) {
            let id = generate_uuid();
            let content = format!("{} ครั้งที่ {}", effective_content, thai_number(i));

            conn.execute(
                "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, answer_type, metadata, score, question_type, group_score, is_group_header, is_scored)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8, ?9, 'required_instance', 0, 0, 1)",
                params![id, args.document_id, args.section_id, args.parent_id, i, content, parent_answer_type, parent_metadata, args.score_per_instance],
            ).map_err(|e| e.to_string())?;

            sync_question_sub_question_links(&conn, &id, parent_metadata.as_deref())?;
        }
    } else if args.desired_count < current_count {
        // Delete excess children (from the end)
        let ids_to_delete: Vec<String> = existing
            .iter()
            .skip(args.desired_count as usize)
            .map(|c| c.id.clone())
            .collect();

        for id in &ids_to_delete {
            conn.execute(
                "DELETE FROM Questions WHERE id = ?1 AND question_type = 'required_instance'",
                params![id],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    // Update score, content, metadata, and answer_type for all remaining children
    // This ensures L3 children always inherit the latest sub-questions from L2 parent
    let remaining = get_required_count_children_inner(&conn, &args.parent_id)?;
    for child in &remaining {
        let new_content = format!("{} ครั้งที่ {}", effective_content, thai_number(child.sequence));
        conn.execute(
            "UPDATE Questions SET score = ?1, content = ?2, metadata = ?3, answer_type = ?4 WHERE id = ?5 AND question_type = 'required_instance'",
            params![args.score_per_instance, new_content, parent_metadata, parent_answer_type, child.id],
        ).map_err(|e| e.to_string())?;

        sync_question_sub_question_links(&conn, &child.id, parent_metadata.as_deref())?;
    }

    // Mark parent as group_header if it has children, or unmark if count == 0
    if args.desired_count > 0 {
        conn.execute(
            "UPDATE Questions SET is_group_header = 1, is_scored = 0 WHERE id = ?1",
            params![args.parent_id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        // No children — revert to scored leaf
        conn.execute(
            "UPDATE Questions SET is_group_header = 0, is_scored = 1 WHERE id = ?1",
            params![args.parent_id],
        )
        .map_err(|e| e.to_string())?;
    }

    // Recalculate scores up the chain
    recalculate_group_score_chain(&conn, &args.parent_id)?;

    get_required_count_children_inner(&conn, &args.parent_id)
}
