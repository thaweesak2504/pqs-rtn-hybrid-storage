#[cfg(test)]
mod tests {
    use crate::content_database::answers::{
        replace_question_answer_keys_with_conn, update_answer_key_with_conn,
    };
    use crate::content_database::documents::generate_document_id_with_conn;
    use crate::content_database::media::{
        bundle_reference_file_in_dir, delete_question_image_in_dir, resolve_image_path_in_dir,
    };
    use crate::content_database::*;
    use crate::test_helpers::helpers::*;
    use rusqlite::params;

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

    #[test]
    fn test_bundle_reference_file_in_dir_copies_into_expected_portable_location() {
        let temp_dir = create_temp_dir();
        let source_path = temp_dir.path().join("manual.pdf");
        std::fs::write(&source_path, b"reference-body").expect("Failed to write source file");

        let relative_path = bundle_reference_file_in_dir(
            temp_dir.path(),
            "REF001",
            "MANUAL",
            source_path
                .to_str()
                .expect("Source path should be valid UTF-8"),
            Some("DOC777"),
        )
        .expect("Bundling reference file should succeed");

        let copied_path = temp_dir
            .path()
            .join("DOC777")
            .join("references")
            .join("MANUAL")
            .join("REF001_manual.pdf");

        assert_eq!(
            relative_path,
            "data/DOC777/references/MANUAL/REF001_manual.pdf"
        );
        assert!(
            copied_path.exists(),
            "Bundled file should exist in portable location"
        );
        assert_eq!(
            std::fs::read(&copied_path).expect("Failed to read bundled file"),
            b"reference-body"
        );
    }

    #[test]
    fn test_resolve_and_delete_question_image_in_dir_follow_managed_data_path() {
        let temp_dir = create_temp_dir();
        let image_path = temp_dir
            .path()
            .join("DOC999")
            .join("question-images")
            .join("q1.png");
        std::fs::create_dir_all(
            image_path
                .parent()
                .expect("Image path should have a parent directory"),
        )
        .expect("Failed to create image directory");
        std::fs::write(&image_path, b"png-bytes").expect("Failed to write image file");

        let resolved =
            resolve_image_path_in_dir(temp_dir.path(), "data/DOC999/question-images/q1.png")
                .expect("Resolving managed image path should succeed");

        assert_eq!(std::path::Path::new(&resolved), image_path.as_path());

        delete_question_image_in_dir(temp_dir.path(), "data/DOC999/question-images/q1.png")
            .expect("Deleting managed image path should succeed");

        assert!(
            !image_path.exists(),
            "Managed image file should be removed from injected data dir"
        );
    }

    #[test]
    fn test_batch_create_sub_questions() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        // Insert parent branches to satisfy FK constraints
        conn.execute(
            "INSERT INTO OccupationBranches (code, name) VALUES ('B1', 'Branch 1')",
            [],
        )
        .unwrap();
        conn.execute("INSERT INTO OccupationSubBranches (code, branch_code, name) VALUES ('S1', 'B1', 'Sub 1')", []).unwrap();

        let items = vec![
            BatchSubQuestionItem {
                branch_code: "B1".to_string(),
                sub_branch_code: "S1".to_string(),
                code: "C1".to_string(),
                text: "Text 1".to_string(),
                always_checked: false,
                sequence: 1,
            },
            BatchSubQuestionItem {
                branch_code: "B1".to_string(),
                sub_branch_code: "S1".to_string(),
                code: "C2".to_string(),
                text: "Text 2".to_string(),
                always_checked: true,
                sequence: 2,
            },
        ];

        let results =
            crate::content_database::branches::batch_create_occupation_sub_questions_with_conn(
                &conn, items,
            )
            .expect("Batch create should succeed");

        assert_eq!(results.len(), 2);
        assert_eq!(results[0].code, "C1");
        assert_eq!(results[1].always_checked, true);

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM OccupationSubQuestions", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(count, 2);
    }

    #[test]
    fn test_reorder_sub_questions() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        // Insert test data
        conn.execute(
            "INSERT INTO OccupationBranches (code, name) VALUES ('B', 'Branch')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO OccupationSubBranches (code, branch_code, name) VALUES ('S', 'B', 'Sub')",
            [],
        )
        .unwrap();
        conn.execute("INSERT INTO OccupationSubQuestions (id, branch_code, sub_branch_code, code, text, always_checked, sequence)
                      VALUES (100, 'B', 'S', 'C1', 'T1', 0, 1), (101, 'B', 'S', 'C2', 'T2', 0, 2)", []).unwrap();

        // Reorder: swap 101 to be first
        crate::content_database::branches::reorder_occupation_sub_questions_with_conn(
            &conn,
            vec![101, 100],
        )
        .expect("Reorder should succeed");

        let seq_101: i32 = conn
            .query_row(
                "SELECT sequence FROM OccupationSubQuestions WHERE id = 101",
                [],
                |row| row.get(0),
            )
            .unwrap();
        let seq_100: i32 = conn
            .query_row(
                "SELECT sequence FROM OccupationSubQuestions WHERE id = 100",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(seq_101, 1);
        assert_eq!(seq_100, 2);
    }

    #[test]
    fn test_get_standard_branch_sub_questions() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        // Seed standard branch
        ensure_standard_occupation_branch_exists(&conn).expect("Should seed standard branch");

        // Verify it returns at least the default seeded questions (if any)
        // or we can manually add one to the standard branch to be sure
        let std_code: String = conn
            .query_row(
                "SELECT code FROM OccupationBranches WHERE name = ?1",
                [STANDARD_BRANCH_NAME],
                |row| row.get(0),
            )
            .unwrap();

        // Ensure sub-branch exists for the standard branch
        conn.execute("INSERT OR IGNORE INTO OccupationSubBranches (code, branch_code, name) VALUES ('STD_SUB', ?1, 'Standard Sub')", [std_code.clone()]).unwrap();

        conn.execute("INSERT INTO OccupationSubQuestions (branch_code, sub_branch_code, code, text, always_checked, sequence)
                      VALUES (?1, 'STD_SUB', 'STD_Q1', 'Standard Question 1', 1, 1)", [std_code.clone()]).unwrap();

        let results =
            crate::content_database::branches::get_standard_branch_sub_questions_with_conn(&conn)
                .expect("Should fetch standard sub-questions");

        assert!(!results.is_empty());
        assert!(results.iter().any(|q| q.code == "STD_Q1"));
    }

    #[test]
    fn test_migrate_sub_question_codes_to_8digit_converts_old_codes() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        // Insert branches
        conn.execute(
            "INSERT INTO OccupationBranches (code, name) VALUES ('1', 'Branch 1')",
            [],
        )
        .unwrap();
        conn.execute("INSERT INTO OccupationSubBranches (code, branch_code, name) VALUES ('1', '1', 'Sub 1')", []).unwrap();

        // Insert old-format codes (5-char and 7-char) for branch '1' / sub '1'
        conn.execute(
            "INSERT INTO OccupationSubQuestions (branch_code, sub_branch_code, code, text, always_checked, sequence)
             VALUES ('1', '1', '22111', 'Item 1', 0, 1),
                    ('1', '1', '2211002', 'Item 2', 0, 2),
                    ('1', '1', '22113', 'Item 3', 1, 3)",
            [],
        ).expect("Failed to insert old-format sub-questions");

        // Insert a referencing link with old code (must use a valid question_id due to FK)
        // We insert after creating the question below, so we forward-reference — insert after Questions insert.

        // Insert a question with JSON metadata referencing old codes
        conn.execute(
            "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES ('DOC-8DIG', 'Doc', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            [],
        ).expect("insert doc");
        conn.execute(
            "INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (99, 'DOC-8DIG', 200, 202, 'S', 'S', 1)",
            [],
        ).expect("insert section");
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, metadata)
             VALUES ('Q-8DIG', 'DOC-8DIG', 99, NULL, 1, 'Q', '{\"activeSubQuestions\":[\"22111\",\"2211002\"],\"selectedSubQuestions\":[\"22113\"]}')",
            [],
        ).expect("insert question with metadata");

        // Insert link now that question exists
        conn.execute(
            "INSERT OR IGNORE INTO QuestionSubQuestionLinks (question_id, sub_question_code) VALUES ('Q-8DIG', '22111')",
            [],
        ).expect("insert link with old code");

        // Run migration
        crate::content_database::migrate_sub_question_codes_to_8digit(&conn)
            .expect("Migration should succeed");

        // Verify OccupationSubQuestions — all codes now 8 chars
        let codes: Vec<String> = {
            let mut stmt = conn.prepare(
                "SELECT code FROM OccupationSubQuestions WHERE branch_code = '1' ORDER BY sequence"
            ).unwrap();
            stmt.query_map([], |row| row.get(0))
                .unwrap()
                .filter_map(|r| r.ok())
                .collect()
        };
        assert_eq!(codes.len(), 3);
        assert!(
            codes.iter().all(|c| c.len() == 8),
            "All codes must be 8 digits: {:?}",
            codes
        );
        // branch '1' pads to '01', sub '1' pads to '01', sequences 01/02/03
        assert_eq!(codes[0], "22010101");
        assert_eq!(codes[1], "22010102");
        assert_eq!(codes[2], "22010103");

        // Verify QuestionSubQuestionLinks cascade
        let link_code: String = conn.query_row(
            "SELECT sub_question_code FROM QuestionSubQuestionLinks WHERE question_id = 'Q-8DIG'",
            [],
            |row| row.get(0),
        ).unwrap();
        assert_eq!(link_code, "22010101");

        // Verify JSON metadata was migrated
        let metadata: String = conn
            .query_row(
                "SELECT metadata FROM Questions WHERE id = 'Q-8DIG'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        let v: serde_json::Value = serde_json::from_str(&metadata).unwrap();
        let active: Vec<&str> = v["activeSubQuestions"]
            .as_array()
            .unwrap()
            .iter()
            .map(|x| x.as_str().unwrap())
            .collect();
        let selected: Vec<&str> = v["selectedSubQuestions"]
            .as_array()
            .unwrap()
            .iter()
            .map(|x| x.as_str().unwrap())
            .collect();
        assert_eq!(active, vec!["22010101", "22010102"]);
        assert_eq!(selected, vec!["22010103"]);
    }

    #[test]
    fn test_migrate_sub_question_codes_to_8digit_is_idempotent() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "INSERT INTO OccupationBranches (code, name) VALUES ('2', 'Branch 2')",
            [],
        )
        .unwrap();
        conn.execute("INSERT INTO OccupationSubBranches (code, branch_code, name) VALUES ('3', '2', 'Sub 3')", []).unwrap();

        // Insert old-format code
        conn.execute(
            "INSERT INTO OccupationSubQuestions (branch_code, sub_branch_code, code, text, always_checked, sequence)
             VALUES ('2', '3', '32231', 'Item', 0, 1)",
            [],
        ).expect("insert old code");

        // Run twice — should not error or duplicate
        crate::content_database::migrate_sub_question_codes_to_8digit(&conn)
            .expect("First migration run should succeed");
        crate::content_database::migrate_sub_question_codes_to_8digit(&conn)
            .expect("Second migration run should be idempotent");

        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM OccupationSubQuestions WHERE branch_code = '2'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1, "No duplicates should be created on re-run");

        let code: String = conn
            .query_row(
                "SELECT code FROM OccupationSubQuestions WHERE branch_code = '2'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(
            code, "32020301",
            "Code should remain stable after second run"
        );
    }

    // ========================================================================
}
