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

    #[test]
    fn test_migrate_answer_keys_inserts_placeholder_for_require_answer_key_metadata() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES ('DOC-MIG-AK', 'Doc', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        conn.execute(
            "INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (1, 'DOC-MIG-AK', 200, 201, 'S201', '201', 1)",
            [],
        )
        .expect("Failed to create section");

        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, metadata)
             VALUES ('Q-MIG-AK', 'DOC-MIG-AK', 1, NULL, 1, 'Q', '{\"requireAnswerKey\":true,\"keep\":\"yes\"}')",
            [],
        )
        .expect("Failed to create question");

        migrate_answer_keys_to_table(&conn).expect("Answer-key migration should succeed");

        let migrated: (String, String, i32, i32) = conn
            .query_row(
                "SELECT sub_question_code, COALESCE(answer_key_text, ''), is_required, order_index
                 FROM QuestionAnswerKeys WHERE question_id = 'Q-MIG-AK'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .expect("Placeholder answer key should be inserted");

        assert_eq!(migrated.0, "");
        assert_eq!(migrated.1, "");
        assert_eq!(migrated.2, 1);
        assert_eq!(migrated.3, 0);
    }

    #[test]
    fn test_migrate_selected_sub_questions_is_idempotent() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS QuestionSubQuestionLinks (
                question_id TEXT NOT NULL,
                sub_question_code TEXT NOT NULL,
                UNIQUE(question_id, sub_question_code)
            )",
            [],
        )
        .expect("Failed to create QuestionSubQuestionLinks");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES ('DOC-MIG-SUB', 'Doc', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        conn.execute(
            "INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (2, 'DOC-MIG-SUB', 200, 202, 'S202', '202', 1)",
            [],
        )
        .expect("Failed to create section");

        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, metadata)
             VALUES ('Q-MIG-SUB', 'DOC-MIG-SUB', 2, NULL, 1, 'Q', '{\"selectedSubQuestions\":[\"A01\",\"B02\"]}')",
            [],
        )
        .expect("Failed to create question");

        migrate_selected_sub_questions_to_table(&conn)
            .expect("selectedSubQuestions migration should succeed first time");
        migrate_selected_sub_questions_to_table(&conn)
            .expect("selectedSubQuestions migration should remain safe on rerun");

        let link_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM QuestionSubQuestionLinks WHERE question_id = 'Q-MIG-SUB'",
                [],
                |row| row.get(0),
            )
            .expect("Failed to count migrated selected sub-questions");

        assert_eq!(
            link_count, 2,
            "Migration rerun should not duplicate sub-question links"
        );
    }

    #[test]
    fn test_scrub_legacy_answer_keys_from_metadata_removes_only_legacy_fields() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES ('DOC-MIG-SCRUB', 'Doc', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        conn.execute(
            "INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (3, 'DOC-MIG-SCRUB', 200, 203, 'S203', '203', 1)",
            [],
        )
        .expect("Failed to create section");

        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, metadata)
             VALUES ('Q-MIG-SCRUB', 'DOC-MIG-SCRUB', 3, NULL, 1, 'Q', '{\"answerKey\":\"single\",\"answerKeys\":{\"A\":{\"text\":\"alpha\"}},\"selectedSubQuestions\":[\"A01\"],\"keep\":\"yes\"}')",
            [],
        )
        .expect("Failed to create question");

        scrub_legacy_answer_keys_from_metadata(&conn).expect("Metadata scrub should succeed");

        let metadata: String = conn
            .query_row(
                "SELECT metadata FROM Questions WHERE id = 'Q-MIG-SCRUB'",
                [],
                |row| row.get(0),
            )
            .expect("Failed to load scrubbed metadata");

        assert!(
            !metadata.contains("\"answerKey\""),
            "Legacy single answerKey field should be removed"
        );
        assert!(
            !metadata.contains("\"answerKeys\""),
            "Legacy answerKeys field should be removed"
        );
        assert!(
            metadata.contains("\"selectedSubQuestions\""),
            "Unrelated metadata should remain intact"
        );
        assert!(metadata.contains("\"keep\":\"yes\""));
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
    // cleanup_orphaned_section_refs Tests
    // ========================================================================

    /// Helper: create a minimal doc + section for cleanup tests
    fn setup_cleanup_test_db(
        conn: &rusqlite::Connection,
        section_group: i32,
        section_number: i32,
    ) -> (String, i64) {
        let doc_id = "DOC-CLEANUP-TEST";
        conn.execute(
            "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES (?1, 'Cleanup Test', 'U1', 'UC1', 'Test', '20', '1', datetime('now'), datetime('now'))",
            params![doc_id],
        ).expect("insert doc");

        conn.execute(
            "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (?1, ?2, ?3, 'Test Section', 'TS', 1)",
            params![doc_id, section_group, section_number],
        ).expect("insert section");

        let section_id: i64 = conn
            .query_row(
                "SELECT id FROM Sections WHERE document_id = ?1 AND section_number = ?2",
                params![doc_id, section_number],
                |row| row.get(0),
            )
            .expect("get section id");

        (doc_id.to_string(), section_id)
    }

    #[test]
    fn test_cleanup_noop_on_clean_database() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("init schema");

        let removed = cleanup_orphaned_section_refs_with_conn(&conn).expect("cleanup");
        assert_eq!(removed, 0, "No orphans in a clean DB");
    }

    #[test]
    fn test_cleanup_pass1_removes_orphaned_section_ref() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("init schema");
        let (doc_id, section_id) = setup_cleanup_test_db(&conn, 300, 301);

        // Create a second section that will be the target of the ref
        conn.execute(
            "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (?1, 300, 302, 'Target Section', 'TS2', 1)",
            params![doc_id],
        ).expect("insert target section");
        let target_section_id: i64 = conn
            .query_row(
                "SELECT id FROM Sections WHERE document_id = ?1 AND section_number = 302",
                params![doc_id],
                |row| row.get(0),
            )
            .expect("get target section id");

        // Create a parent group_header question
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, sequence, content, is_header, answer_type, question_type, is_group_header)
             VALUES ('parent-1', ?1, ?2, 2, 'Group Header', 0, 'text', 'normal', 1)",
            params![doc_id, section_id],
        ).expect("insert parent");

        // Create a section_ref child pointing to target_section_id
        let metadata = format!("{{\"refSectionId\":{}}}", target_section_id);
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, answer_type, question_type, metadata, is_scored)
             VALUES ('ref-1', ?1, ?2, 'parent-1', 1, 'Ref to 302', 0, 'text', 'section_ref', ?3, 1)",
            params![doc_id, section_id, metadata],
        ).expect("insert section_ref");

        // Now delete the target section directly (simulate legacy delete without cleanup)
        conn.execute(
            "DELETE FROM Sections WHERE id = ?1",
            params![target_section_id],
        )
        .expect("delete target");

        // Run cleanup
        let removed = cleanup_orphaned_section_refs_with_conn(&conn).expect("cleanup");
        assert_eq!(removed, 1, "Should remove 1 orphaned section_ref");

        // Verify section_ref question is gone
        let ref_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM Questions WHERE id = 'ref-1'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(ref_count, 0, "Orphaned section_ref should be deleted");

        // Verify parent was auto-exempted with is_group_header = 0
        let (q_type, is_gh): (String, bool) = conn
            .query_row(
                "SELECT question_type, is_group_header FROM Questions WHERE id = 'parent-1'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(q_type, "exempted", "Parent should be exempted");
        assert!(!is_gh, "Parent is_group_header should be 0 after exemption");
    }

    #[test]
    fn test_cleanup_pass1_keeps_parent_with_remaining_children() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("init schema");
        let (doc_id, section_id) = setup_cleanup_test_db(&conn, 300, 301);

        // Create two target sections
        conn.execute(
            "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (?1, 300, 302, 'Target A', 'TA', 1), (?1, 300, 303, 'Target B', 'TB', 1)",
            params![doc_id],
        ).expect("insert targets");
        let target_a_id: i64 = conn
            .query_row(
                "SELECT id FROM Sections WHERE section_number = 302",
                [],
                |row| row.get(0),
            )
            .unwrap();
        let target_b_id: i64 = conn
            .query_row(
                "SELECT id FROM Sections WHERE section_number = 303",
                [],
                |row| row.get(0),
            )
            .unwrap();

        // Create parent
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, sequence, content, is_header, answer_type, question_type, is_group_header)
             VALUES ('parent-2', ?1, ?2, 3, 'Group Header', 0, 'text', 'normal', 1)",
            params![doc_id, section_id],
        ).expect("insert parent");

        // Create two section_ref children
        let meta_a = format!("{{\"refSectionId\":{}}}", target_a_id);
        let meta_b = format!("{{\"refSectionId\":{}}}", target_b_id);
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, answer_type, question_type, metadata, is_scored)
             VALUES ('ref-a', ?1, ?2, 'parent-2', 1, 'Ref A', 0, 'text', 'section_ref', ?3, 1)",
            params![doc_id, section_id, meta_a],
        ).expect("insert ref-a");
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, answer_type, question_type, metadata, is_scored)
             VALUES ('ref-b', ?1, ?2, 'parent-2', 2, 'Ref B', 0, 'text', 'section_ref', ?3, 1)",
            params![doc_id, section_id, meta_b],
        ).expect("insert ref-b");

        // Delete only target A
        conn.execute("DELETE FROM Sections WHERE id = ?1", params![target_a_id])
            .expect("delete target A");

        let removed = cleanup_orphaned_section_refs_with_conn(&conn).expect("cleanup");
        assert_eq!(removed, 1, "Should remove only 1 orphaned ref");

        // Parent should NOT be exempted (still has ref-b child)
        let q_type: String = conn
            .query_row(
                "SELECT question_type FROM Questions WHERE id = 'parent-2'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(
            q_type, "normal",
            "Parent should remain normal when children exist"
        );
    }

    #[test]
    fn test_cleanup_pass2_exempts_stranded_300_series_group_header() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("init schema");
        let (doc_id, section_id) = setup_cleanup_test_db(&conn, 300, 301);

        // Create a stranded group_header (seq 4, no children, not exempted)
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, sequence, content, is_header, answer_type, question_type, is_group_header, is_scored)
             VALUES ('stranded-1', ?1, ?2, 4, 'Stranded Header', 0, 'text', 'normal', 1, 0)",
            params![doc_id, section_id],
        ).expect("insert stranded");

        let removed = cleanup_orphaned_section_refs_with_conn(&conn).expect("cleanup");
        assert_eq!(removed, 1, "Should catch 1 stranded selector");

        let (q_type, is_gh): (String, bool) = conn
            .query_row(
                "SELECT question_type, is_group_header FROM Questions WHERE id = 'stranded-1'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(q_type, "exempted");
        assert!(
            !is_gh,
            "Stranded header should have is_group_header cleared"
        );
    }

    #[test]
    fn test_cleanup_pass2_skips_already_exempted() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("init schema");
        let (doc_id, section_id) = setup_cleanup_test_db(&conn, 300, 301);

        // Create an already-exempted group_header with no children
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, sequence, content, is_header, answer_type, question_type, is_group_header, is_scored)
             VALUES ('exempt-1', ?1, ?2, 3, 'Already Exempted', 0, 'text', 'exempted', 0, 0)",
            params![doc_id, section_id],
        ).expect("insert exempted");

        let removed = cleanup_orphaned_section_refs_with_conn(&conn).expect("cleanup");
        assert_eq!(
            removed, 0,
            "Already-exempted questions should not be touched"
        );
    }

    #[test]
    fn test_cleanup_is_idempotent() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("init schema");
        let (doc_id, section_id) = setup_cleanup_test_db(&conn, 300, 301);

        // Create stranded group_header
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, sequence, content, is_header, answer_type, question_type, is_group_header)
             VALUES ('idem-1', ?1, ?2, 5, 'Stranded', 0, 'text', 'normal', 1)",
            params![doc_id, section_id],
        ).expect("insert");

        // First run
        let r1 = cleanup_orphaned_section_refs_with_conn(&conn).expect("cleanup 1");
        assert_eq!(r1, 1);

        // Second run should find nothing
        let r2 = cleanup_orphaned_section_refs_with_conn(&conn).expect("cleanup 2");
        assert_eq!(r2, 0, "Second run should be a no-op (idempotent)");
    }

    #[test]
    fn test_cleanup_pass2_skips_non_300_series() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("init schema");
        let (doc_id, section_id) = setup_cleanup_test_db(&conn, 200, 201);

        // Create a group_header with no children in 200-series
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, sequence, content, is_header, answer_type, question_type, is_group_header)
             VALUES ('non300-1', ?1, ?2, 3, 'Non-300 Header', 0, 'text', 'normal', 1)",
            params![doc_id, section_id],
        ).expect("insert");

        let removed = cleanup_orphaned_section_refs_with_conn(&conn).expect("cleanup");
        assert_eq!(removed, 0, "Pass 2 should only affect 300-series sections");
    }

    #[test]
    fn test_delete_section_cascades_orphan_cleanup_with_group_header_reset() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("init schema");
        let (doc_id, section_id) = setup_cleanup_test_db(&conn, 300, 301);

        // Create a second section (the one we'll link to, then delete)
        conn.execute(
            "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (?1, 300, 302, 'To Be Deleted', 'DEL', 0)",
            params![doc_id],
        ).expect("insert section 302");
        let del_section_id: i64 = conn
            .query_row(
                "SELECT id FROM Sections WHERE section_number = 302",
                [],
                |row| row.get(0),
            )
            .unwrap();

        // Create parent group_header in section 301
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, sequence, content, is_header, answer_type, question_type, is_group_header)
             VALUES ('gh-parent', ?1, ?2, 2, 'Group Header', 0, 'text', 'normal', 1)",
            params![doc_id, section_id],
        ).expect("insert parent");

        // Create section_ref child pointing to section 302
        let metadata = format!("{{\"refSectionId\":{}}}", del_section_id);
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, answer_type, question_type, metadata, is_scored)
             VALUES ('ref-del', ?1, ?2, 'gh-parent', 1, 'Ref', 0, 'text', 'section_ref', ?3, 1)",
            params![doc_id, section_id, metadata],
        ).expect("insert section_ref");

        // Delete section 302 through the proper API
        delete_section_with_conn(&conn, del_section_id).expect("delete section");

        // Verify parent was auto-exempted AND is_group_header was cleared
        let (q_type, is_gh): (String, bool) = conn
            .query_row(
                "SELECT question_type, is_group_header FROM Questions WHERE id = 'gh-parent'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(
            q_type, "exempted",
            "Parent should be auto-exempted after section delete"
        );
        assert!(
            !is_gh,
            "Parent is_group_header should be cleared by delete_section"
        );
    }

    // ========================================================================
    // Sub-question code migration Tests
    // ========================================================================

    #[test]
    fn test_migrate_sub_question_codes_skips_already_8digit_codes() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "INSERT INTO OccupationBranches (code, name) VALUES ('05', 'Branch 5')",
            [],
        )
        .unwrap();
        conn.execute("INSERT INTO OccupationSubBranches (code, branch_code, name) VALUES ('02', '05', 'Sub 2')", []).unwrap();

        // Insert already-correct 8-digit codes
        conn.execute(
            "INSERT INTO OccupationSubQuestions (branch_code, sub_branch_code, code, text, always_checked, sequence)
             VALUES ('05', '02', '22050201', 'Item A', 0, 1),
                    ('05', '02', '22050202', 'Item B', 0, 2)",
            [],
        ).expect("insert 8-digit codes");

        crate::content_database::migrate_sub_question_codes_to_8digit(&conn)
            .expect("Migration should succeed on already-correct codes");

        // Codes must remain unchanged
        let codes: Vec<String> = {
            let mut stmt = conn.prepare(
                "SELECT code FROM OccupationSubQuestions WHERE branch_code = '05' ORDER BY sequence"
            ).unwrap();
            stmt.query_map([], |row| row.get(0))
                .unwrap()
                .filter_map(|r| r.ok())
                .collect()
        };
        assert_eq!(codes, vec!["22050201", "22050202"]);
    }
}
