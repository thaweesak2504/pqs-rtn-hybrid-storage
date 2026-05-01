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
}
