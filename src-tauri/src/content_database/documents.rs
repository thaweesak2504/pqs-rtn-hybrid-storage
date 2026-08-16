use super::*;
use crate::logger;
use rusqlite::{params, Connection, OptionalExtension, Result as SqlResult};
use std::{
    collections::{HashMap, HashSet},
    path::{Path, PathBuf},
};

#[derive(Debug)]
struct SourceQuestion {
    id: String,
    section_id: i64,
    parent_id: Option<String>,
    sequence: i32,
    content: String,
    is_header: bool,
    description: Option<String>,
    answer_type: Option<String>,
    metadata: Option<String>,
    score: i32,
    question_type: String,
    group_score: i32,
    display_text: Option<String>,
    is_group_header: bool,
    is_scored: bool,
}

#[derive(Debug)]
struct SourceDocument {
    name: String,
    applied_to: Option<String>,
    unit_owner_id: Option<String>,
    unit_code: Option<String>,
    doc_type: Option<String>,
    user_level: Option<String>,
    occupation_branch_main: Option<String>,
    occupation_branch_sub: Option<String>,
}

/// Create an isolated document copy for the current Trainee/Qualifier simulation.
/// The source template remains untouched; answers, progress, and trainee attachments
/// are deliberately not copied.
pub fn clone_document_for_simulation(
    template_document_id: String,
    trainee_id: String,
) -> Result<SimulationDocumentInfo, String> {
    let mut conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    if trainee_id.trim().is_empty() {
        return Err("Trainee ID is required".to_string());
    }

    let source: SourceDocument = conn
        .query_row(
            "SELECT name, applied_to, unit_owner_id, unit_code, doc_type, user_level, occupation_branch_main, occupation_branch_sub FROM Documents WHERE id = ?1",
            params![template_document_id],
            |row| Ok(SourceDocument {
                name: row.get(0)?,
                applied_to: row.get(1)?,
                unit_owner_id: row.get(2)?,
                unit_code: row.get(3)?,
                doc_type: row.get(4)?,
                user_level: row.get(5)?,
                occupation_branch_main: row.get(6)?,
                occupation_branch_sub: row.get(7)?,
            }),
        )
        .optional()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Template document not found".to_string())?;

    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to start simulation clone: {}", e))?;

    tx.execute(
        "INSERT OR IGNORE INTO TemplateSimulationCounters (template_document_id, next_sequence)
         VALUES (?1, 1)",
        params![template_document_id],
    )
    .map_err(|e| format!("Failed to initialize simulation counter: {}", e))?;
    let mut simulation_sequence: i64 = tx
        .query_row(
            "SELECT next_sequence FROM TemplateSimulationCounters WHERE template_document_id = ?1",
            params![template_document_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to read simulation counter: {}", e))?;
    let simulation_document_id = loop {
        let candidate = format!("{}-SIM-{:03}", template_document_id, simulation_sequence);
        let already_exists: bool = tx
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM Documents WHERE id = ?1)",
                params![candidate],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check simulation ID: {}", e))?;
        if !already_exists {
            break candidate;
        }
        simulation_sequence += 1;
    };
    tx.execute(
        "UPDATE TemplateSimulationCounters SET next_sequence = ?1 WHERE template_document_id = ?2",
        params![simulation_sequence + 1, template_document_id],
    )
    .map_err(|e| format!("Failed to advance simulation counter: {}", e))?;

    tx.execute(
        "INSERT INTO Documents (id, name, applied_to, unit_owner_id, unit_code, doc_type, user_level, sequence, status, occupation_branch_main, occupation_branch_sub, is_template)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'simulation', ?9, ?10, 0)",
        params![simulation_document_id, format!("{} [Simulation: {}]", source.name, trainee_id.trim()), source.applied_to, source.unit_owner_id, source.unit_code, source.doc_type, source.user_level, Option::<i32>::None, source.occupation_branch_main, source.occupation_branch_sub],
    ).map_err(|e| format!("Failed to create simulation document: {}", e))?;

    let mut section_map = HashMap::new();
    let mut section_stmt = tx.prepare("SELECT id, section_group, section_number, title_th, menu_label, display_order, is_system_defined, duration_value, duration_unit, total_score FROM Sections WHERE document_id = ?1 ORDER BY display_order, id").map_err(|e| e.to_string())?;
    let source_sections = section_stmt
        .query_map(params![template_document_id], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i32>(1)?,
                row.get::<_, i32>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, i32>(5)?,
                row.get::<_, bool>(6)?,
                row.get::<_, Option<i32>>(7)?,
                row.get::<_, Option<String>>(8)?,
                row.get::<_, Option<i32>>(9)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    for section in source_sections {
        let (old_id, group, number, title, label, order, system, duration, unit, total) =
            section.map_err(|e| e.to_string())?;
        tx.execute("INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, display_order, is_system_defined, duration_value, duration_unit, total_score, is_template) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0)", params![simulation_document_id, group, number, title, label, order, system, duration, unit, total]).map_err(|e| e.to_string())?;
        section_map.insert(old_id, tx.last_insert_rowid());
    }
    drop(section_stmt);

    let mut question_stmt = tx.prepare("SELECT id, section_id, parent_id, sequence, content, is_header, description, answer_type, metadata, score, question_type, group_score, display_text, is_group_header, is_scored FROM Questions WHERE document_id = ?1 ORDER BY section_id, sequence, id").map_err(|e| e.to_string())?;
    let questions = question_stmt
        .query_map(params![template_document_id], |row| {
            Ok(SourceQuestion {
                id: row.get(0)?,
                section_id: row.get(1)?,
                parent_id: row.get(2)?,
                sequence: row.get(3)?,
                content: row.get(4)?,
                is_header: row.get(5)?,
                description: row.get(6)?,
                answer_type: row.get(7)?,
                metadata: row.get(8)?,
                score: row.get(9)?,
                question_type: row.get(10)?,
                group_score: row.get(11)?,
                display_text: row.get(12)?,
                is_group_header: row.get(13)?,
                is_scored: row.get(14)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    drop(question_stmt);
    let mut question_map: HashMap<String, String> = HashMap::new();
    let mut pending = questions;
    while !pending.is_empty() {
        let mut next = Vec::new();
        let mut inserted = 0usize;
        for q in pending {
            let new_parent = match q.parent_id.as_ref() {
                Some(parent) => match question_map.get(parent) {
                    Some(id) => Some(id.clone()),
                    None => {
                        next.push(q);
                        continue;
                    }
                },
                None => None,
            };
            let new_id = generate_uuid();
            // Group introduction questions use legacy virtual section IDs 100/200/300
            // rather than a row in Sections. Preserve those IDs; remap all real sections.
            let new_section = match section_map.get(&q.section_id) {
                Some(section_id) => *section_id,
                None if matches!(q.section_id, 100 | 200 | 300) => q.section_id,
                None => {
                    return Err(format!(
                        "Template question {} references unknown section {}",
                        q.id, q.section_id
                    ))
                }
            };
            tx.execute("INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, description, answer_type, metadata, score, question_type, group_score, display_text, is_group_header, is_scored, is_template) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, 0)", params![new_id, simulation_document_id, new_section, new_parent, q.sequence, q.content, q.is_header, q.description, q.answer_type, q.metadata, q.score, q.question_type, q.group_score, q.display_text, q.is_group_header, q.is_scored]).map_err(|e| e.to_string())?;
            question_map.insert(q.id, new_id);
            inserted += 1;
        }
        if inserted == 0 {
            return Err("Template has invalid question parent hierarchy".to_string());
        }
        pending = next;
    }

    for (old_question, new_question) in &question_map {
        tx.execute("INSERT INTO QuestionAnswerKeys (question_id, sub_question_code, answer_key_text, is_required, order_index) SELECT ?1, sub_question_code, answer_key_text, is_required, order_index FROM QuestionAnswerKeys WHERE question_id = ?2", params![new_question, old_question]).map_err(|e| e.to_string())?;
        tx.execute("INSERT INTO QuestionSubQuestionLinks (question_id, sub_question_code) SELECT ?1, sub_question_code FROM QuestionSubQuestionLinks WHERE question_id = ?2", params![new_question, old_question]).map_err(|e| e.to_string())?;
        tx.execute("INSERT INTO QuestionChoices (question_id, label, content, is_correct, sequence) SELECT ?1, label, content, is_correct, sequence FROM QuestionChoices WHERE question_id = ?2", params![new_question, old_question]).map_err(|e| e.to_string())?;
        tx.execute("INSERT INTO QuestionReferences (question_id, reference_id, location_text, display_order) SELECT ?1, reference_id, location_text, display_order FROM QuestionReferences WHERE question_id = ?2", params![new_question, old_question]).map_err(|e| e.to_string())?;
        let mut link_stmt = tx
            .prepare(
                "SELECT section_id, score, display_order FROM QuestionSectionLinks WHERE question_id = ?1",
            )
            .map_err(|e| e.to_string())?;
        let source_links = link_stmt
            .query_map(params![old_question], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, i32>(1)?,
                    row.get::<_, i32>(2)?,
                ))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        drop(link_stmt);
        for (old_linked_section, score, display_order) in source_links {
            if let Some(new_linked_section) = section_map.get(&old_linked_section) {
                tx.execute(
                    "INSERT OR IGNORE INTO QuestionSectionLinks (question_id, section_id, score, display_order) VALUES (?1, ?2, ?3, ?4)",
                    params![new_question, new_linked_section, score, display_order],
                )
                .map_err(|e| e.to_string())?;
            }
        }
    }
    for (old_section, new_section) in &section_map {
        tx.execute("INSERT INTO SectionReferences (section_id, reference_id, display_order) SELECT ?1, reference_id, display_order FROM SectionReferences WHERE section_id = ?2", params![new_section, old_section]).map_err(|e| e.to_string())?;
    }
    tx.execute("INSERT INTO DocumentSimulationInstances (simulation_document_id, template_document_id, trainee_id) VALUES (?1, ?2, ?3)", params![simulation_document_id, template_document_id, trainee_id.trim()]).map_err(|e| e.to_string())?;
    tx.commit()
        .map_err(|e| format!("Failed to commit simulation clone: {}", e))?;
    Ok(SimulationDocumentInfo {
        simulation_document_id,
        template_document_id,
        trainee_id: trainee_id.trim().to_string(),
    })
}

pub fn get_simulation_document_info(
    document_id: String,
) -> Result<Option<SimulationDocumentInfo>, String> {
    let conn = get_content_connection().map_err(|e| e.to_string())?;
    conn.query_row("SELECT simulation_document_id, template_document_id, trainee_id FROM DocumentSimulationInstances WHERE simulation_document_id = ?1", params![document_id], |row| Ok(SimulationDocumentInfo { simulation_document_id: row.get(0)?, template_document_id: row.get(1)?, trainee_id: row.get(2)? })).optional().map_err(|e| e.to_string())
}

fn count_attachment_paths(raw: Option<String>) -> i64 {
    raw.and_then(|value| serde_json::from_str::<Vec<String>>(&value).ok())
        .map(|paths| paths.len() as i64)
        .unwrap_or(0)
}

/// Return only the currently existing simulation copies belonging to one Template.
/// The monotonic SIM counter is deliberately not used as an existing-copy count.
pub(crate) fn list_template_simulation_documents_with_conn(
    conn: &Connection,
    template_document_id: &str,
) -> Result<Vec<SimulationDocumentSummary>, String> {
    let template_exists: bool = conn
        .query_row(
            "SELECT EXISTS(
                SELECT 1 FROM Documents d
                WHERE d.id = ?1
                  AND NOT EXISTS(
                    SELECT 1 FROM DocumentSimulationInstances dsi
                    WHERE dsi.simulation_document_id = d.id
                  )
            )",
            params![template_document_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to validate Template: {e}"))?;
    if !template_exists {
        return Err("Template document not found".to_string());
    }

    let mut stmt = conn
        .prepare(
            "SELECT dsi.simulation_document_id,
                    dsi.template_document_id,
                    dsi.trainee_id,
                    COALESCE(dsi.created_at, d.created_at, ''),
                    MAX(
                        COALESCE((SELECT MAX(ua.updated_at) FROM UserAnswers ua WHERE ua.document_id = dsi.simulation_document_id), ''),
                        COALESCE((SELECT MAX(up.last_updated) FROM UserProgress up WHERE up.document_id = dsi.simulation_document_id), ''),
                        COALESCE(dsi.created_at, d.created_at, '')
                    ),
                    (SELECT COUNT(*) FROM UserAnswers ua
                     WHERE ua.document_id = dsi.simulation_document_id
                       AND COALESCE(TRIM(ua.answer_text), '') <> ''),
                    (SELECT COUNT(*) FROM UserAnswers ua
                     WHERE ua.document_id = dsi.simulation_document_id
                       AND (COALESCE(ua.status, 'pending') <> 'pending'
                            OR ua.assessed_at IS NOT NULL
                            OR ua.assessed_by IS NOT NULL
                            OR COALESCE(ua.feedback, '') <> '')),
                    (SELECT COUNT(*) FROM UserAnswers ua
                     WHERE ua.document_id = dsi.simulation_document_id AND ua.status = 'passed'),
                    (SELECT COUNT(*) FROM UserAnswers ua
                     WHERE ua.document_id = dsi.simulation_document_id AND ua.status = 'needs_improvement'),
                    (SELECT COUNT(*) FROM UserProgress up
                     WHERE up.document_id = dsi.simulation_document_id)
             FROM DocumentSimulationInstances dsi
             JOIN Documents d ON d.id = dsi.simulation_document_id
             WHERE dsi.template_document_id = ?1
             ORDER BY dsi.created_at DESC, dsi.simulation_document_id DESC",
        )
        .map_err(|e| format!("Failed to prepare simulation list: {e}"))?;

    let rows = stmt
        .query_map(params![template_document_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, i64>(5)?,
                row.get::<_, i64>(6)?,
                row.get::<_, i64>(7)?,
                row.get::<_, i64>(8)?,
                row.get::<_, i64>(9)?,
            ))
        })
        .map_err(|e| format!("Failed to read simulation list: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to decode simulation list: {e}"))?;
    drop(stmt);

    rows.into_iter()
        .map(
            |(
                simulation_document_id,
                template_document_id,
                trainee_id,
                created_at,
                latest_activity_at,
                answered_count,
                assessed_count,
                passed_count,
                needs_improvement_count,
                progress_record_count,
            )| {
                let mut attachment_stmt = conn
                    .prepare(
                        "SELECT attachments FROM UserAnswers
                         WHERE document_id = ?1 AND attachments IS NOT NULL",
                    )
                    .map_err(|e| format!("Failed to prepare attachment summary: {e}"))?;
                let attachment_count = attachment_stmt
                    .query_map(params![&simulation_document_id], |row| {
                        row.get::<_, String>(0)
                    })
                    .map_err(|e| format!("Failed to read attachment summary: {e}"))?
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(|e| format!("Failed to decode attachment summary: {e}"))?
                    .into_iter()
                    .map(|raw| count_attachment_paths(Some(raw)))
                    .sum();

                Ok(SimulationDocumentSummary {
                    attachment_directory: format!(
                        "data/{simulation_document_id}/trainee-attachments"
                    ),
                    simulation_document_id,
                    template_document_id,
                    trainee_id,
                    created_at,
                    latest_activity_at,
                    answered_count,
                    assessed_count,
                    passed_count,
                    needs_improvement_count,
                    attachment_count,
                    progress_record_count,
                })
            },
        )
        .collect()
}

pub fn list_template_simulation_documents(
    template_document_id: String,
) -> Result<Vec<SimulationDocumentSummary>, String> {
    let conn = get_content_connection().map_err(|e| e.to_string())?;
    list_template_simulation_documents_with_conn(&conn, &template_document_id)
}

/// Clear trainee work only when the target is an issued simulation document.
/// This is the backend authority behind the simulation-only Clear menu.
pub fn clear_simulation_document_answers(
    document_id: String,
) -> Result<ClearAnswersResult, String> {
    let mut conn = get_content_connection().map_err(|e| e.to_string())?;
    let data_dir = get_portable_data_dir().ok();
    clear_simulation_document_answers_with_conn_and_data_dir(
        &mut conn,
        &document_id,
        data_dir.as_deref(),
    )
}

pub(crate) fn clear_simulation_document_answers_with_conn_and_data_dir(
    conn: &mut Connection,
    document_id: &str,
    data_dir: Option<&Path>,
) -> Result<ClearAnswersResult, String> {
    let is_simulation: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM DocumentSimulationInstances WHERE simulation_document_id = ?1)",
            params![document_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    if !is_simulation {
        return Err("Clear Answers is available only for a simulation document".to_string());
    }
    super::answers::clear_document_trainee_answers_with_conn(conn, document_id, data_dir)
}

/// Delete a simulation document only. This prevents a simulation UI action from
/// being used to remove its source Template or another normal document.
pub fn delete_simulation_document(document_id: String) -> Result<String, String> {
    let conn = get_content_connection().map_err(|e| e.to_string())?;
    let is_simulation: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM DocumentSimulationInstances WHERE simulation_document_id = ?1)",
            params![document_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    if !is_simulation {
        return Err("Only a simulation document can be deleted from this action".to_string());
    }
    drop(conn);
    delete_document(document_id)
}

/// Generate new Document ID
pub(crate) fn generate_document_id_with_conn(
    conn: &Connection,
    unit_code: &str,
    doc_type: &str,
    user_level: &str,
) -> SqlResult<String> {
    let prefix = format!("{}{}{}", unit_code, doc_type, user_level);

    let mut stmt = conn.prepare("SELECT MAX(sequence) FROM Documents WHERE id LIKE ?1")?;

    let max_seq: Option<i32> = stmt
        .query_row(params![format!("{}%", prefix)], |row| row.get(0))
        .unwrap_or(None);

    let next_seq = max_seq.unwrap_or(0) + 1;
    let new_id = format!("{}{:03}", prefix, next_seq);

    Ok(new_id)
}

pub fn generate_document_id(
    unit_code: &str,
    doc_type: &str,
    user_level: &str,
) -> Result<String, String> {
    let conn = get_content_connection()?;

    generate_document_id_with_conn(&conn, unit_code, doc_type, user_level)
        .map_err(|e| format!("Failed to generate document id: {}", e))
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

#[derive(Debug)]
struct PreservedReferenceFile {
    old_relative_path: String,
    new_relative_path: String,
    copied_path: PathBuf,
}

fn validate_document_path_segment(id: &str) -> Result<(), String> {
    if id.is_empty() || id == "." || id == ".." || id.contains(['/', '\\']) {
        return Err(format!(
            "Invalid document ID for filesystem cleanup: {}",
            id
        ));
    }
    Ok(())
}

fn managed_reference_tail(relative_path: &str, document_id: &str) -> Option<String> {
    let normalized = relative_path.replace('\\', "/");
    let prefix = format!("data/{}/references/", document_id);
    let tail = normalized.strip_prefix(&prefix)?;

    if tail.is_empty()
        || tail
            .split('/')
            .any(|part| part.is_empty() || part == "." || part == ".." || part.contains(':'))
    {
        return None;
    }

    Some(tail.to_string())
}

fn absolute_managed_path(data_dir: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let normalized = relative_path.replace('\\', "/");
    let suffix = normalized.strip_prefix("data/").ok_or_else(|| {
        format!(
            "Reference path is not managed by the application: {}",
            relative_path
        )
    })?;

    let mut absolute = data_dir.to_path_buf();
    for part in suffix.split('/') {
        if part.is_empty() || part == "." || part == ".." || part.contains(':') {
            return Err(format!("Unsafe managed reference path: {}", relative_path));
        }
        absolute.push(part);
    }

    Ok(absolute)
}

fn common_reference_destination(
    data_dir: &Path,
    tail: &str,
    occupied_paths: &mut HashSet<String>,
) -> Result<(String, PathBuf), String> {
    let tail_path = Path::new(tail);
    let file_stem = tail_path
        .file_stem()
        .and_then(|value| value.to_str())
        .ok_or_else(|| format!("Invalid reference file name: {}", tail))?;
    let extension = tail_path.extension().and_then(|value| value.to_str());
    let parent = tail_path.parent().and_then(|value| value.to_str());

    for collision_index in 0..=10_000 {
        let file_name = if collision_index == 0 {
            tail_path
                .file_name()
                .and_then(|value| value.to_str())
                .ok_or_else(|| format!("Invalid reference file name: {}", tail))?
                .to_string()
        } else if let Some(extension) = extension {
            format!("{}_{}.{}", file_stem, collision_index, extension)
        } else {
            format!("{}_{}", file_stem, collision_index)
        };

        let destination_tail = match parent {
            Some(parent) if !parent.is_empty() => {
                format!("{}/{}", parent.replace('\\', "/"), file_name)
            }
            _ => file_name,
        };
        let relative_path = format!("data/COMMON/references/{}", destination_tail);
        let absolute_path = absolute_managed_path(data_dir, &relative_path)?;

        if !occupied_paths.contains(&relative_path) && !absolute_path.exists() {
            occupied_paths.insert(relative_path.clone());
            return Ok((relative_path, absolute_path));
        }
    }

    Err(format!(
        "Unable to allocate a safe COMMON path for reference file: {}",
        tail
    ))
}

fn cleanup_preserved_copies(files: &[PreservedReferenceFile]) {
    for file in files {
        if let Err(error) = std::fs::remove_file(&file.copied_path) {
            if error.kind() != std::io::ErrorKind::NotFound {
                logger::warn(format!(
                    "Failed to clean up copied reference file {}: {}",
                    file.copied_path.display(),
                    error
                ));
            }
        }
    }
}

fn preserve_document_reference_files(
    conn: &Connection,
    document_id: &str,
    data_dir: &Path,
) -> Result<Vec<PreservedReferenceFile>, String> {
    let all_paths = {
        let mut statement = conn
            .prepare(
                "SELECT DISTINCT file_path FROM DocumentReferences WHERE file_path IS NOT NULL",
            )
            .map_err(|error| format!("Failed to inspect reference file ownership: {}", error))?;

        let paths = statement
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|error| format!("Failed to read reference file ownership: {}", error))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("Failed to collect reference file ownership: {}", error))?;
        paths
    };

    let mut occupied_paths: HashSet<String> = all_paths
        .iter()
        .map(|path| path.replace('\\', "/"))
        .collect();
    let mut copied_files = Vec::new();

    for old_relative_path in all_paths {
        let Some(tail) = managed_reference_tail(&old_relative_path, document_id) else {
            continue;
        };
        let source_path = match absolute_managed_path(data_dir, &old_relative_path) {
            Ok(path) => path,
            Err(error) => {
                cleanup_preserved_copies(&copied_files);
                return Err(error);
            }
        };

        if !source_path.is_file() {
            cleanup_preserved_copies(&copied_files);
            return Err(format!(
                "Cannot delete document {} because managed reference file is missing: {}",
                document_id, old_relative_path
            ));
        }

        let (new_relative_path, copied_path) =
            match common_reference_destination(data_dir, &tail, &mut occupied_paths) {
                Ok(destination) => destination,
                Err(error) => {
                    cleanup_preserved_copies(&copied_files);
                    return Err(error);
                }
            };
        if let Some(parent) = copied_path.parent() {
            if let Err(error) = std::fs::create_dir_all(parent) {
                cleanup_preserved_copies(&copied_files);
                return Err(format!(
                    "Failed to create COMMON reference directory {}: {}",
                    parent.display(),
                    error
                ));
            }
        }

        let expected_size = match source_path.metadata() {
            Ok(metadata) => metadata.len(),
            Err(error) => {
                cleanup_preserved_copies(&copied_files);
                return Err(format!(
                    "Failed to inspect reference file {}: {}",
                    source_path.display(),
                    error
                ));
            }
        };
        let copied_size = match std::fs::copy(&source_path, &copied_path) {
            Ok(size) => size,
            Err(error) => {
                let _ = std::fs::remove_file(&copied_path);
                cleanup_preserved_copies(&copied_files);
                return Err(format!(
                    "Failed to preserve reference file {}: {}",
                    source_path.display(),
                    error
                ));
            }
        };

        if copied_size != expected_size {
            let _ = std::fs::remove_file(&copied_path);
            cleanup_preserved_copies(&copied_files);
            return Err(format!(
                "Reference copy size mismatch for {}",
                source_path.display()
            ));
        }

        copied_files.push(PreservedReferenceFile {
            old_relative_path,
            new_relative_path,
            copied_path,
        });
    }

    Ok(copied_files)
}

pub(crate) fn delete_document_with_conn_and_data_dir(
    conn: &mut Connection,
    id: &str,
    data_dir: &Path,
) -> Result<String, String> {
    if PROTECTED_DOCUMENT_IDS.contains(&id) {
        return Err(format!(
            "เอกสาร {} เป็นเอกสารตัวอย่างที่ติดมากับแอปพลิเคชัน ไม่อนุญาตให้ลบ",
            id
        ));
    }
    validate_document_path_segment(id)?;

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

    let preserved_files = preserve_document_reference_files(conn, id, data_dir)?;
    let database_result = (|| -> Result<(), String> {
        let transaction = conn
            .transaction()
            .map_err(|error| format!("Failed to start document deletion: {}", error))?;

        for file in &preserved_files {
            transaction
                .execute(
                    "UPDATE DocumentReferences SET file_path = ?1, updated_at = CURRENT_TIMESTAMP WHERE file_path = ?2",
                    params![file.new_relative_path, file.old_relative_path],
                )
                .map_err(|error| format!("Failed to transfer reference file ownership: {}", error))?;
        }

        transaction
            .execute("DELETE FROM Documents WHERE id = ?1", params![id])
            .map_err(|error| format!("Failed to delete document: {}", error))?;
        transaction
            .commit()
            .map_err(|error| format!("Failed to commit document deletion: {}", error))?;
        Ok(())
    })();

    if let Err(error) = database_result {
        cleanup_preserved_copies(&preserved_files);
        return Err(error);
    }

    let doc_folder = data_dir.join(id);
    if doc_folder.exists() && doc_folder.is_dir() {
        if let Err(error) = std::fs::remove_dir_all(&doc_folder) {
            logger::warn(format!(
                "Document {} deleted from DB, but failed to remove data folder {:?}: {}",
                id, doc_folder, error
            ));
        } else {
            logger::info(format!(
                "Document {} data folder cleaned up after preserving {} reference file(s): {:?}",
                id,
                preserved_files.len(),
                doc_folder
            ));
        }
    }

    Ok(format!("Document {} deleted successfully", id))
}

/// Delete a document by ID.
///
/// This performs a full cleanup:
/// 1. Copies global reference files owned by the document folder to
///    `data/COMMON/references/` and updates their master paths.
/// 2. Deletes the document row from `Documents` (CASCADE handles child tables:
///    Sections, Questions, QuestionChoices, QuestionReferences, SectionReferences,
///    QuestionSectionLinks, UserAnswers, UserProgress).
/// 3. Removes the document's data folder on disk (`data/{doc_id}/`) which may
///    contain `question-images/`, `references/`, and `trainee-attachments/`.
pub fn delete_document(id: String) -> Result<String, String> {
    let mut conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    let data_dir = get_portable_data_dir()
        .map_err(|error| format!("Failed to resolve portable data directory: {}", error))?;

    delete_document_with_conn_and_data_dir(&mut conn, &id, &data_dir)
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
    let mut conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

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
