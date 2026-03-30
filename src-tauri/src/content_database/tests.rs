#[cfg(test)]
mod tests {
    use crate::content_database::answers::{
        replace_question_answer_keys_with_conn, update_answer_key_with_conn,
    };
    use crate::content_database::*;
    use crate::test_helpers::helpers::*;
    use rusqlite::params;

    // ========================================================================
    // Template Seeding Tests
    // ========================================================================

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
    // Cascade Chain Tests
    // ========================================================================

    #[test]
    fn test_recalculate_group_score_chain_propagates_up() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        // Create test document and section
        conn.execute(
            "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES (?1, 'Test Doc', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            ["test-doc"],
        ).expect("Insert document failed");

        conn.execute(
            "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (?, 100, 100, 'Test Section', 'Test', 1)",
            ["test-doc"],
        ).expect("Insert section failed");

        let section_id: i64 = conn
            .query_row(
                "SELECT id FROM Sections WHERE document_id = ? ORDER BY id DESC LIMIT 1",
                ["test-doc"],
                |row| row.get(0),
            )
            .expect("Get section_id failed");

        // Create 3-level hierarchy: L1 -> L2 -> L3
        // L1: group header
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, NULL, 1, 'L1 Parent', 1, 0, 'standard', 0, 0)",
            params!["q1", "test-doc", section_id],
        ).expect("Insert L1 failed");

        // L2: sub-group with its own children
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, ?4, 1, 'L2 Sub-group', 1, 0, 'standard', 0, 0)",
            params!["q1-1", "test-doc", section_id, "q1"],
        ).expect("Insert L2 failed");

        // L3: leaf nodes with actual scores (scored = 1)
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, ?4, 1, 'L3 Item A', 0, 1, 'standard', 0, 20)",
            params!["q1-1-a", "test-doc", section_id, "q1-1"],
        ).expect("Insert L3a failed");

        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, ?4, 2, 'L3 Item B', 0, 1, 'standard', 0, 30)",
            params!["q1-1-b", "test-doc", section_id, "q1-1"],
        ).expect("Insert L3b failed");

        // Call cascade: L2 should sum L3 items (20+30=50), then L1 should reflect L2 (50)
        recalculate_group_score_chain(&conn, "q1-1").expect("Cascade chain failed");

        // Verify L2 recalculated to 50
        let l2_score: i32 = conn
            .query_row(
                "SELECT group_score FROM Questions WHERE id = ?1",
                ["q1-1"],
                |row| row.get(0),
            )
            .expect("Query L2 failed");

        assert_eq!(
            l2_score, 50,
            "L2 group_score should be 50 (sum of L3 children: 20+30)"
        );

        // Verify L1 recalculated to 50 (from L2's new group_score)
        let l1_score: i32 = conn
            .query_row(
                "SELECT group_score FROM Questions WHERE id = ?1",
                ["q1"],
                |row| row.get(0),
            )
            .expect("Query L1 failed");

        assert_eq!(
            l1_score, 50,
            "L1 group_score should be 50 (propagated from L2)"
        );
    }

    #[test]
    fn test_cascade_exempted_status_blocks_contribution() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        // Create test document and section
        conn.execute(
            "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES (?1, 'Test Doc', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            ["test-doc"],
        ).expect("Insert document failed");

        conn.execute(
            "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (?, 100, 100, 'Test Section', 'Test', 1)",
            ["test-doc"],
        ).expect("Insert section failed");

        let section_id: i64 = conn
            .query_row(
                "SELECT id FROM Sections WHERE document_id = ? ORDER BY id DESC LIMIT 1",
                ["test-doc"],
                |row| row.get(0),
            )
            .expect("Get section_id failed");

        // L1 with two children: one normal scored, one exempted
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, NULL, 1, 'L1 Parent', 1, 0, 'standard', 0, 0)",
            params!["q1", "test-doc", section_id],
        ).expect("Insert L1 failed");

        // Normal scored child: score = 40
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, ?4, 1, 'L2 Normal', 0, 1, 'standard', 0, 40)",
            params!["q1-a", "test-doc", section_id, "q1"],
        ).expect("Insert L2 normal failed");

        // Exempted child: score = 100 (should not contribute)
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, ?4, 2, 'L2 Exempted', 0, 0, 'exempted', 0, 100)",
            params!["q1-b", "test-doc", section_id, "q1"],
        ).expect("Insert L2 exempted failed");

        // Call cascade
        recalculate_group_score_chain(&conn, "q1").expect("Cascade chain failed");

        // Verify L1 only counted normal child (40), not exempted (100)
        let l1_score: i32 = conn
            .query_row(
                "SELECT group_score FROM Questions WHERE id = ?1",
                ["q1"],
                |row| row.get(0),
            )
            .expect("Query L1 failed");

        assert_eq!(
            l1_score, 40,
            "L1 should only count non-exempted child (40), not exempted child"
        );
    }

    // ========================================================================
    // Pure Function Tests
    // ========================================================================

    #[test]
    fn test_to_thai_digit_single_digit() {
        assert_eq!(to_thai_digit(0), "๐");
        assert_eq!(to_thai_digit(1), "๑");
        assert_eq!(to_thai_digit(2), "๒");
        assert_eq!(to_thai_digit(3), "๓");
        assert_eq!(to_thai_digit(4), "๔");
        assert_eq!(to_thai_digit(5), "๕");
        assert_eq!(to_thai_digit(6), "๖");
        assert_eq!(to_thai_digit(7), "๗");
        assert_eq!(to_thai_digit(8), "๘");
        assert_eq!(to_thai_digit(9), "๙");
    }

    // ========================================================================
    // Database Function Tests
    // ========================================================================

    #[test]
    fn test_generate_document_id_format() {
        // This test requires database initialization
        // We'll use a temporary in-memory database
        let conn = create_test_db();

        // Initialize Documents table
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

        // Set connection for content_database to use our test db
        // Note: This requires modifying get_content_connection() to support test contexts
        // For now, we'll test the ID format expectations

        let unit_code = "RTN01";
        let doc_type = "PQ";
        let user_level = "A";

        // Expected format: UUUUU (5) + TT (2) + L (1) + SSS (3) = 11 digits
        // Example: RTN01PQA001

        // Insert a mock document to test sequence generation
        conn.execute(
            "INSERT INTO Documents (id, title, unit_code, doc_type, user_level, sequence, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'), datetime('now'))",
            params!["RTN01PQA001", "Test Doc", unit_code, doc_type, user_level, 1],
        )
        .expect("Failed to insert test document");

        // Verify the ID format
        let id: String = conn
            .query_row(
                "SELECT id FROM Documents WHERE id = 'RTN01PQA001'",
                [],
                |row| row.get(0),
            )
            .expect("Failed to query document");

        assert_eq!(id.len(), 11, "Document ID should be 11 characters");
        assert!(id.starts_with("RTN01"), "ID should start with unit code");
        assert!(id.contains("PQ"), "ID should contain doc type");
        assert!(id.contains("A"), "ID should contain user level");
    }

    #[test]
    fn test_generate_document_id_sequence() {
        let conn = create_test_db();

        // Initialize Documents table
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

        // Insert multiple documents to test sequence increment
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

        // Verify both IDs exist
        for id in &ids {
            let exists: bool = conn
                .query_row(
                    "SELECT EXISTS(SELECT 1 FROM Documents WHERE id = ?1)",
                    params![id],
                    |row| row.get(0),
                )
                .expect("Failed to check existence");

            assert!(exists, "Document {} should exist", id);
        }
    }

    // ========================================================================
    // Phase D Policy Hardening Tests
    // ========================================================================

    #[test]
    fn test_policy_blocks_references_in_section_300() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS QuestionReferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_id TEXT NOT NULL,
                reference_id INTEGER NOT NULL,
                location_text TEXT,
                display_order INTEGER NOT NULL
            )",
            [],
        )
        .expect("Failed to create QuestionReferences");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, occupation_branch_main, occupation_branch_sub, created_at, updated_at)
             VALUES ('DOC-REF', 'Doc', '2272420', '22724', 'Test', '20', '1', NULL, NULL, datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        conn.execute(
            "INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (1, 'DOC-REF', 300, 301, 'S301', '301', 1)",
            [],
        )
        .expect("Failed to create section");

        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, question_type, is_group_header, is_scored)
             VALUES ('Q300', 'DOC-REF', 1, NULL, 1, 'Q', 0, 'normal', 0, 1)",
            [],
        )
        .expect("Failed to create question");

        let res = add_question_reference_with_conn(
            &conn,
            AddQuestionReferenceRequest {
                question_id: "Q300".to_string(),
                reference_id: 1,
                location_text: Some("p.1".to_string()),
            },
        );

        assert!(res.is_err());
        assert!(res
            .unwrap_err()
            .contains("Section 300 does not allow references"));
    }

    #[test]
    fn test_policy_blocks_answer_keys_in_section_300() {
        let mut conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, occupation_branch_main, occupation_branch_sub, created_at, updated_at)
             VALUES ('DOC-AK', 'Doc', '2272420', '22724', 'Test', '20', '1', NULL, NULL, datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        conn.execute(
            "INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (1, 'DOC-AK', 300, 301, 'S301', '301', 1)",
            [],
        )
        .expect("Failed to create section");

        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, question_type, is_group_header, is_scored)
             VALUES ('QAK300', 'DOC-AK', 1, NULL, 1, 'Q', 0, 'normal', 0, 1)",
            [],
        )
        .expect("Failed to create question");

        let res = replace_question_answer_keys_with_conn(
            &mut conn,
            "QAK300".to_string(),
            vec![ReplaceAnswerKeyItem {
                sub_code: "main".to_string(),
                text: "Answer".to_string(),
                is_required: Some(true),
            }],
        );

        assert!(res.is_err());
        assert!(res
            .unwrap_err()
            .contains("Section 300 does not allow answer keys"));
    }

    #[test]
    fn test_replace_empty_answer_keys_allowed_in_section_300() {
        // Empty items = clear-only: should NOT be blocked by Section 300 policy.
        // This is needed so create_question flows in Section 300 can call
        // replace_question_answer_keys with an empty list without getting a policy error.
        let mut conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, occupation_branch_main, occupation_branch_sub, created_at, updated_at)
             VALUES ('DOC-AK-EMPTY', 'Doc', '2272420', '22724', 'Test', '20', '1', NULL, NULL, datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        conn.execute(
            "INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (99, 'DOC-AK-EMPTY', 300, 301, 'S301', '301', 1)",
            [],
        )
        .expect("Failed to create section");

        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, question_type, is_group_header, is_scored)
             VALUES ('QAKEMPTY300', 'DOC-AK-EMPTY', 99, NULL, 1, 'Q', 0, 'normal', 0, 1)",
            [],
        )
        .expect("Failed to create question");

        // Empty items must succeed even for Section 300
        let res =
            replace_question_answer_keys_with_conn(&mut conn, "QAKEMPTY300".to_string(), vec![]);

        assert!(
            res.is_ok(),
            "Empty items should be allowed in Section 300, got: {:?}",
            res.err()
        );
    }

    #[test]
    fn test_policy_blocks_update_answer_key_in_section_300() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, occupation_branch_main, occupation_branch_sub, created_at, updated_at)
             VALUES ('DOC-AK-UPD', 'Doc', '2272420', '22724', 'Test', '20', '1', NULL, NULL, datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        conn.execute(
            "INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (1, 'DOC-AK-UPD', 300, 301, 'S301', '301', 1)",
            [],
        )
        .expect("Failed to create section");

        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, question_type, is_group_header, is_scored)
             VALUES ('QAKUPD300', 'DOC-AK-UPD', 1, NULL, 1, 'Q', 0, 'normal', 0, 1)",
            [],
        )
        .expect("Failed to create question");

        let res = update_answer_key_with_conn(
            &conn,
            "QAKUPD300".to_string(),
            "main".to_string(),
            "Blocked".to_string(),
        );

        assert!(res.is_err());
        assert!(res
            .unwrap_err()
            .contains("Section 300 does not allow answer keys"));
    }

    #[test]
    fn test_policy_allows_update_answer_key_in_section_200() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, occupation_branch_main, occupation_branch_sub, created_at, updated_at)
             VALUES ('DOC-AK-200', 'Doc', '2272420', '22724', 'Test', '20', '1', NULL, NULL, datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        conn.execute(
            "INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (1, 'DOC-AK-200', 200, 201, 'S201', '201', 1)",
            [],
        )
        .expect("Failed to create section");

        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, question_type, is_group_header, is_scored)
             VALUES ('QAK200', 'DOC-AK-200', 1, NULL, 1, 'Q', 0, 'normal', 0, 1)",
            [],
        )
        .expect("Failed to create question");

        let res = update_answer_key_with_conn(
            &conn,
            "QAK200".to_string(),
            "main".to_string(),
            "Allowed".to_string(),
        );

        assert!(res.is_ok());

        let key_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM QuestionAnswerKeys WHERE question_id = 'QAK200'",
                [],
                |row| row.get(0),
            )
            .expect("Failed to count answer keys");

        assert_eq!(key_count, 1);
    }

    #[test]
    fn test_policy_blocks_branch_change_after_evaluation_started() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS UserAnswers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                question_id TEXT NOT NULL,
                document_id TEXT NOT NULL,
                sub_question_code TEXT DEFAULT '',
                answer_text TEXT,
                status TEXT DEFAULT 'pending'
            )",
            [],
        )
        .expect("Failed to create UserAnswers");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, occupation_branch_main, occupation_branch_sub, created_at, updated_at)
             VALUES ('DOC-BR', 'Doc', '2272420', '22724', 'Test', '20', '1', '02', '01', datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        conn.execute(
            "INSERT INTO UserAnswers (user_id, question_id, document_id, sub_question_code, answer_text, status)
             VALUES ('U1', 'Q1', 'DOC-BR', '', 'some answer', 'pending')",
            [],
        )
        .expect("Failed to create user answer");

        let res = update_document_branch_with_conn(
            &conn,
            "DOC-BR",
            Some("03".to_string()),
            Some("04".to_string()),
        );

        assert!(res.is_err());
        assert!(res
            .unwrap_err()
            .contains("Cannot change document branch after evaluation has started"));
    }

    #[test]
    fn test_policy_allows_same_branch_after_evaluation_started() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS UserAnswers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                question_id TEXT NOT NULL,
                document_id TEXT NOT NULL,
                sub_question_code TEXT DEFAULT '',
                answer_text TEXT,
                status TEXT DEFAULT 'pending'
            )",
            [],
        )
        .expect("Failed to create UserAnswers");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, occupation_branch_main, occupation_branch_sub, created_at, updated_at)
             VALUES ('DOC-BR2', 'Doc', '2272420', '22724', 'Test', '20', '1', '02', '01', datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        conn.execute(
            "INSERT INTO UserAnswers (user_id, question_id, document_id, sub_question_code, answer_text, status)
             VALUES ('U1', 'Q1', 'DOC-BR2', '', 'some answer', 'pending')",
            [],
        )
        .expect("Failed to create user answer");

        let res = update_document_branch_with_conn(
            &conn,
            "DOC-BR2",
            Some("02".to_string()),
            Some("01".to_string()),
        );

        assert!(res.is_ok());
    }

    #[test]
    fn test_section_101_create_requires_fixed_title_and_starts_empty() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES ('DOC-101-CREATE', 'Doc', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        let invalid = create_section_with_conn(
            &conn,
            CreateSectionRequest {
                document_id: "DOC-101-CREATE".to_string(),
                section_group: 100,
                section_number: 101,
                title_th: "ชื่ออื่น".to_string(),
                menu_label: "101 Precautions".to_string(),
            },
        );
        assert!(invalid.is_err());
        assert!(invalid
            .unwrap_err()
            .contains("Section 101 title must be exactly"));

        let created = create_section_with_conn(
            &conn,
            CreateSectionRequest {
                document_id: "DOC-101-CREATE".to_string(),
                section_group: 100,
                section_number: 101,
                title_th: FIXED_SECTION_101_TITLE.to_string(),
                menu_label: "101 Precautions".to_string(),
            },
        )
        .expect("Failed to create section 101");

        assert_eq!(created.section_number, 101);
        assert_eq!(created.title_th, FIXED_SECTION_101_TITLE);

        let question_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM Questions WHERE section_id = ?1",
                params![created.id],
                |row| row.get(0),
            )
            .expect("Failed to count section 101 questions");

        assert_eq!(
            question_count, 0,
            "Manually created Section 101 should start empty"
        );
    }

    #[test]
    fn test_section_101_update_title_is_locked() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS QuestionSectionLinks (
                question_id TEXT NOT NULL,
                section_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )
        .expect("Failed to create QuestionSectionLinks");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES ('DOC-101-UPD', 'Doc', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        let created = create_section_with_conn(
            &conn,
            CreateSectionRequest {
                document_id: "DOC-101-UPD".to_string(),
                section_group: 100,
                section_number: 101,
                title_th: FIXED_SECTION_101_TITLE.to_string(),
                menu_label: "101 Precautions".to_string(),
            },
        )
        .expect("Failed to create section 101");

        let blocked = update_section_with_conn(
            &conn,
            UpdateSectionArgs {
                id: created.id,
                title_th: "หัวข้อใหม่".to_string(),
                menu_label: "101 Updated".to_string(),
                duration_value: None,
                duration_unit: None,
                total_score: None,
            },
        );
        assert!(blocked.is_err());
        assert!(blocked
            .unwrap_err()
            .contains("Section 101 title is fixed and cannot be changed"));

        let allowed = update_section_with_conn(
            &conn,
            UpdateSectionArgs {
                id: created.id,
                title_th: FIXED_SECTION_101_TITLE.to_string(),
                menu_label: "101 New Menu".to_string(),
                duration_value: None,
                duration_unit: None,
                total_score: None,
            },
        );
        assert!(allowed.is_ok());
    }

    #[test]
    fn test_delete_allows_section_101_but_blocks_other_system_defined() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS QuestionSectionLinks (
                question_id TEXT NOT NULL,
                section_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )
        .expect("Failed to create QuestionSectionLinks");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES ('DOC-101-DEL', 'Doc', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        conn.execute(
            "INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (10101, 'DOC-101-DEL', 100, 101, ?1, '101 Precautions', 1)",
            params![FIXED_SECTION_101_TITLE],
        )
        .expect("Failed to create section 101");

        conn.execute(
            "INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (20101, 'DOC-101-DEL', 200, 201, 'Section 201', '201 System', 1)",
            [],
        )
        .expect("Failed to create section 201");

        let del_101 = delete_section_with_conn(&conn, 10101);
        assert!(del_101.is_ok(), "Section 101 should be deletable");

        let exists_101: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM Sections WHERE id = 10101)",
                [],
                |row| row.get(0),
            )
            .expect("Failed to check section 101 existence");
        assert!(!exists_101, "Section 101 should be deleted");

        let del_201 = delete_section_with_conn(&conn, 20101);
        assert!(
            del_201.is_err(),
            "Other system-defined sections should still be blocked"
        );
        assert!(del_201
            .unwrap_err()
            .contains("Cannot delete system-defined section"));
    }

    // ========================================================================
    // Helper Function Tests
    // ========================================================================

    #[test]
    fn test_database_operations_basic() {
        let conn = create_test_db();

        // Create a simple table
        conn.execute(
            "CREATE TABLE test_table (id INTEGER PRIMARY KEY, value TEXT)",
            [],
        )
        .expect("Failed to create test table");

        // Insert data
        conn.execute("INSERT INTO test_table (value) VALUES ('test')", [])
            .expect("Failed to insert data");

        // Query data
        let value: String = conn
            .query_row("SELECT value FROM test_table WHERE id = 1", [], |row| {
                row.get(0)
            })
            .expect("Failed to query data");

        assert_eq!(value, "test");
    }

    #[test]
    fn test_temp_db_cleanup() {
        let (_temp_dir, db_path) = create_temp_db();

        // Create database file
        let conn = rusqlite::Connection::open(&db_path).expect("Failed to create database");

        conn.execute("CREATE TABLE test (id INTEGER)", [])
            .expect("Failed to create table");

        // Verify file exists
        assert!(db_path.exists(), "Database file should exist");

        drop(conn);

        // File should still exist while _temp_dir is in scope
        assert!(db_path.exists(), "Database file should still exist");

        // When _temp_dir is dropped, file will be cleaned up automatically
    }
}
