use super::*;

#[test]
fn test_seed_section_300_creates_correct_structure() {
    let conn = create_test_db();
    init_content_schema(&conn).expect("Failed to init schema");

    // Create test document
    let doc_id = "22724201001";
    conn.execute(
        "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
         VALUES (?, 'Test Doc', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
        [doc_id],
    ).expect("Failed to create document");

    // Create test section
    conn.execute(
        "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, is_system_defined)
         VALUES (?, 300, 301, 'Section 301', '301', 1)",
        [doc_id],
    ).expect("Failed to create section");

    let section_id: i64 = conn
        .query_row(
            "SELECT id FROM Sections WHERE document_id = ?1",
            [doc_id],
            |row| row.get(0),
        )
        .expect("Failed to get section id");

    // Seed template
    seed_section_300_template(&conn, doc_id, section_id, 301).expect("Failed to seed template");

    // Verify 7 L1 questions created
    let l1_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM Questions WHERE section_id = ?1 AND parent_id IS NULL",
            [section_id],
            |row| row.get(0),
        )
        .expect("Failed to count L1");

    assert_eq!(
        l1_count, 7,
        "Should have 7 L1 questions (3xx.1 through 3xx.7)"
    );

    // Verify 3xx.1 has 5 children
    let q1_id: String = conn.query_row(
        "SELECT id FROM Questions WHERE section_id = ?1 AND parent_id IS NULL AND sequence = 1",
        [section_id],
        |row| row.get(0),
    ).expect("Failed to get q1");

    let q1_children: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM Questions WHERE parent_id = ?1",
            [&q1_id],
            |row| row.get(0),
        )
        .expect("Failed to count q1 children");

    assert_eq!(q1_children, 5, "3xx.1 should have 5 children");

    // Verify 3xx.7 has 2 children
    let q7_id: String = conn.query_row(
        "SELECT id FROM Questions WHERE section_id = ?1 AND parent_id IS NULL AND sequence = 7",
        [section_id],
        |row| row.get(0),
    ).expect("Failed to get q7");

    let q7_children: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM Questions WHERE parent_id = ?1",
            [&q7_id],
            |row| row.get(0),
        )
        .expect("Failed to count q7 children");

    assert_eq!(q7_children, 2, "3xx.7 should have 2 children");
}

#[test]
fn test_standard_branch_is_auto_created_with_standard_sub_branch() {
    let conn = create_test_db();
    init_branch_protection_schema(&conn);

    let main: (String, String) = conn
        .query_row(
            "SELECT code, name FROM OccupationBranches WHERE name = ?1",
            params![STANDARD_BRANCH_NAME],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .expect("Missing standard main branch");

    let sub: (String, String, String) = conn
        .query_row(
            "SELECT code, branch_code, name FROM OccupationSubBranches WHERE branch_code = ?1 AND name = ?2",
            params![main.0, STANDARD_BRANCH_NAME],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .expect("Missing standard sub branch");

    assert_eq!(main.1, STANDARD_BRANCH_NAME);
    assert_eq!(sub.1, main.0);
    assert_eq!(sub.2, STANDARD_BRANCH_NAME);
}

#[test]
fn test_ensure_standard_branch_is_idempotent_on_rerun() {
    let conn = create_test_db();
    init_branch_protection_schema(&conn);

    ensure_standard_occupation_branch_exists(&conn)
        .expect("Rerunning standard branch bootstrap should succeed");

    let main_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM OccupationBranches WHERE name = ?1",
            params![STANDARD_BRANCH_NAME],
            |row| row.get(0),
        )
        .expect("Should count standard main branches");
    let sub_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM OccupationSubBranches WHERE name = ?1",
            params![STANDARD_BRANCH_NAME],
            |row| row.get(0),
        )
        .expect("Should count standard sub branches");

    assert_eq!(
        main_count, 1,
        "Standard main branch should not duplicate on rerun"
    );
    assert_eq!(
        sub_count, 1,
        "Standard sub branch should not duplicate on rerun"
    );
}

#[test]
fn test_ensure_standard_branch_uses_numeric_fallback_when_std_code_taken() {
    let conn = create_test_db();
    init_content_schema(&conn).expect("Failed to init schema");

    conn.execute(
        "CREATE TABLE IF NOT EXISTS OccupationSubBranches (
            code VARCHAR(10) NOT NULL,
            branch_code VARCHAR(10) NOT NULL,
            name VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (branch_code, code)
        )",
        [],
    )
    .expect("Failed to create OccupationSubBranches table");

    conn.execute(
        "INSERT INTO OccupationBranches (code, name) VALUES ('STD', 'Existing Branch')",
        [],
    )
    .expect("Failed to seed conflicting STD code");

    ensure_standard_occupation_branch_exists(&conn)
        .expect("Standard branch bootstrap should succeed with fallback code");

    let main_code: String = conn
        .query_row(
            "SELECT code FROM OccupationBranches WHERE name = ?1",
            params![STANDARD_BRANCH_NAME],
            |row| row.get(0),
        )
        .expect("Missing fallback standard main branch");
    let sub_code: String = conn
        .query_row(
            "SELECT code FROM OccupationSubBranches WHERE branch_code = ?1 AND name = ?2",
            params![main_code.clone(), STANDARD_BRANCH_NAME],
            |row| row.get(0),
        )
        .expect("Missing standard sub branch under fallback main code");

    assert_eq!(main_code, "1");
    assert_eq!(sub_code, "STD");
}

#[test]
fn test_sqlite_triggers_block_direct_standard_branch_mutation() {
    let conn = create_test_db();
    init_branch_protection_schema(&conn);

    let standard_code: String = conn
        .query_row(
            "SELECT code FROM OccupationBranches WHERE name = ?1",
            params![STANDARD_BRANCH_NAME],
            |row| row.get(0),
        )
        .expect("Missing standard main branch code");

    let update_main_err = conn
        .execute(
            "UPDATE OccupationBranches SET name = 'อื่น' WHERE code = ?1",
            params![standard_code.clone()],
        )
        .expect_err("Standard main branch rename should be blocked");
    assert!(update_main_err
        .to_string()
        .contains("protected standard occupation branch"));

    let delete_main_err = conn
        .execute(
            "DELETE FROM OccupationBranches WHERE code = ?1",
            params![standard_code.clone()],
        )
        .expect_err("Standard main branch delete should be blocked");
    assert!(delete_main_err
        .to_string()
        .contains("protected standard occupation branch"));

    let standard_sub_code: String = conn
        .query_row(
            "SELECT code FROM OccupationSubBranches WHERE branch_code = ?1 AND name = ?2",
            params![standard_code.clone(), STANDARD_BRANCH_NAME],
            |row| row.get(0),
        )
        .expect("Missing standard sub branch code");

    let update_sub_err = conn
        .execute(
            "UPDATE OccupationSubBranches SET name = 'อื่น' WHERE branch_code = ?1 AND code = ?2",
            params![standard_code.clone(), standard_sub_code.clone()],
        )
        .expect_err("Standard sub branch rename should be blocked");
    assert!(update_sub_err
        .to_string()
        .contains("protected standard occupation sub-branch"));

    let delete_sub_err = conn
        .execute(
            "DELETE FROM OccupationSubBranches WHERE branch_code = ?1 AND code = ?2",
            params![standard_code, standard_sub_code],
        )
        .expect_err("Standard sub branch delete should be blocked");
    assert!(delete_sub_err
        .to_string()
        .contains("protected standard occupation sub-branch"));
}

#[test]
fn test_seed_section_300_scoring_flags() {
    let conn = create_test_db();
    init_content_schema(&conn).expect("Failed to init schema");

    let doc_id = "22724201001";
    conn.execute(
        "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
         VALUES (?, 'Test', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
        [doc_id],
    ).expect("Failed to create document");

    conn.execute(
        "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, is_system_defined)
         VALUES (?, 300, 301, 'Test', '301', 1)",
        [doc_id],
    ).expect("Failed to create section");

    let section_id: i64 = conn
        .query_row(
            "SELECT id FROM Sections WHERE document_id = ?1",
            [doc_id],
            |row| row.get(0),
        )
        .expect("Failed to get section");

    seed_section_300_template(&conn, doc_id, section_id, 301).expect("Seed failed");

    // Verify L1 questions are all group headers
    let non_group_headers: i64 = conn.query_row(
        "SELECT COUNT(*) FROM Questions WHERE section_id = ?1 AND parent_id IS NULL AND is_group_header = 0",
        [section_id],
        |row| row.get(0),
    ).expect("Query failed");

    assert_eq!(
        non_group_headers, 0,
        "All L1 questions should be group headers"
    );

    // Verify 3xx.1.1-3xx.1.3 are NOT scored (prerequisites)
    let q1_id: String = conn.query_row(
        "SELECT id FROM Questions WHERE section_id = ?1 AND parent_id IS NULL AND sequence = 1",
        [section_id],
        |row| row.get(0),
    ).expect("Failed to get q1");

    let scored_prerequisites: i64 = conn.query_row(
        "SELECT COUNT(*) FROM Questions WHERE parent_id = ?1 AND sequence BETWEEN 1 AND 3 AND is_scored = 1",
        [&q1_id],
        |row| row.get(0),
    ).expect("Query failed");

    assert_eq!(
        scored_prerequisites, 0,
        "3xx.1.1-3xx.1.3 should NOT be scored"
    );

    // Verify 3xx.1.4-3xx.1.5 ARE scored
    let scored_knowledge: i64 = conn.query_row(
        "SELECT COUNT(*) FROM Questions WHERE parent_id = ?1 AND sequence BETWEEN 4 AND 5 AND is_scored = 1",
        [&q1_id],
        |row| row.get(0),
    ).expect("Query failed");

    assert_eq!(scored_knowledge, 2, "3xx.1.4-3xx.1.5 should be scored");
}

#[test]
fn test_seed_section_300_exempted_defaults() {
    let conn = create_test_db();
    init_content_schema(&conn).expect("Failed to init schema");

    let doc_id = "22724201001";
    conn.execute(
        "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
         VALUES (?, 'Test', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
        [doc_id],
    ).expect("Failed to create document");

    conn.execute(
        "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, is_system_defined)
         VALUES (?, 300, 301, 'Test', '301', 1)",
        [doc_id],
    ).expect("Failed to create section");

    let section_id: i64 = conn
        .query_row(
            "SELECT id FROM Sections WHERE document_id = ?1",
            [doc_id],
            |row| row.get(0),
        )
        .expect("Failed to get section");

    seed_section_300_template(&conn, doc_id, section_id, 301).expect("Seed failed");

    // Verify 3xx.2-3xx.6 are exempted by default (group headers)
    let exempted_groups: i64 = conn.query_row(
        "SELECT COUNT(*) FROM Questions
         WHERE section_id = ?1 AND parent_id IS NULL AND sequence BETWEEN 2 AND 6 AND question_type = 'exempted'",
        [section_id],
        |row| row.get(0),
    ).expect("Query failed");

    assert_eq!(
        exempted_groups, 5,
        "3xx.2-3xx.6 should default to exempted type"
    );

    // Verify they have display_text
    let with_display_text: i64 = conn.query_row(
        "SELECT COUNT(*) FROM Questions
         WHERE section_id = ?1 AND parent_id IS NULL AND sequence BETWEEN 2 AND 6 AND display_text IS NOT NULL",
        [section_id],
        |row| row.get(0),
    ).expect("Query failed");

    assert_eq!(
        with_display_text, 5,
        "Exempted groups should have display_text"
    );

    // Verify 3xx.1.1-3xx.1.3 are exempted (prerequisites)
    let q1_id: String = conn.query_row(
        "SELECT id FROM Questions WHERE section_id = ?1 AND parent_id IS NULL AND sequence = 1",
        [section_id],
        |row| row.get(0),
    ).expect("Failed to get q1");

    let exempted_prereqs: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM Questions
         WHERE parent_id = ?1 AND sequence BETWEEN 1 AND 3 AND question_type = 'exempted'",
            [&q1_id],
            |row| row.get(0),
        )
        .expect("Query failed");

    assert_eq!(exempted_prereqs, 3, "3xx.1.1-3xx.1.3 should be exempted");
}

#[test]
fn test_seed_section_200_l1_defaults_to_exempted() {
    let conn = create_test_db();
    init_content_schema(&conn).expect("Failed to init schema");

    let doc_id = "22724201001";
    conn.execute(
        "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
         VALUES (?, 'Test', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
        [doc_id],
    ).expect("Failed to create document");

    conn.execute(
        "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, is_system_defined)
         VALUES (?, 200, 201, 'Test', '201', 1)",
        [doc_id],
    ).expect("Failed to create section");

    let section_id: i64 = conn
        .query_row(
            "SELECT id FROM Sections WHERE document_id = ?1",
            [doc_id],
            |row| row.get(0),
        )
        .expect("Failed to get section");

    seed_section_200_template(&conn, doc_id, section_id, 201).expect("Seed failed");

    let exempted_l1: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM Questions
         WHERE section_id = ?1 AND parent_id IS NULL AND question_type = 'exempted'",
            [section_id],
            |row| row.get(0),
        )
        .expect("Query failed");

    assert_eq!(
        exempted_l1, 6,
        "All 2xx.1-2xx.6 L1 questions should default to exempted"
    );

    let with_display_text: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM Questions
         WHERE section_id = ?1 AND parent_id IS NULL AND display_text = '(ไม่ต้องอธิบาย)'",
            [section_id],
            |row| row.get(0),
        )
        .expect("Query failed");

    assert_eq!(
        with_display_text, 6,
        "All exempted 2xx L1 questions should show (ไม่ต้องอธิบาย)"
    );
}

// ========================================================================

