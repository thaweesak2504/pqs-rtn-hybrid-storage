use super::*;

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

