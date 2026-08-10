#[cfg(test)]
mod tests {
    use crate::content_database::answers::{
        clear_document_trainee_answers_with_conn, replace_question_answer_keys_with_conn,
        update_answer_key_with_conn,
    };
    use crate::content_database::questions::{
        analyze_creator_question_change_with_conn, save_creator_question_with_conn,
    };
    use crate::content_database::types::CreatorQuestionReferenceInput;

    use crate::content_database::*;
    use crate::test_helpers::helpers::*;
    use rusqlite::{params, Connection};
    use std::fs;

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
    fn test_delete_blocks_section_101_and_other_system_defined_sections() {
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
        assert!(del_101.is_err(), "Section 101 must not be deletable");
        assert!(del_101.unwrap_err().contains("Section 101 is mandatory"));

        let exists_101: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM Sections WHERE id = 10101)",
                [],
                |row| row.get(0),
            )
            .expect("Failed to check section 101 existence");
        assert!(exists_101, "Section 101 must remain in the document");

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
    fn test_clear_answers_only_affects_requested_document() {
        let mut conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");
        crate::content_database::schema::initialize_question_tables(&conn)
            .expect("Failed to initialize answer and progress tables");

        conn.execute_batch(
            "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level)
             VALUES ('DOC-CLEAR-A', 'Doc A', '2272420', '22724', 'Test', '20', '1'),
                    ('DOC-CLEAR-B', 'Doc B', '2272420', '22724', 'Test', '20', '1');
             INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (8101, 'DOC-CLEAR-A', 100, 101, 'A', 'A', 1),
                    (8102, 'DOC-CLEAR-B', 100, 101, 'B', 'B', 1);
             INSERT INTO Questions (id, document_id, section_id, sequence, content)
             VALUES ('Q-CLEAR-A', 'DOC-CLEAR-A', 8101, 1, 'Question A'),
                    ('Q-CLEAR-B', 'DOC-CLEAR-B', 8102, 1, 'Question B');
             INSERT INTO QuestionAnswerKeys (question_id, sub_question_code, answer_key_text, is_required, order_index)
             VALUES ('Q-CLEAR-A', '', 'Key A', 1, 0),
                    ('Q-CLEAR-B', '', 'Key B', 1, 0);
             INSERT INTO UserAnswers (user_id, question_id, document_id, sub_question_code, answer_text)
             VALUES ('T-001', 'Q-CLEAR-A', 'DOC-CLEAR-A', '', 'Answer A'),
                    ('T-001', 'Q-CLEAR-B', 'DOC-CLEAR-B', '', 'Answer B');
             INSERT INTO UserProgress (user_id, document_id, section_id)
             VALUES ('T-001', 'DOC-CLEAR-A', 8101),
                    ('T-001', 'DOC-CLEAR-B', 8102);",
        )
        .expect("Failed to seed clear-answer test data");

        let temp_dir = tempfile::tempdir().expect("Failed to create temp directory");
        let doc_a_attachments = temp_dir
            .path()
            .join("DOC-CLEAR-A")
            .join("trainee-attachments");
        let doc_b_attachments = temp_dir
            .path()
            .join("DOC-CLEAR-B")
            .join("trainee-attachments");
        fs::create_dir_all(&doc_a_attachments).expect("Failed to create Doc A attachments");
        fs::create_dir_all(&doc_b_attachments).expect("Failed to create Doc B attachments");
        fs::write(doc_a_attachments.join("a.pdf"), b"a").expect("Failed to write Doc A attachment");
        fs::write(doc_b_attachments.join("b.pdf"), b"b").expect("Failed to write Doc B attachment");

        clear_document_trainee_answers_with_conn(&mut conn, "DOC-CLEAR-A", Some(temp_dir.path()))
            .expect("Failed to clear Doc A answers");

        for table in ["UserAnswers", "UserProgress"] {
            let doc_a_count: i64 = conn
                .query_row(
                    &format!(
                        "SELECT COUNT(*) FROM {} WHERE document_id = 'DOC-CLEAR-A'",
                        table
                    ),
                    [],
                    |row| row.get(0),
                )
                .expect("Failed to count Doc A rows");
            let doc_b_count: i64 = conn
                .query_row(
                    &format!(
                        "SELECT COUNT(*) FROM {} WHERE document_id = 'DOC-CLEAR-B'",
                        table
                    ),
                    [],
                    |row| row.get(0),
                )
                .expect("Failed to count Doc B rows");
            assert_eq!(doc_a_count, 0, "{} rows for Doc A should be cleared", table);
            assert_eq!(doc_b_count, 1, "{} rows for Doc B must remain", table);
        }

        assert!(!doc_a_attachments.exists());
        assert!(doc_b_attachments.join("b.pdf").exists());
    }

    #[test]
    fn test_delete_document_preserves_global_reference_file_in_common_storage() {
        let mut conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");
        conn.execute_batch(
            "CREATE TABLE DocumentReferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                category TEXT,
                classification TEXT,
                resource_type TEXT,
                file_path TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
             );
             CREATE TABLE SectionReferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                section_id INTEGER NOT NULL,
                reference_id INTEGER NOT NULL,
                display_order INTEGER NOT NULL,
                FOREIGN KEY(section_id) REFERENCES Sections(id) ON DELETE CASCADE,
                FOREIGN KEY(reference_id) REFERENCES DocumentReferences(id) ON DELETE RESTRICT
             );
             INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level)
             VALUES ('DOC-REF-A', 'Doc A', '2272420', '22724', 'Test', '20', '1'),
                    ('DOC-REF-B', 'Doc B', '2272420', '22724', 'Test', '20', '1');
             INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label)
             VALUES (9101, 'DOC-REF-A', 100, 101, 'A', 'A'),
                    (9102, 'DOC-REF-B', 100, 101, 'B', 'B');
             INSERT INTO DocumentReferences (id, code, title, category, classification, resource_type, file_path)
             VALUES (1, 'REF-001', 'Shared reference', 'MANUAL', 'Unclassified', 'DOCUMENT',
                     'data/DOC-REF-A/references/MANUAL/REF-001_shared.pdf');
             INSERT INTO SectionReferences (section_id, reference_id, display_order)
             VALUES (9101, 1, 1), (9102, 1, 1);",
        )
        .expect("Failed to seed shared reference test data");

        let temp_dir = tempfile::tempdir().expect("Failed to create temp directory");
        let old_file = temp_dir
            .path()
            .join("DOC-REF-A")
            .join("references")
            .join("MANUAL")
            .join("REF-001_shared.pdf");
        fs::create_dir_all(old_file.parent().expect("Reference parent should exist"))
            .expect("Failed to create reference directory");
        fs::write(&old_file, b"shared-reference-content")
            .expect("Failed to write shared reference");
        fs::write(
            temp_dir.path().join("DOC-REF-A").join("obsolete.tmp"),
            b"delete-with-document",
        )
        .expect("Failed to write document-owned file");

        delete_document_with_conn_and_data_dir(&mut conn, "DOC-REF-A", temp_dir.path())
            .expect("Document deletion should preserve its global reference file");

        let document_a_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM Documents WHERE id = 'DOC-REF-A'",
                [],
                |row| row.get(0),
            )
            .expect("Failed to count deleted document");
        let document_b_link_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM SectionReferences WHERE section_id = 9102 AND reference_id = 1",
                [],
                |row| row.get(0),
            )
            .expect("Failed to count surviving reference link");
        let new_relative_path: String = conn
            .query_row(
                "SELECT file_path FROM DocumentReferences WHERE id = 1",
                [],
                |row| row.get(0),
            )
            .expect("Failed to read transferred reference path");
        let new_file = temp_dir.path().join(
            new_relative_path
                .strip_prefix("data/")
                .expect("Managed path expected"),
        );

        assert_eq!(document_a_count, 0);
        assert_eq!(document_b_link_count, 1);
        assert!(new_relative_path.starts_with("data/COMMON/references/MANUAL/"));
        assert_eq!(
            fs::read(new_file).expect("Preserved reference should remain readable"),
            b"shared-reference-content"
        );
        assert!(!temp_dir.path().join("DOC-REF-A").exists());
    }

    #[test]
    fn test_delete_document_stops_when_managed_reference_cannot_be_preserved() {
        let mut conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");
        conn.execute_batch(
            "CREATE TABLE DocumentReferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                file_path TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
             );
             INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level)
             VALUES ('DOC-MISSING', 'Doc', '2272420', '22724', 'Test', '20', '1');
             INSERT INTO DocumentReferences (code, title, file_path)
             VALUES ('REF-MISSING', 'Missing reference',
                     'data/DOC-MISSING/references/MANUAL/missing.pdf');",
        )
        .expect("Failed to seed missing reference test data");

        let temp_dir = tempfile::tempdir().expect("Failed to create temp directory");
        let result =
            delete_document_with_conn_and_data_dir(&mut conn, "DOC-MISSING", temp_dir.path());

        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("managed reference file is missing"));
        let document_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM Documents WHERE id = 'DOC-MISSING'",
                [],
                |row| row.get(0),
            )
            .expect("Failed to count protected document");
        assert_eq!(
            document_count, 1,
            "Document must remain after preservation failure"
        );
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

    #[test]
    fn creator_question_save_rolls_back_question_and_answer_key_when_reference_fails() {
        let mut conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");
        conn.execute_batch(
            "INSERT INTO Documents (id, name, status) VALUES ('DOC-CREATOR', 'Creator', 'draft');
             INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, display_order, is_system_defined)
             VALUES (9101, 'DOC-CREATOR', 100, 101, 'S101', '101', 1, 1);",
        )
        .expect("Failed to seed Creator document");

        let result = save_creator_question_with_conn(
            &mut conn,
            SaveCreatorQuestionArgs {
                is_create: true,
                id: Some("Q-CREATOR-ROLLBACK".to_string()),
                document_id: "DOC-CREATOR".to_string(),
                section_id: Some(9101),
                parent_id: None,
                content: "Question".to_string(),
                description: None,
                metadata: Some("{}".to_string()),
                references: vec![CreatorQuestionReferenceInput {
                    reference_id: 999_999,
                    location_text: Some("p.1".to_string()),
                }],
                answer_keys: vec![ReplaceAnswerKeyItem {
                    sub_code: "".to_string(),
                    text: "Answer Key".to_string(),
                    is_required: Some(true),
                }],
                confirm_mapping_change: false,
            },
        );

        assert!(result.is_err());
        let question_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM Questions WHERE id = 'Q-CREATOR-ROLLBACK'",
                [],
                |row| row.get(0),
            )
            .expect("Failed to inspect rolled back Question");
        let answer_key_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM QuestionAnswerKeys WHERE question_id = 'Q-CREATOR-ROLLBACK'",
                [],
                |row| row.get(0),
            )
            .expect("Failed to inspect rolled back Answer Key");
        assert_eq!(question_count, 0);
        assert_eq!(answer_key_count, 0);
    }

    fn seed_section_200_mapping_fixture(conn: &Connection) {
        conn.execute_batch(
            "CREATE TABLE DocumentSimulationInstances (
                 simulation_document_id TEXT PRIMARY KEY,
                 template_document_id TEXT NOT NULL,
                 trainee_id TEXT NOT NULL
             );
             CREATE TABLE UserAnswers (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 user_id TEXT NOT NULL,
                 question_id TEXT NOT NULL,
                 document_id TEXT NOT NULL,
                 sub_question_code TEXT NOT NULL DEFAULT '',
                 answer_text TEXT,
                 status TEXT DEFAULT 'pending',
                 feedback TEXT,
                 assessed_at TEXT,
                 assessed_by TEXT,
                 updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                 attachments TEXT,
                 UNIQUE(user_id, question_id, document_id, sub_question_code),
                 FOREIGN KEY(question_id, sub_question_code) REFERENCES QuestionAnswerKeys(question_id, sub_question_code) ON DELETE CASCADE
             );
             DROP TABLE UserProgress;
             CREATE TABLE UserProgress (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 user_id TEXT NOT NULL,
                 document_id TEXT NOT NULL,
                 section_id INTEGER,
                 earned_score INTEGER DEFAULT 0,
                 max_score INTEGER DEFAULT 0,
                 completion_percentage REAL DEFAULT 0,
                 is_passed INTEGER DEFAULT 0,
                 passing_score INTEGER DEFAULT 100,
                 last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
                 UNIQUE(user_id, document_id, section_id)
             );
             CREATE TABLE QuestionReferences (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 question_id TEXT NOT NULL,
                 reference_id INTEGER NOT NULL,
                 location_text TEXT,
                 display_order INTEGER NOT NULL
             );
             INSERT INTO Documents (id, name, status) VALUES ('DOC-MAP', 'Mapping', 'draft');
             INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, display_order, is_system_defined)
             VALUES (9200, 'DOC-MAP', 200, 201, 'S201', '201', 1, 0);
             INSERT OR IGNORE INTO OccupationBranches (code, name) VALUES ('M2', 'Mapping branch');
             INSERT OR IGNORE INTO OccupationSubBranches (code, branch_code, name) VALUES ('M2S', 'M2', 'Mapping subbranch');
             INSERT INTO OccupationSubQuestions (branch_code, sub_branch_code, code, text, sequence)
             VALUES ('M2', 'M2S', '20000001', 'Alpha', 1), ('M2', 'M2S', '20000002', 'Bravo', 2);
             INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, metadata)
             VALUES ('Q-MAP-PARENT', 'DOC-MAP', 9200, NULL, 1, 'Parent', 0, '{\"activeSubQuestions\":[\"20000001\",\"20000002\"]}'),
                    ('Q-MAP-CHILD', 'DOC-MAP', 9200, 'Q-MAP-PARENT', 1, 'Child', 0, '{\"selectedSubQuestions\":[\"20000001\",\"20000002\"]}');
             INSERT INTO QuestionSubQuestionLinks (question_id, sub_question_code)
             VALUES ('Q-MAP-CHILD', '20000001'), ('Q-MAP-CHILD', '20000002');
             INSERT INTO QuestionAnswerKeys (question_id, sub_question_code, answer_key_text, order_index)
             VALUES ('Q-MAP-CHILD', '20000001', 'Alpha key', 0), ('Q-MAP-CHILD', '20000002', 'Bravo key', 1);",
        )
        .expect("Failed to seed Section 200 mapping fixture");
    }

    fn mapping_save_args(confirm_mapping_change: bool) -> SaveCreatorQuestionArgs {
        SaveCreatorQuestionArgs {
            is_create: false,
            id: Some("Q-MAP-CHILD".to_string()),
            document_id: "DOC-MAP".to_string(),
            section_id: Some(9200),
            parent_id: Some("Q-MAP-PARENT".to_string()),
            content: "Child updated".to_string(),
            description: None,
            metadata: Some("{\"selectedSubQuestions\":[\"20000001\"]}".to_string()),
            references: vec![],
            answer_keys: vec![ReplaceAnswerKeyItem {
                sub_code: "20000001".to_string(),
                text: "Alpha key updated".to_string(),
                is_required: Some(true),
            }],
            confirm_mapping_change,
        }
    }

    #[test]
    fn section_200_mapping_rejects_code_outside_parent_list() {
        let mut conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");
        seed_section_200_mapping_fixture(&conn);

        let mut args = mapping_save_args(false);
        args.metadata = Some("{\"selectedSubQuestions\":[\"29999999\"]}".to_string());
        args.answer_keys[0].sub_code = "29999999".to_string();

        let error = save_creator_question_with_conn(&mut conn, args)
            .expect_err("Unknown parent code must be rejected");
        assert!(error.contains("not available in the parent Question"));
    }

    #[test]
    fn mapping_impact_reports_answer_assessment_attachment_and_progress_counts() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");
        seed_section_200_mapping_fixture(&conn);
        conn.execute(
            "INSERT INTO UserAnswers (user_id, question_id, document_id, sub_question_code, answer_text, status, feedback, assessed_at, assessed_by, attachments)
             VALUES ('T-001', 'Q-MAP-CHILD', 'DOC-MAP', '20000002', 'Answer', 'needs_improvement', 'Revise', CURRENT_TIMESTAMP, 'Q-001', '[\"one.pdf\",\"two.jpg\"]')",
            [],
        )
        .expect("Failed to seed dependent answer");
        conn.execute(
            "INSERT INTO UserProgress (user_id, document_id, section_id) VALUES ('T-001', 'DOC-MAP', 9200)",
            [],
        )
        .expect("Failed to seed progress");

        let report = analyze_creator_question_change_with_conn(
            &conn,
            &AnalyzeCreatorQuestionChangeArgs {
                question_id: "Q-MAP-CHILD".to_string(),
                document_id: "DOC-MAP".to_string(),
                proposed_sub_question_codes: vec!["20000001".to_string()],
                proposed_answer_keys: mapping_save_args(false).answer_keys,
            },
        )
        .expect("Impact analysis should succeed");

        assert_eq!(report.removed_codes, vec!["20000002"]);
        assert_eq!(report.answer_key_count, 1);
        assert_eq!(report.trainee_answer_count, 1);
        assert_eq!(report.assessed_answer_count, 1);
        assert_eq!(report.attachment_count, 2);
        assert_eq!(report.progress_record_count, 1);
        assert!(report.requires_confirmation);
        assert!(report.is_blocked);
        assert_eq!(report.items[0].label.as_deref(), Some("Bravo"));
    }

    #[test]
    fn answer_key_upsert_preserves_unchanged_code_trainee_answer() {
        let mut conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");
        seed_section_200_mapping_fixture(&conn);
        conn.execute(
            "INSERT INTO UserAnswers (user_id, question_id, document_id, sub_question_code, answer_text)
             VALUES ('T-001', 'Q-MAP-CHILD', 'DOC-MAP', '20000001', 'Persist me')",
            [],
        )
        .expect("Failed to seed dependent answer");

        replace_question_answer_keys_with_conn(
            &mut conn,
            "Q-MAP-CHILD".to_string(),
            vec![
                ReplaceAnswerKeyItem {
                    sub_code: "20000001".to_string(),
                    text: "Alpha key revised".to_string(),
                    is_required: Some(true),
                },
                ReplaceAnswerKeyItem {
                    sub_code: "20000002".to_string(),
                    text: "Bravo key".to_string(),
                    is_required: Some(true),
                },
            ],
        )
        .expect("Non-destructive Answer Key update should succeed");

        let answer_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM UserAnswers WHERE question_id = 'Q-MAP-CHILD' AND sub_question_code = '20000001'",
                [],
                |row| row.get(0),
            )
            .expect("Failed to inspect preserved answer");
        assert_eq!(answer_count, 1);
    }

    #[test]
    fn mapping_save_requires_confirmation_for_answer_key_only_removal() {
        let mut conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");
        seed_section_200_mapping_fixture(&conn);

        let error = save_creator_question_with_conn(&mut conn, mapping_save_args(false))
            .expect_err("Answer Key removal must require confirmation");
        assert!(error.starts_with("MAPPING_CHANGE_CONFIRMATION_REQUIRED"));

        save_creator_question_with_conn(&mut conn, mapping_save_args(true))
            .expect("Confirmed Answer Key-only mapping removal should succeed");
        let removed_key_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM QuestionAnswerKeys WHERE question_id = 'Q-MAP-CHILD' AND sub_question_code = '20000002'",
                [],
                |row| row.get(0),
            )
            .expect("Failed to inspect removed Answer Key");
        assert_eq!(removed_key_count, 0);
    }

    #[test]
    fn mapping_save_blocks_removal_when_trainee_work_exists() {
        let mut conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");
        seed_section_200_mapping_fixture(&conn);
        conn.execute(
            "INSERT INTO UserAnswers (user_id, question_id, document_id, sub_question_code, answer_text)
             VALUES ('T-001', 'Q-MAP-CHILD', 'DOC-MAP', '20000002', 'Do not delete')",
            [],
        )
        .expect("Failed to seed dependent answer");

        let error = save_creator_question_with_conn(&mut conn, mapping_save_args(true))
            .expect_err("Trainee work must block mapping removal");
        assert!(error.starts_with("MAPPING_CHANGE_BLOCKED"));
        let answer_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM UserAnswers WHERE question_id = 'Q-MAP-CHILD' AND sub_question_code = '20000002'",
                [],
                |row| row.get(0),
            )
            .expect("Failed to inspect protected Trainee Answer");
        assert_eq!(answer_count, 1);
    }
}
