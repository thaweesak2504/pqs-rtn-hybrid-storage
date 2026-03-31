use rusqlite::{params, Connection, Transaction};

use super::*;

// ============================================================
// User Progress & Scoring
// ============================================================

/// Upsert (insert or update) user progress for a section
pub fn upsert_user_progress(args: UpsertUserProgressArgs) -> Result<UserProgress, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let passing = args.passing_score.unwrap_or(100);
    let pct = if args.max_score > 0 {
        (args.earned_score as f64 / args.max_score as f64) * 100.0
    } else {
        0.0
    };
    let is_passed = pct >= passing as f64;

    conn.execute(
        "INSERT INTO UserProgress (user_id, document_id, section_id, earned_score, max_score, completion_percentage, is_passed, passing_score, last_updated)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, document_id, section_id) DO UPDATE SET
            earned_score = ?4, max_score = ?5, completion_percentage = ?6, is_passed = ?7, passing_score = ?8, last_updated = CURRENT_TIMESTAMP",
        params![args.user_id, args.document_id, args.section_id, args.earned_score, args.max_score, pct, is_passed, passing],
    ).map_err(|e| e.to_string())?;

    // Return the upserted row
    let progress = conn.query_row(
        "SELECT id, user_id, document_id, section_id, earned_score, max_score, completion_percentage, is_passed, passing_score, last_updated
         FROM UserProgress WHERE user_id = ?1 AND document_id = ?2 AND section_id IS ?3",
        params![args.user_id, args.document_id, args.section_id],
        |row| {
            Ok(UserProgress {
                id: row.get(0)?,
                user_id: row.get(1)?,
                document_id: row.get(2)?,
                section_id: row.get(3)?,
                earned_score: row.get(4)?,
                max_score: row.get(5)?,
                completion_percentage: row.get(6)?,
                is_passed: row.get(7)?,
                passing_score: row.get(8)?,
                last_updated: row.get(9)?,
            })
        }
    ).map_err(|e| e.to_string())?;

    Ok(progress)
}

/// Get all progress entries for a user in a document
pub fn get_user_progress(
    user_id: String,
    document_id: String,
) -> Result<Vec<UserProgress>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT id, user_id, document_id, section_id, earned_score, max_score, completion_percentage, is_passed, passing_score, last_updated
         FROM UserProgress WHERE user_id = ?1 AND document_id = ?2"
    ).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![user_id, document_id], |row| {
            Ok(UserProgress {
                id: row.get(0)?,
                user_id: row.get(1)?,
                document_id: row.get(2)?,
                section_id: row.get(3)?,
                earned_score: row.get(4)?,
                max_score: row.get(5)?,
                completion_percentage: row.get(6)?,
                is_passed: row.get(7)?,
                passing_score: row.get(8)?,
                last_updated: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(rows)
}

/// Calculate total score for a section by summing L1 group_scores + standalone scored questions
pub fn calculate_section_total_score(section_id: i64) -> Result<i32, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Sum L1 questions: group headers use group_score, others use score if is_scored
    // Only count top-level questions (parent_id IS NULL) to avoid double-counting
    let total: i32 = conn
        .query_row(
            "SELECT COALESCE(SUM(
            CASE                WHEN question_type = 'exempted' THEN 0
                WHEN is_group_header = 1 THEN group_score
                WHEN is_scored = 1 AND parent_id IS NULL THEN score
                ELSE 0
            END
        ), 0) FROM Questions WHERE section_id = ?1 AND parent_id IS NULL",
            params![section_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Auto-update the section's total_score
    conn.execute(
        "UPDATE Sections SET total_score = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![total, section_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(total)
}

/// Calculate group_score for a parent question by summing children's scores
/// Children that are group headers contribute group_score; scored children contribute score
/// Returns the computed group_score and auto-updates the parent's group_score field
pub fn calculate_group_score(parent_id: String) -> Result<i32, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let total: i32 = conn
        .query_row(
            "SELECT COALESCE(SUM(
            CASE                WHEN question_type = 'exempted' THEN 0
                WHEN is_group_header = 1 THEN group_score
                WHEN is_scored = 1 THEN score
                ELSE 0
            END
        ), 0) FROM Questions WHERE parent_id = ?1",
            params![parent_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Auto-update the parent's group_score
    conn.execute(
        "UPDATE Questions SET group_score = ?1 WHERE id = ?2",
        params![total, parent_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(total)
}

/// Batch-recalculate group_score for all group headers in a section, bottom-up (L2 → L1),
/// using a single connection and transaction to avoid SQLite write-lock contention.
/// Returns a map of question_id → new group_score.
pub fn batch_recalculate_section_group_scores(
    section_id: i64,
) -> Result<Vec<(String, i32)>, String> {
    let mut conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // L2 group headers first (children of L1)
    let l2_ids: Vec<String> = {
        let mut l2_stmt = conn.prepare(
            "SELECT id FROM Questions WHERE section_id = ?1 AND parent_id IS NOT NULL AND is_group_header = 1"
        ).map_err(|e| e.to_string())?;
        let rows = l2_stmt
            .query_map(params![section_id], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        let ids = rows.filter_map(|r| r.ok()).collect::<Vec<String>>();
        ids
    };

    // L1 group headers (top-level)
    let l1_ids: Vec<String> = {
        let mut l1_stmt = conn.prepare(
            "SELECT id FROM Questions WHERE section_id = ?1 AND parent_id IS NULL AND is_group_header = 1"
        ).map_err(|e| e.to_string())?;
        let rows = l1_stmt
            .query_map(params![section_id], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        let ids = rows.filter_map(|r| r.ok()).collect::<Vec<String>>();
        ids
    };

    let mut results = Vec::new();

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let calc_and_update = |tx: &Transaction, parent_id: &str| -> Result<i32, String> {
        let total: i32 = tx
            .query_row(
                "SELECT COALESCE(SUM(
                CASE                    WHEN question_type = 'exempted' THEN 0
                    WHEN is_group_header = 1 THEN group_score
                    WHEN is_scored = 1 THEN score
                    ELSE 0
                END
            ), 0) FROM Questions WHERE parent_id = ?1",
                params![parent_id],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        tx.execute(
            "UPDATE Questions SET group_score = ?1 WHERE id = ?2",
            params![total, parent_id],
        )
        .map_err(|e| e.to_string())?;
        Ok(total)
    };

    for id in &l2_ids {
        let score = calc_and_update(&tx, id)?;
        results.push((id.clone(), score));
    }
    for id in &l1_ids {
        let score = calc_and_update(&tx, id)?;
        results.push((id.clone(), score));
    }

    tx.commit().map_err(|e| e.to_string())?;

    Ok(results)
}

/// Update scoring fields for a single question
pub fn update_question_score(args: UpdateQuestionScoreArgs) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // When exempted, also clear group_score so the UI badge and parent chain are correct
    if args.question_type == "exempted" {
        // If this question has children, delete them all (allows L1 group headers to become exempted)
        conn.execute(
            "DELETE FROM Questions WHERE parent_id = ?1",
            params![args.id],
        )
        .map_err(|e| e.to_string())?;

        // Set question to exempted and revert group_header status, clear description
        conn.execute(
            "UPDATE Questions SET score = 0, is_scored = 0, question_type = ?2, display_text = ?3, group_score = 0, is_group_header = 0, description = NULL WHERE id = ?1",
            params![args.id, args.question_type, args.display_text],
        ).map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE Questions SET score = ?2, is_scored = ?3, question_type = ?4, display_text = ?5 WHERE id = ?1",
            params![args.id, args.score, args.is_scored, args.question_type, args.display_text],
        ).map_err(|e| e.to_string())?;
    }

    // If this question has a parent, recalculate parent's group_score (L2 → L1)
    let parent_id: Option<String> = conn
        .query_row(
            "SELECT parent_id FROM Questions WHERE id = ?1",
            params![args.id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if let Some(ref pid) = parent_id {
        // Sum children: group headers contribute group_score, scored items contribute score
        let group_total: i32 = conn
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
            params![group_total, pid],
        )
        .map_err(|e| e.to_string())?;

        // Also propagate up: if parent has a grandparent, recalculate grandparent's group_score (L1 → section)
        let grandparent_id: Option<String> = conn
            .query_row(
                "SELECT parent_id FROM Questions WHERE id = ?1",
                params![pid],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        if let Some(ref gpid) = grandparent_id {
            let gp_total: i32 = conn
                .query_row(
                    "SELECT COALESCE(SUM(
                    CASE                        WHEN question_type = 'exempted' THEN 0
                        WHEN is_group_header = 1 THEN group_score
                        WHEN is_scored = 1 THEN score
                        ELSE 0
                    END
                ), 0) FROM Questions WHERE parent_id = ?1",
                    params![gpid],
                    |row| row.get(0),
                )
                .map_err(|e| e.to_string())?;
            conn.execute(
                "UPDATE Questions SET group_score = ?1 WHERE id = ?2",
                params![gp_total, gpid],
            )
            .map_err(|e| e.to_string())?;
        }

        // Propagate to section total_score
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
                        WHEN is_scored = 1 AND parent_id IS NULL THEN score
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

    Ok(())
}

/// Helper: recalculate group_score chain from a parent upward (parent → grandparent → section total)
pub fn recalculate_group_score_chain(conn: &Connection, parent_id: &str) -> Result<(), String> {
    // 1. Recalculate parent's group_score from its children
    let parent_total: i32 = conn
        .query_row(
            "SELECT COALESCE(SUM(
            CASE                WHEN question_type = 'exempted' THEN 0
                WHEN is_group_header = 1 THEN group_score
                WHEN is_scored = 1 THEN score
                ELSE 0
            END
        ), 0) FROM Questions WHERE parent_id = ?1",
            params![parent_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE Questions SET group_score = ?1 WHERE id = ?2",
        params![parent_total, parent_id],
    )
    .map_err(|e| e.to_string())?;

    // 2. Get grandparent and propagate up
    let grandparent_id: Option<String> = conn
        .query_row(
            "SELECT parent_id FROM Questions WHERE id = ?1",
            params![parent_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if let Some(ref gpid) = grandparent_id {
        let gp_total: i32 = conn
            .query_row(
                "SELECT COALESCE(SUM(
                CASE                    WHEN question_type = 'exempted' THEN 0
                    WHEN is_group_header = 1 THEN group_score
                    WHEN is_scored = 1 THEN score
                    ELSE 0
                END
            ), 0) FROM Questions WHERE parent_id = ?1",
                params![gpid],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        conn.execute(
            "UPDATE Questions SET group_score = ?1 WHERE id = ?2",
            params![gp_total, gpid],
        )
        .map_err(|e| e.to_string())?;
    }

    // 3. Propagate to section total_score
    let section_id: Option<i64> = conn
        .query_row(
            "SELECT section_id FROM Questions WHERE id = ?1",
            params![parent_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if let Some(sid) = section_id {
        let section_total: i32 = conn
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

        conn.execute(
            "UPDATE Sections SET total_score = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![section_total, sid],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

// ============================================================
// Section Progress Computation
// ============================================================

pub fn extract_ref_section_id(metadata: Option<String>) -> Option<i64> {
    metadata
        .and_then(|meta| serde_json::from_str::<serde_json::Value>(&meta).ok())
        .and_then(|value| value.get("refSectionId").and_then(|v| v.as_i64()))
        .filter(|id| *id > 0)
}

pub fn compute_section_progress(
    conn: &Connection,
    user_id: &str,
    document_id: &str,
    section_id: i64,
) -> Result<ComputedSectionProgress, String> {
    let mut visited = std::collections::HashSet::new();
    compute_section_progress_inner(conn, user_id, document_id, section_id, &mut visited)
}

pub fn compute_section_progress_inner(
    conn: &Connection,
    user_id: &str,
    document_id: &str,
    section_id: i64,
    visited: &mut std::collections::HashSet<i64>,
) -> Result<ComputedSectionProgress, String> {
    // Cycle detection: prevent infinite recursion from circular section_refs
    if !visited.insert(section_id) {
        return Err(format!(
            "Circular section_ref detected at section_id={}",
            section_id
        ));
    }

    let section_group: i32 = conn
        .query_row(
            "SELECT section_group FROM Sections WHERE id = ?1",
            params![section_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if section_group == 300 {
        let section_total_score: i32 = conn
            .query_row(
                "SELECT COALESCE(SUM(
                CASE
                    WHEN question_type = 'exempted' THEN 0
                    WHEN is_group_header = 1 THEN COALESCE(group_score, 0)
                    WHEN is_scored = 1 AND parent_id IS NULL THEN COALESCE(score, 0)
                    ELSE 0
                END
             ), 0)
             FROM Questions
             WHERE section_id = ?1 AND parent_id IS NULL",
                params![section_id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let mut stmt = conn
            .prepare(
                "SELECT id, metadata, COALESCE(score, 0), question_type
             FROM Questions
             WHERE section_id = ?1
               AND question_type != 'exempted'
               AND is_group_header = 0
               AND is_scored = 1
             ORDER BY sequence, id",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![section_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, i32>(2).unwrap_or(0),
                    row.get::<_, String>(3)?,
                ))
            })
            .map_err(|e| e.to_string())?;

        let mut earned_score = 0;
        let mut total_questions = 0;
        let mut answered_questions = 0;
        let mut passed_questions = 0;
        let mut pending_with_answer = 0;
        let mut needs_improvement_questions = 0;

        for row in rows {
            let (question_id, metadata, score, question_type) = row.map_err(|e| e.to_string())?;
            total_questions += 1;

            if question_type == "section_ref" {
                if let Some(ref_section_id) = extract_ref_section_id(metadata.clone()) {
                    // Skip self-references: a section pointing to itself is not meaningful
                    if ref_section_id == section_id {
                        continue;
                    }
                    match compute_section_progress_inner(
                        conn,
                        user_id,
                        document_id,
                        ref_section_id,
                        visited,
                    ) {
                        Ok(linked_progress) => {
                            if linked_progress.is_passed {
                                earned_score += score;
                                answered_questions += 1;
                                passed_questions += 1;
                            } else if linked_progress.answered_questions > 0
                                || linked_progress.pending_with_answer > 0
                                || linked_progress.needs_improvement_questions > 0
                                || linked_progress.completion_percentage > 0.0
                            {
                                answered_questions += 1;
                                pending_with_answer += 1;
                            }
                        }
                        Err(_) => {
                            // Silently skip: circular or missing section refs are non-fatal
                        }
                    }
                }
                continue;
            }

            let oral_assessment = conn.query_row(
                "SELECT status, feedback
                 FROM UserAnswers
                 WHERE user_id = ?1 AND question_id = ?2 AND document_id = ?3 AND sub_question_code = ''
                 ORDER BY updated_at DESC
                 LIMIT 1",
                params![user_id, question_id, document_id],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?))
            ).ok();

            if let Some((status, feedback)) = oral_assessment {
                match status.as_str() {
                    "passed" => {
                        earned_score += score;
                        answered_questions += 1;
                        passed_questions += 1;
                    }
                    "needs_improvement" => {
                        answered_questions += 1;
                        needs_improvement_questions += 1;
                    }
                    "pending" => {
                        if feedback.unwrap_or_default().trim().is_empty() {
                            continue;
                        }
                        answered_questions += 1;
                        pending_with_answer += 1;
                    }
                    _ => {}
                }
            }
        }

        let completion_percentage = if total_questions > 0 {
            (answered_questions as f64 / total_questions as f64) * 100.0
        } else {
            0.0
        };
        let performance_percentage = if section_total_score > 0 {
            (earned_score as f64 / section_total_score as f64) * 100.0
        } else {
            0.0
        };

        // Backtrack: allow this section to be visited again from a different path
        visited.remove(&section_id);

        return Ok(ComputedSectionProgress {
            earned_score,
            max_score: section_total_score,
            completion_percentage,
            is_passed: section_total_score > 0 && performance_percentage >= 100.0,
            passing_score: 100,
            total_questions,
            answered_questions,
            passed_questions,
            pending_with_answer,
            needs_improvement_questions,
        });
    }

    let section_number: i32 = conn
        .query_row(
            "SELECT section_number FROM Sections WHERE id = ?1",
            params![section_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    let seq_start = section_number;
    let seq_end = section_number + 100;

    let max_score: i32 = conn
        .query_row(
            "SELECT COALESCE(SUM(
            CASE
                WHEN question_type = 'exempted' THEN 0
                WHEN is_group_header = 1 THEN COALESCE(group_score, 0)
                WHEN is_scored = 1 THEN COALESCE(score, 0)
                ELSE 0
            END
         ), 0)
         FROM Questions
         WHERE section_id = ?1
            OR (section_id = 0 AND sequence >= ?2 AND sequence < ?3)",
            params![section_id, seq_start, seq_end],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let earned_score: f64 = conn.query_row(
        "SELECT COALESCE(SUM(
            CASE
                WHEN q.is_group_header = 1 THEN 0
                WHEN q.is_scored = 1 THEN                    CAST(COALESCE(q.score, 0) AS FLOAT) /                    COALESCE((SELECT COUNT(*) FROM QuestionAnswerKeys WHERE question_id = q.id), 1)
                ELSE 0
            END
         ), 0.0)
         FROM UserAnswers ua
         JOIN Questions q ON q.id = ua.question_id
                 WHERE ua.user_id = ?1 AND ua.document_id = ?2
                     AND (q.section_id = ?3 OR (q.section_id = 0 AND q.sequence >= ?4 AND q.sequence < ?5))
                     AND ua.status = 'passed'",
                params![user_id, document_id, section_id, seq_start, seq_end],
        |row| row.get(0)
    ).unwrap_or(0.0);
    let earned_score_i32 = earned_score.round() as i32;

    let total_questions: i32 = conn.query_row(
        "SELECT COUNT(*)
         FROM QuestionAnswerKeys ak
         JOIN Questions q ON q.id = ak.question_id
                 WHERE (q.section_id = ?1 OR (q.section_id = 0 AND q.sequence >= ?2 AND q.sequence < ?3))
                     AND q.question_type != 'exempted'",
                params![section_id, seq_start, seq_end],
        |row| row.get(0)
    ).unwrap_or(0);

    let passed_questions: i32 = conn.query_row(
        "SELECT COUNT(*)
         FROM UserAnswers ua
         JOIN Questions q ON q.id = ua.question_id
                 WHERE ua.user_id = ?1 AND ua.document_id = ?2
                     AND (q.section_id = ?3 OR (q.section_id = 0 AND q.sequence >= ?4 AND q.sequence < ?5))
                     AND ua.status = 'passed'",
                params![user_id, document_id, section_id, seq_start, seq_end],
        |row| row.get(0)
    ).unwrap_or(0);

    let pending_with_answer: i32 = conn.query_row(
        "SELECT COUNT(*)
         FROM UserAnswers ua
         JOIN Questions q ON q.id = ua.question_id
                 WHERE ua.user_id = ?1 AND ua.document_id = ?2
                     AND (q.section_id = ?3 OR (q.section_id = 0 AND q.sequence >= ?4 AND q.sequence < ?5))
                     AND ua.status = 'pending'
           AND ua.answer_text IS NOT NULL AND ua.answer_text != ''",
                params![user_id, document_id, section_id, seq_start, seq_end],
        |row| row.get(0)
    ).unwrap_or(0);

    let needs_improvement_questions: i32 = conn.query_row(
        "SELECT COUNT(*)
         FROM UserAnswers ua
         JOIN Questions q ON q.id = ua.question_id
                 WHERE ua.user_id = ?1 AND ua.document_id = ?2
                     AND (q.section_id = ?3 OR (q.section_id = 0 AND q.sequence >= ?4 AND q.sequence < ?5))
                     AND ua.status = 'needs_improvement'",
                params![user_id, document_id, section_id, seq_start, seq_end],
        |row| row.get(0)
    ).unwrap_or(0);

    let performance_percentage = if max_score > 0 {
        (earned_score / max_score as f64) * 100.0
    } else if total_questions > 0 {
        (passed_questions as f64 / total_questions as f64) * 100.0
    } else {
        0.0
    };
    let completion_percentage = if total_questions > 0 {
        ((passed_questions + pending_with_answer + needs_improvement_questions) as f64
            / total_questions as f64)
            * 100.0
    } else {
        0.0
    };
    let is_passed = if max_score > 0 {
        performance_percentage >= 100.0 && max_score > 0
    } else {
        total_questions > 0 && passed_questions >= total_questions
    };

    // Backtrack: allow this section to be visited again from a different path
    visited.remove(&section_id);

    Ok(ComputedSectionProgress {
        earned_score: if max_score > 0 {
            earned_score_i32
        } else {
            passed_questions
        },
        max_score: if max_score > 0 {
            max_score
        } else {
            total_questions
        },
        completion_percentage,
        is_passed,
        passing_score: 100,
        total_questions,
        answered_questions: passed_questions + pending_with_answer + needs_improvement_questions,
        passed_questions,
        pending_with_answer,
        needs_improvement_questions,
    })
}

/// Recalculate UserProgress for all sections of a user/document by summing
/// Questions.score for all passed answers. Updates UserProgress automatically.
pub fn recalculate_section_progress(user_id: String, document_id: String) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Get all sections for this document
    let mut sect_stmt = conn
        .prepare("SELECT id, total_score FROM Sections WHERE document_id = ?1")
        .map_err(|e| e.to_string())?;

    let sections: Vec<(i64, i32)> = sect_stmt
        .query_map(params![document_id], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, i32>(1).unwrap_or(0)))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    for (section_id, _max_score) in sections {
        let progress = compute_section_progress(&conn, &user_id, &document_id, section_id)?;
        let pct = if progress.max_score > 0 {
            (progress.earned_score as f64 / progress.max_score as f64) * 100.0
        } else if progress.total_questions > 0 {
            (progress.passed_questions as f64 / progress.total_questions as f64) * 100.0
        } else {
            0.0
        };

        let _ = conn.execute(
            "INSERT INTO UserProgress (user_id, document_id, section_id, earned_score, max_score, completion_percentage, is_passed, passing_score, last_updated)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 100, CURRENT_TIMESTAMP)
             ON CONFLICT(user_id, document_id, section_id) DO UPDATE SET
                earned_score = ?4, max_score = ?5, completion_percentage = ?6, is_passed = ?7, last_updated = CURRENT_TIMESTAMP",
            params![user_id, document_id, section_id, progress.earned_score, progress.max_score, pct, progress.is_passed],
        );
    }

    Ok(())
}

/// Get progress for a specific section for the ScoreProgressBanner
pub fn get_section_progress(
    user_id: String,
    document_id: String,
    section_id: i64,
) -> Result<serde_json::Value, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    let progress = compute_section_progress(&conn, &user_id, &document_id, section_id)?;

    Ok(serde_json::json!({
        "earned_score": progress.earned_score,
        "max_score": progress.max_score,
        "completion_percentage": progress.completion_percentage,
        "is_passed": progress.is_passed,
        "passing_score": progress.passing_score,
        "total_questions": progress.total_questions,
        "answered_questions": progress.answered_questions,
        "passed_questions": progress.passed_questions,
        "pending_with_answer": progress.pending_with_answer,
        "needs_improvement_questions": progress.needs_improvement_questions,
    }))
}

pub fn get_section_dev_metrics(
    document_id: String,
    section_id: i64,
) -> Result<DevSectionMetrics, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let total_questions_raw: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM Questions WHERE section_id = ?1 AND document_id = ?2",
            params![section_id, document_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let total_leaf_questions: i32 = conn.query_row(
        "SELECT COUNT(*) FROM Questions
         WHERE section_id = ?1 AND document_id = ?2
           AND id NOT IN (SELECT DISTINCT parent_id FROM Questions WHERE parent_id IS NOT NULL AND section_id = ?1 AND document_id = ?2)",
        params![section_id, document_id, section_id, document_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let total_exempted: i32 = conn.query_row(
        "SELECT COUNT(*) FROM Questions WHERE section_id = ?1 AND document_id = ?2 AND question_type = 'exempted'",
        params![section_id, document_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let total_with_answer_keys: i32 = conn
        .query_row(
            "SELECT COUNT(DISTINCT question_id)
         FROM QuestionAnswerKeys ak
         JOIN Questions q ON q.id = ak.question_id
         WHERE q.section_id = ?1 AND q.document_id = ?2 AND q.question_type != 'exempted'",
            params![section_id, document_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let total_sub_questions: i32 = conn
        .query_row(
            "SELECT COUNT(*)
         FROM QuestionAnswerKeys ak
         JOIN Questions q ON q.id = ak.question_id
         WHERE q.section_id = ?1 AND q.document_id = ?2 AND q.question_type != 'exempted'",
            params![section_id, document_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let total_required_questions = total_leaf_questions - total_exempted;
    let total_answer_targets = total_sub_questions;

    let total_answers: i32 = conn.query_row(
        "SELECT COUNT(*) FROM UserAnswers ua JOIN Questions q ON q.id = ua.question_id WHERE ua.document_id = ?1 AND q.section_id = ?2",
        params![document_id, section_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let answers_passed: i32 = conn.query_row(
        "SELECT COUNT(*) FROM UserAnswers ua JOIN Questions q ON q.id = ua.question_id WHERE ua.document_id = ?1 AND q.section_id = ?2 AND ua.status = 'passed'",
        params![document_id, section_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let answers_pending: i32 = conn.query_row(
        "SELECT COUNT(*) FROM UserAnswers ua JOIN Questions q ON q.id = ua.question_id WHERE ua.document_id = ?1 AND q.section_id = ?2 AND ua.status = 'pending'",
        params![document_id, section_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let answers_needs_improvement: i32 = conn.query_row(
        "SELECT COUNT(*) FROM UserAnswers ua JOIN Questions q ON q.id = ua.question_id WHERE ua.document_id = ?1 AND q.section_id = ?2 AND ua.status = 'needs_improvement'",
        params![document_id, section_id],
        |row| row.get(0),
    ).unwrap_or(0);
    let answers_assessed = answers_passed + answers_needs_improvement;

    Ok(DevSectionMetrics {
        total_questions_raw,
        total_leaf_questions,
        total_exempted,
        total_required_questions,
        total_with_answer_keys,
        total_sub_questions,
        total_answer_targets,
        total_answers,
        answers_assessed,
        answers_passed,
        answers_pending,
        answers_needs_improvement,
    })
}
