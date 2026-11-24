use crate::content_database::schema::initialize_question_tables;
use crate::content_database::section_links::{
    add_section_ref_child_with_conn, batch_add_section_ref_children_with_conn,
    get_section_ref_children_inner, remove_all_section_ref_children_with_conn,
    remove_section_ref_child_with_conn,
};
use crate::content_database::types::BatchSectionItem;
use crate::content_database::{AddSectionRefChildArgs, BatchAddSectionRefChildrenArgs};
use crate::test_helpers::helpers::init_content_schema;
use rusqlite::{params, types::Value, Connection};
use std::collections::BTreeMap;

fn fixture(conn: &Connection) {
    init_content_schema(conn).unwrap();
    initialize_question_tables(conn).unwrap();
    conn.execute_batch("INSERT INTO Documents (id, name) VALUES ('DOC', 'Test'), ('OTHER', 'Other'), ('SIM', 'Existing simulation');").unwrap();
    for (id, number) in [
        (1, 101),
        (2, 102),
        (12, 201),
        (123, 202),
        (4, 204),
        (5, 205),
        (6, 206),
        (31, 301),
        (32, 302),
        (33, 303),
        (900, 304),
    ] {
        conn.execute("INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, display_order)
            VALUES (?1, 'DOC', ?2, ?3, 'Section', 'Section', ?3)", params![id, number / 100 * 100, number]).unwrap();
    }
    conn.execute_batch("INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, display_order)
        VALUES (999, 'OTHER', 200, 201, 'Other', 'Other', 1), (1000, 'SIM', 300, 304, 'Sim', 'Sim', 1);
        INSERT INTO Questions (id, document_id, section_id, sequence, content, is_group_header)
        VALUES ('ROOT', 'DOC', 900, 1, 'Prerequisites', 1), ('SIM-PARENT', 'SIM', 1000, 1, 'Existing', 1);
        INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header)
        VALUES ('PARENT', 'DOC', 900, 'ROOT', 5, 'Requirements', 1), ('SIBLING', 'DOC', 900, 'ROOT', 4, 'Other requirements', 1);
        INSERT INTO Questions (id, document_id, section_id, sequence, content) VALUES ('ANSWER', 'DOC', 12, 1, 'Keep answer');
        INSERT INTO QuestionAnswerKeys (question_id, sub_question_code, answer_key_text) VALUES ('ANSWER', '', 'Keep key');
        INSERT INTO UserAnswers (user_id, question_id, document_id, sub_question_code, answer_text, status, attachments)
        VALUES ('T-001', 'ANSWER', 'DOC', '', 'Existing answer', 'passed', '[\"data/DOC/trainee-attachments/a.pdf\"]');
        INSERT INTO UserProgress (user_id, document_id, section_id) VALUES ('T-001', 'DOC', 12);").unwrap();
}

fn new_db() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    fixture(&conn);
    conn
}

fn args(conn: &Connection, number: i32, score: i32) -> AddSectionRefChildArgs {
    let id = conn
        .query_row(
            "SELECT id FROM Sections WHERE document_id = 'DOC' AND section_number = ?1",
            [number],
            |row| row.get(0),
        )
        .unwrap();
    AddSectionRefChildArgs {
        parent_id: "PARENT".into(),
        document_id: "DOC".into(),
        section_id: 900,
        linked_section_id: id,
        linked_section_number: number,
        linked_section_title: format!("Title {number}"),
        score: Some(score),
    }
}

fn add(conn: &mut Connection, number: i32, score: i32) -> String {
    let input = args(conn, number, score);
    add_section_ref_child_with_conn(conn, input).unwrap().id
}

fn batch(conn: &Connection, numbers: &[i32]) -> BatchAddSectionRefChildrenArgs {
    BatchAddSectionRefChildrenArgs {
        parent_id: "PARENT".into(),
        document_id: "DOC".into(),
        section_id: 900,
        sections: numbers
            .iter()
            .map(|number| {
                let item = args(conn, *number, 0);
                BatchSectionItem {
                    linked_section_id: item.linked_section_id,
                    linked_section_number: -1, // The DB number, not the caller's hint, controls ordering.
                    linked_section_title: item.linked_section_title,
                }
            })
            .collect(),
    }
}

fn assert_order(conn: &Connection, expected: &[i32]) {
    let rows = get_section_ref_children_inner(conn, "PARENT").unwrap();
    assert_eq!(
        rows.iter()
            .map(|row| row.ref_section_number)
            .collect::<Vec<_>>(),
        expected
    );
    assert_eq!(
        rows.iter().map(|row| row.sequence).collect::<Vec<_>>(),
        (1..=expected.len() as i32).collect::<Vec<_>>()
    );
    // The document-tree reader uses persisted sequence, not the picker state.
    let mut stmt = conn.prepare("SELECT json_extract(metadata, '$.refSectionNumber') FROM Questions WHERE parent_id = 'PARENT' ORDER BY sequence").unwrap();
    let stored = stmt
        .query_map([], |row| row.get::<_, i32>(0))
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap();
    assert_eq!(stored, expected);
}

fn snapshot(conn: &Connection) -> BTreeMap<String, Vec<Vec<Value>>> {
    [
        "Documents",
        "Sections",
        "Questions",
        "QuestionAnswerKeys",
        "UserAnswers",
        "UserProgress",
    ]
    .into_iter()
    .map(|table| {
        let mut stmt = conn
            .prepare(&format!("SELECT * FROM {table} ORDER BY rowid"))
            .unwrap();
        let columns = stmt.column_count();
        let rows = stmt
            .query_map([], |row| {
                (0..columns).map(|i| row.get::<_, Value>(i)).collect()
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        (table.into(), rows)
    })
    .collect()
}

fn total(conn: &Connection, id: &str) -> i32 {
    conn.query_row(
        "SELECT group_score FROM Questions WHERE id = ?1",
        [id],
        |row| row.get(0),
    )
    .unwrap()
}

#[test]
fn section_ref_order_survives_reopen_and_preserves_existing_rows_except_sequence() {
    let temp = tempfile::tempdir().unwrap();
    let path = temp.path().join("ordering.db");
    let mut conn = Connection::open(&path).unwrap();
    fixture(&conn);
    for number in [202, 204, 205, 206] {
        add(&mut conn, number, 5);
    }
    let before = get_section_ref_children_inner(&conn, "PARENT").unwrap();
    let work = snapshot(&conn);
    let input = args(&conn, 201, 0);
    let added = add_section_ref_child_with_conn(&mut conn, input).unwrap();
    assert_eq!(added.sequence, 1);
    assert_order(&conn, &[201, 202, 204, 205, 206]);
    let after = get_section_ref_children_inner(&conn, "PARENT").unwrap();
    for previous in before {
        let current = after.iter().find(|row| row.id == previous.id).unwrap();
        assert_eq!(
            (
                current.parent_id.as_str(),
                current.content.as_str(),
                current.score,
                current.ref_section_id,
                current.ref_section_number
            ),
            (
                previous.parent_id.as_str(),
                previous.content.as_str(),
                previous.score,
                previous.ref_section_id,
                previous.ref_section_number
            )
        );
    }
    assert_eq!(total(&conn, "PARENT"), 20);
    assert_eq!(total(&conn, "ROOT"), 20);
    let after_work = snapshot(&conn);
    for table in [
        "Documents",
        "QuestionAnswerKeys",
        "UserAnswers",
        "UserProgress",
    ] {
        assert_eq!(work[table], after_work[table]);
    }
    assert_eq!(total(&conn, "SIM-PARENT"), 0);
    assert_eq!(total(&conn, "SIBLING"), 0);
    drop(conn);
    let reopened = Connection::open(path).unwrap();
    assert_order(&reopened, &[201, 202, 204, 205, 206]);
}

#[test]
fn section_ref_batch_orders_all_groups_and_skips_exact_duplicates_and_self() {
    for (input, expected) in [
        (vec![102, 101, 102], vec![101, 102]),
        (
            vec![206, 202, 204, 201, 205, 201],
            vec![201, 202, 204, 205, 206],
        ),
        (vec![303, 302, 301, 304, 303], vec![301, 302, 303]),
    ] {
        let mut conn = new_db();
        let request = batch(&conn, &input);
        let result = batch_add_section_ref_children_with_conn(&mut conn, request).unwrap();
        assert_eq!(result.len(), expected.len());
        assert_order(&conn, &expected);
        let before = snapshot(&conn);
        let duplicate = args(&conn, expected[0], 100);
        assert!(add_section_ref_child_with_conn(&mut conn, duplicate).is_err());
        assert_eq!(snapshot(&conn), before);
    }
}

#[test]
fn section_ref_remove_readd_and_remove_all_keep_remaining_scores_and_other_parents() {
    let mut conn = new_db();
    for number in [206, 202, 204, 201] {
        add(&mut conn, number, 5);
    }
    let rows = get_section_ref_children_inner(&conn, "PARENT").unwrap();
    let removed = rows
        .iter()
        .find(|row| row.ref_section_number == 204)
        .unwrap();
    remove_section_ref_child_with_conn(&mut conn, &removed.id).unwrap();
    assert_order(&conn, &[201, 202, 206]);
    assert_eq!(total(&conn, "PARENT"), 15);
    let replacement = add(&mut conn, 204, 10);
    assert_ne!(replacement, removed.id);
    assert_order(&conn, &[201, 202, 204, 206]);
    assert_eq!(total(&conn, "ROOT"), 25);
    let remaining = get_section_ref_children_inner(&conn, "PARENT").unwrap();
    for row in rows.iter().filter(|row| row.id != removed.id) {
        let current = remaining.iter().find(|new| new.id == row.id).unwrap();
        assert_eq!(current.score, row.score);
    }
    let work = snapshot(&conn);
    remove_all_section_ref_children_with_conn(&mut conn, "PARENT").unwrap();
    assert_order(&conn, &[]);
    assert_eq!(total(&conn, "ROOT"), 0);
    let after = snapshot(&conn);
    for table in ["UserAnswers", "UserProgress", "QuestionAnswerKeys"] {
        assert_eq!(work[table], after[table]);
    }
    assert_eq!(total(&conn, "SIBLING"), 0);
}

#[test]
fn section_ref_ordering_failure_rolls_back_insert_delete_and_scores() {
    let mut conn = new_db();
    add(&mut conn, 202, 5);
    conn.execute_batch("CREATE TRIGGER fail_reorder BEFORE UPDATE OF sequence ON Questions
        WHEN OLD.question_type = 'section_ref' BEGIN SELECT RAISE(ABORT, 'test reorder failure'); END;").unwrap();
    let before = snapshot(&conn);
    let request = args(&conn, 201, 10);
    assert!(add_section_ref_child_with_conn(&mut conn, request)
        .unwrap_err()
        .contains("test reorder failure"));
    assert_eq!(snapshot(&conn), before);
    conn.execute_batch("DROP TRIGGER fail_reorder;").unwrap();
    add(&mut conn, 201, 10);
    // A failure while shifting the remaining child must restore the deleted child.
    conn.execute_batch(
        "CREATE TRIGGER fail_reorder BEFORE UPDATE OF sequence ON Questions
        BEGIN SELECT RAISE(ABORT, 'test reorder failure'); END;",
    )
    .unwrap();
    let before = snapshot(&conn);
    let first = get_section_ref_children_inner(&conn, "PARENT").unwrap()[0]
        .id
        .clone();
    assert!(remove_section_ref_child_with_conn(&mut conn, &first).is_err());
    assert_eq!(snapshot(&conn), before);
    conn.execute_batch(
        "DROP TRIGGER fail_reorder;
        CREATE TRIGGER fail_score BEFORE UPDATE OF group_score ON Questions
        BEGIN SELECT RAISE(ABORT, 'test score failure'); END;",
    )
    .unwrap();
    assert!(remove_all_section_ref_children_with_conn(&mut conn, "PARENT").is_err());
    assert_eq!(snapshot(&conn), before);
}

#[test]
fn section_ref_batch_invalid_target_and_wrong_parent_roll_back_without_partial_writes() {
    let mut conn = new_db();
    let before = snapshot(&conn);
    let mut request = batch(&conn, &[202, 201]);
    request.sections[1].linked_section_id = 999;
    assert!(batch_add_section_ref_children_with_conn(&mut conn, request).is_err());
    assert_eq!(snapshot(&conn), before);
    let mut request = args(&conn, 201, 5);
    request.parent_id = "SIM-PARENT".into();
    assert!(add_section_ref_child_with_conn(&mut conn, request).is_err());
    assert_eq!(snapshot(&conn), before);
}

#[test]
fn section_ref_ordering_uses_database_number_and_preserves_non_reference_siblings() {
    let mut conn = new_db();
    conn.execute_batch(
        "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content)
        VALUES ('NORMAL', 'DOC', 900, 'PARENT', 2, 'Unrelated item');",
    )
    .unwrap();
    add(&mut conn, 202, 5);
    let input = args(&conn, 201, 5);
    let mut input = input;
    input.linked_section_number = 9999;
    let new = add_section_ref_child_with_conn(&mut conn, input).unwrap();
    assert_eq!(new.ref_section_number, 201);
    let rows = get_section_ref_children_inner(&conn, "PARENT").unwrap();
    assert_eq!(
        rows.iter()
            .map(|r| (r.ref_section_number, r.sequence))
            .collect::<Vec<_>>(),
        vec![(201, 1), (202, 3)]
    );
    let original: (i32, String) = conn
        .query_row(
            "SELECT sequence,content FROM Questions WHERE id = 'NORMAL'",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap();
    assert_eq!(original, (2, "Unrelated item".into()));
}

#[test]
fn section_ref_reorders_legacy_sequences_without_rewriting_metadata_or_other_parents() {
    let mut conn = new_db();
    let second = add(&mut conn, 202, 5);
    let first = add(&mut conn, 201, 10);
    // Simulate insertion-order data and a stale display-number cache.
    conn.execute("UPDATE Questions SET sequence = 1, metadata = json_set(metadata, '$.refSectionNumber', 100, '$.custom', 'keep') WHERE id = ?1", [&second]).unwrap();
    conn.execute("UPDATE Questions SET sequence = 2 WHERE id = ?1", [&first])
        .unwrap();
    conn.execute_batch("INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, question_type, metadata, score, is_scored)
        VALUES ('OTHER-REF', 'DOC', 900, 'SIBLING', 9, 'Untouched', 'section_ref', '{\"refSectionId\":123,\"refSectionNumber\":202}', 7, 1);").unwrap();
    let metadata: String = conn
        .query_row(
            "SELECT metadata FROM Questions WHERE id = ?1",
            [&second],
            |row| row.get(0),
        )
        .unwrap();
    // A Select All request containing only existing entries still normalizes this parent.
    let request = batch(&conn, &[202, 201]);
    batch_add_section_ref_children_with_conn(&mut conn, request).unwrap();
    let rows = get_section_ref_children_inner(&conn, "PARENT").unwrap();
    assert_eq!(
        rows.iter()
            .map(|row| (&row.id, row.sequence, row.score))
            .collect::<Vec<_>>(),
        vec![(&first, 1, 10), (&second, 2, 5)]
    );
    let after: String = conn
        .query_row(
            "SELECT metadata FROM Questions WHERE id = ?1",
            [&second],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(metadata, after);
    let untouched: i32 = conn
        .query_row(
            "SELECT sequence FROM Questions WHERE id = 'OTHER-REF'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(untouched, 9);
    assert_eq!(total(&conn, "PARENT"), 15);
}

#[test]
fn section_ref_invalid_existing_link_aborts_ordering_without_losing_new_or_old_work() {
    let mut conn = new_db();
    let existing = add(&mut conn, 202, 5);
    conn.execute(
        "UPDATE Questions SET metadata = 'invalid' WHERE id = ?1",
        [&existing],
    )
    .unwrap();
    let before = snapshot(&conn);
    let request = args(&conn, 201, 10);
    assert!(add_section_ref_child_with_conn(&mut conn, request).is_err());
    assert_eq!(snapshot(&conn), before);
}
