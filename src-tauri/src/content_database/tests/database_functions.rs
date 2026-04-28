use super::*;

#[test]
fn test_generate_document_id_format() {
    let conn = create_test_db();

    conn.execute(
        "CREATE TABLE IF NOT EXISTS Documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            unit_code TEXT NOT NULL,
            doc_type TEXT NOT NULL,
            user_level TEXT NOT NULL,
            sequence INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )
    .expect("Failed to create Documents table");

    let unit_code = "RTN01";
    let doc_type = "PQ";
    let user_level = "A";

    let id = generate_document_id_with_conn(&conn, unit_code, doc_type, user_level)
        .expect("Should generate document id from empty table");

    assert_eq!(id, "RTN01PQA001");
}

#[test]
fn test_generate_document_id_sequence() {
    let conn = create_test_db();

    conn.execute(
        "CREATE TABLE IF NOT EXISTS Documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            unit_code TEXT NOT NULL,
            doc_type TEXT NOT NULL,
            user_level TEXT NOT NULL,
            sequence INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )
    .expect("Failed to create Documents table");

    let unit_code = "TEST1";
    let doc_type = "AB";
    let user_level = "B";

    for i in 1..=5 {
        let id = format!("{}{}{}{:03}", unit_code, doc_type, user_level, i);
        conn.execute(
            "INSERT INTO Documents (id, title, unit_code, doc_type, user_level, sequence, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'), datetime('now'))",
            params![id, format!("Test Doc {}", i), unit_code, doc_type, user_level, i],
        )
        .expect("Failed to insert test document");
    }

    // Verify all documents were inserted
    let count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM Documents WHERE unit_code = ?1 AND doc_type = ?2 AND user_level = ?3",
            params![unit_code, doc_type, user_level],
            |row| row.get(0),
        )
        .expect("Failed to count documents");

    assert_eq!(count, 5, "Should have 5 test documents");

    let next_id = generate_document_id_with_conn(&conn, unit_code, doc_type, user_level)
        .expect("Should generate next sequence id");

    assert_eq!(next_id, "TEST1ABB006");
}

#[test]
fn test_generate_document_id_uniqueness() {
    let conn = create_test_db();

    conn.execute(
        "CREATE TABLE IF NOT EXISTS Documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            unit_code TEXT NOT NULL,
            doc_type TEXT NOT NULL,
            user_level TEXT NOT NULL,
            sequence INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )
    .expect("Failed to create Documents table");

    // Insert two documents with same prefix but different sequences
    let ids = vec!["UNIT1XYZ001", "UNIT1XYZ002"];

    for id in &ids {
        conn.execute(
            "INSERT INTO Documents (id, title, unit_code, doc_type, user_level, sequence, created_at, updated_at)
             VALUES (?1, 'Test', 'UNIT1', 'XY', 'Z', ?2, datetime('now'), datetime('now'))",
            params![id, &id[8..11]],
        )
        .expect("Failed to insert document");
    }

    let next_same_prefix = generate_document_id_with_conn(&conn, "UNIT1", "XY", "Z")
        .expect("Should increment existing prefix");
    let first_other_prefix = generate_document_id_with_conn(&conn, "UNIT1", "XY", "Q")
        .expect("Different prefix should start from sequence 001");

    assert_eq!(next_same_prefix, "UNIT1XYZ003");
    assert_eq!(first_other_prefix, "UNIT1XYQ001");
}

// ========================================================================

