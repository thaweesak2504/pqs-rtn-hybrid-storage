use crate::content_database::documents::clone_document_for_simulation_with_conn;
use crate::content_database::schema::initialize_question_tables;
use crate::content_database::scoring::compute_section_progress;
use crate::test_helpers::helpers::{create_test_db, init_content_schema};
use rusqlite::{params, types::Value, Connection};
use serde_json::json;
use std::collections::BTreeMap;

// Real clone code + foreign keys, on an isolated in-memory database only.
fn fixture() -> Connection {
    let conn = create_test_db();
    init_content_schema(&conn).unwrap();
    conn.execute(
        "ALTER TABLE Documents ADD COLUMN is_template BOOLEAN DEFAULT 0",
        [],
    )
    .unwrap();
    initialize_question_tables(&conn).unwrap();
    conn.execute_batch(
        "INSERT INTO Documents (id, name, applied_to) VALUES ('SOURCE', 'Source', 'Original application');
         INSERT INTO Documents (id, name) VALUES ('OTHER', 'Unrelated source');",
    ).unwrap();
    for (id, number, group) in [
        (11, 101, 100),
        (22, 201, 200),
        (33, 301, 300),
        (44, 302, 300),
        (55, 304, 300),
    ] {
        conn.execute(
            "INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, display_order)
             VALUES (?1, 'SOURCE', ?2, ?3, 'Section', 'Section', ?3)",
            params![id, group, number],
        ).unwrap();
    }
    conn.execute_batch(
        "INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, display_order)
         VALUES (99, 'OTHER', 200, 201, 'Other 201', 'Other', 1);
         INSERT INTO Questions (id, document_id, section_id, sequence, content, metadata)
         VALUES ('KNOWLEDGE', 'SOURCE', 22, 1, 'Question 201', '{\"selectedSubQuestions\":[\"ก\"],\"custom\":true}');
         INSERT INTO QuestionAnswerKeys (question_id, sub_question_code, answer_key_text)
         VALUES ('KNOWLEDGE', '', '<p>Answer key</p>');
         INSERT INTO UserAnswers (user_id, question_id, document_id, sub_question_code, answer_text, status, assessed_by, attachments)
         VALUES ('T-001', 'KNOWLEDGE', 'SOURCE', '', 'Existing source answer', 'passed', 'Q-001', '[\"data/SOURCE/trainee-attachments/evidence.pdf\"]');
         INSERT INTO UserProgress (user_id, document_id, section_id) VALUES ('T-001', 'SOURCE', 22);",
    ).unwrap();
    for (id, section) in [("P301", 33), ("P302", 44), ("P304", 55)] {
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, sequence, content, is_group_header, group_score)
             VALUES (?1, 'SOURCE', ?2, 1, ?1, 1, 10)", params![id, section],
        ).unwrap();
    }
    // Shared 201 + 100/300 references; number != database primary key.
    for (id, section, parent, sequence, target, number) in [
        ("R101", 33, "P301", 1, 11, 101),
        ("R201A", 33, "P301", 2, 22, 201),
        ("R201B", 44, "P302", 1, 22, 201),
        ("R301", 55, "P304", 1, 33, 301),
        ("R302", 55, "P304", 2, 44, 302),
    ] {
        let metadata = json!({"refSectionId": target, "refSectionNumber": number,
            "custom": {"keep": [1, "ก"]}})
        .to_string();
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, question_type, is_scored, score, metadata)
             VALUES (?1, 'SOURCE', ?2, ?3, ?4, ?1, 'section_ref', 1, 5, ?5)",
            params![id, section, parent, sequence, metadata],
        ).unwrap();
    }
    conn.execute("INSERT INTO QuestionSectionLinks (question_id, section_id, score, display_order) VALUES ('P301', 22, 5, 1)", []).unwrap();
    conn
}

fn clone_source(conn: &mut Connection) -> String {
    clone_document_for_simulation_with_conn(conn, "SOURCE".into(), "T-001".into())
        .unwrap()
        .simulation_document_id
}

fn section_id(conn: &Connection, doc: &str, number: i32) -> i64 {
    conn.query_row(
        "SELECT id FROM Sections WHERE document_id = ?1 AND section_number = ?2",
        params![doc, number],
        |row| row.get(0),
    )
    .unwrap()
}

fn question_id(conn: &Connection, doc: &str, content: &str) -> String {
    conn.query_row(
        "SELECT id FROM Questions WHERE document_id = ?1 AND content = ?2",
        params![doc, content],
        |row| row.get(0),
    )
    .unwrap()
}

// Snapshot all clone-owned tables, including counters and existing trainee work.
// Fixed internal table names, never identifiers supplied by a caller.
fn snapshot(conn: &Connection) -> BTreeMap<String, Vec<Vec<Value>>> {
    [
        "Documents",
        "Sections",
        "Questions",
        "QuestionAnswerKeys",
        "QuestionChoices",
        "QuestionReferences",
        "QuestionSubQuestionLinks",
        "QuestionSectionLinks",
        "SectionReferences",
        "DocumentSimulationInstances",
        "TemplateSimulationCounters",
        "UserAnswers",
        "UserProgress",
    ]
    .iter()
    .map(|table| {
        let mut stmt = conn
            .prepare(&format!("SELECT * FROM {table} ORDER BY rowid"))
            .unwrap();
        let count = stmt.column_count();
        let rows = stmt
            .query_map([], |row| {
                (0..count).map(|i| row.get::<_, Value>(i)).collect()
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        (table.to_string(), rows)
    })
    .collect()
}

#[test]
fn simulation_clone_remaps_shared_and_nested_references_and_preserves_content() {
    let mut conn = fixture();
    let first = clone_source(&mut conn);
    let second = clone_source(&mut conn);
    assert_eq!(first, "SOURCE-SIM-001");
    assert_eq!(second, "SOURCE-SIM-002");
    for doc in [&first, &second] {
        for (content, number, parent) in [
            ("R101", 101, "P301"),
            ("R201A", 201, "P301"),
            ("R201B", 201, "P302"),
            ("R301", 301, "P304"),
            ("R302", 302, "P304"),
        ] {
            let (id, raw, parent_id, score, sequence): (String, String, String, i32, i32) = conn.query_row(
                "SELECT id, metadata, parent_id, score, sequence FROM Questions WHERE document_id = ?1 AND content = ?2",
                params![doc, content], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
            ).unwrap();
            assert_ne!(id, content);
            let target = section_id(&conn, doc, number);
            assert_ne!(target, section_id(&conn, "SOURCE", number));
            assert_ne!(
                target,
                section_id(&conn, if doc == &first { &second } else { &first }, number)
            );
            let source_raw: String = conn
                .query_row(
                    "SELECT metadata FROM Questions WHERE id = ?1",
                    [content],
                    |row| row.get(0),
                )
                .unwrap();
            let mut expected: serde_json::Value = serde_json::from_str(&source_raw).unwrap();
            expected["refSectionId"] = json!(target);
            assert_eq!(
                serde_json::from_str::<serde_json::Value>(&raw).unwrap(),
                expected
            );
            assert_eq!(parent_id, question_id(&conn, doc, parent));
            assert_eq!(score, 5);
            assert_eq!(
                sequence,
                if content == "R201A" || content == "R302" {
                    2
                } else {
                    1
                }
            );
        }
        let copied_question = question_id(&conn, doc, "Question 201");
        let metadata: String = conn
            .query_row(
                "SELECT metadata FROM Questions WHERE id = ?1",
                [&copied_question],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(
            metadata,
            "{\"selectedSubQuestions\":[\"ก\"],\"custom\":true}"
        );
        let key: String = conn
            .query_row(
                "SELECT answer_key_text FROM QuestionAnswerKeys WHERE question_id = ?1",
                [&copied_question],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(key, "<p>Answer key</p>");
        let (linked_id, score, order): (i64, i32, i32) = conn.query_row(
            "SELECT section_id, score, display_order FROM QuestionSectionLinks WHERE question_id = ?1",
            [question_id(&conn, doc, "P301")], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        ).unwrap();
        assert_eq!(
            (linked_id, score, order),
            (section_id(&conn, doc, 201), 5, 1)
        );
        for table in ["UserAnswers", "UserProgress"] {
            let count: i64 = conn
                .query_row(
                    &format!("SELECT COUNT(*) FROM {table} WHERE document_id = ?1"),
                    [doc],
                    |row| row.get(0),
                )
                .unwrap();
            assert_eq!(count, 0, "Trainee work must not be cloned");
        }
    }
    let source_link: i64 = conn
        .query_row(
            "SELECT json_extract(metadata, '$.refSectionId') FROM Questions WHERE id = 'R201A'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(source_link, 22);
    let source_answer: String = conn
        .query_row(
            "SELECT answer_text FROM UserAnswers WHERE document_id = 'SOURCE'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(source_answer, "Existing source answer");

    // Reading a cloned requirement uses this copy's 201, not the passed Source
    // and not a different copy. This tests the actual scoring reader, not just IDs.
    let target = section_id(&conn, &first, 201);
    assert!(
        !compute_section_progress(&conn, "T-001", &first, target)
            .unwrap()
            .is_passed
    );
    conn.execute("INSERT INTO UserAnswers (user_id, question_id, document_id, sub_question_code, answer_text, status)
        VALUES ('T-001', ?1, ?2, '', 'New copy answer', 'passed')",
        params![question_id(&conn, &first, "Question 201"), first]).unwrap();
    assert!(
        compute_section_progress(&conn, "T-001", &first, target)
            .unwrap()
            .is_passed
    );
    assert!(
        !compute_section_progress(&conn, "T-001", &second, section_id(&conn, &second, 201))
            .unwrap()
            .is_passed
    );
    assert!(
        compute_section_progress(&conn, "T-001", "SOURCE", 22)
            .unwrap()
            .is_passed
    );
    let violations: i64 = conn
        .query_row("SELECT COUNT(*) FROM pragma_foreign_key_check", [], |row| {
            row.get(0)
        })
        .unwrap();
    assert_eq!(violations, 0);
}

#[test]
fn simulation_clone_preserves_existing_source_and_simulation_work() {
    let mut conn = fixture();
    let first = clone_source(&mut conn);
    conn.execute("INSERT INTO UserAnswers (user_id, question_id, document_id, sub_question_code, answer_text, status, feedback, attachments)
        VALUES ('T-001', ?1, ?2, '', 'Keep this answer', 'needs_improvement', 'Keep feedback', '[\"data/existing.pdf\"]')",
        params![question_id(&conn, &first, "Question 201"), first]).unwrap();
    conn.execute(
        "INSERT INTO UserProgress (user_id, document_id, section_id) VALUES ('T-001', ?1, ?2)",
        params![first, section_id(&conn, &first, 201)],
    )
    .unwrap();
    let before = snapshot(&conn);
    clone_source(&mut conn);
    let after = snapshot(&conn);
    for (table, old_rows) in &before {
        if table != "TemplateSimulationCounters" {
            // Only the source's SIM counter may update an existing row.
            assert!(
                after[table].starts_with(old_rows),
                "Existing rows changed in {table}"
            );
        }
    }
    assert_eq!(
        before["UserAnswers"], after["UserAnswers"],
        "Answers/assessments/attachment paths must remain untouched"
    );
    assert_eq!(
        before["UserProgress"], after["UserProgress"],
        "Progress must remain untouched"
    );
}

#[test]
fn simulation_clone_rejects_invalid_metadata_and_rolls_back_entire_copy() {
    for metadata in [
        None,
        Some(""),
        Some("not-json"),
        Some("null"),
        Some("[]"),
        Some("{}"),
        Some("{\"refSectionId\":null}"),
        Some("{\"refSectionId\":\"22\"}"),
        Some("{\"refSectionId\":0}"),
        Some("{\"refSectionId\":-1}"),
        Some("{\"refSectionId\":22.5}"),
        Some("{\"refSectionId\":999}"),
        Some("{\"refSectionId\":99}"),
    ] {
        let mut conn = fixture();
        clone_source(&mut conn); // Existing valid copy and counter must survive.
        conn.execute(
            "UPDATE Questions SET metadata = ?1 WHERE id = 'R201B'",
            [metadata],
        )
        .unwrap();
        let before = snapshot(&conn);
        let error =
            clone_document_for_simulation_with_conn(&mut conn, "SOURCE".into(), "T-001".into())
                .err()
                .expect("Invalid metadata must reject the clone");
        assert!(error.contains("R201B"), "{error}");
        assert_eq!(
            snapshot(&conn),
            before,
            "Failed clone must roll back: {metadata:?}"
        );
    }
}

#[test]
fn simulation_clone_rejects_cross_document_relational_link_without_partial_copy() {
    let mut conn = fixture();
    conn.execute("UPDATE QuestionSectionLinks SET section_id = 99", [])
        .unwrap();
    let before = snapshot(&conn);
    let error = clone_document_for_simulation_with_conn(&mut conn, "SOURCE".into(), "T-001".into())
        .err()
        .expect("Cross-document link must reject the clone");
    assert!(error.contains("P301") && error.contains("outside the source document"));
    assert_eq!(snapshot(&conn), before);
}
